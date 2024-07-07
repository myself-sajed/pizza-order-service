import { Response } from "express";
import { Request } from "express-jwt";
import { validationResult } from "express-validator";
import {
  CartItem,
  DELIVERY_CHARGE,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
  TAXES,
  Topping,
} from "./orderTypes";
import productCacheModel, {
  PriceConfiguration,
  ProductCache,
} from "../../cache/product-cache-model";
import toppingCacheModel, {
  ToppingCache,
} from "../../cache/topping-cache-model";
import couponModel from "../coupon/couponModel";
import Order from "./orderModel";
import Idempotency from "../idempotency/idemModel";
import mongoose from "mongoose";
import { PaymentGW } from "../payment/paymentTypes";
import customerModel from "../customer/customerModel";
import { MessageBroker } from "../../types/broker";
import orderModel from "./orderModel";

export class OrderController {
  constructor(
    private paymentGW: PaymentGW,
    private broker: MessageBroker,
  ) {}

  getOrder = async (req: Request, res: Response) => {
    const order = await orderModel.findOne({
      _id: req.params.orderId,
      tenantId: req.params.tenantId,
    });
    res.send(order);
  };

  deleteOrder = async (req: Request, res: Response) => {
    const order = await orderModel.findOneAndDelete({
      _id: req.params.orderId,
      tenantId: req.params.tenantId,
    });
    res.send(order);
  };

  createOrder = async (req: Request, res: Response) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({ errors: result.array() });
    }

    const {
      cartItems,
      customerId,
      address,
      paymentMode,
      coupon,
      comment,
      tenantId,
    } = req.body;

    const idemKey = req.headers["idem-key"];
    const idemDoc = await Idempotency.findOne({ idemKey });

    const customer = await customerModel.findOne({ _id: customerId });

    if (!customer) {
      return res.send({ status: "error", message: "Customer not found" });
    }

    let order = idemDoc ? [idemDoc?.response] : [];
    const subTotal = await this.calculateTotal(cartItems);
    const amountOfDiscount = (subTotal * coupon.discount) / 100;
    const amountOfTax = Math.round((subTotal * TAXES) / 100);
    const grandTotal = Math.round(
      subTotal + amountOfTax + DELIVERY_CHARGE - amountOfDiscount,
    );

    if (!idemDoc) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        order = await Order.create(
          [
            {
              cart: cartItems,
              address,
              discount: coupon.discount,
              couponCode: coupon.title || null,
              comment,
              customerId,
              deliveryCharge: DELIVERY_CHARGE,
              orderStatus: OrderStatus.RECEIVED,
              paymentStatus:
                paymentMode === PaymentMode.CARD
                  ? PaymentStatus.FAILED
                  : PaymentStatus.PENDING,
              paymentMode,
              tax: TAXES,
              tenantId,
              total: grandTotal,
            },
          ],
          { session },
        );

        await Idempotency.create(
          [
            {
              idemKey,
              response: order[0],
            },
          ],
          { session },
        );
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        throw new Error("Error creating order");
      } finally {
        session.endSession();
      }
    }

    if (paymentMode === PaymentMode.CARD) {
      // handle payment
      const session = await this.paymentGW.createSession({
        amount: grandTotal,
        orderId: order[0]._id.toString(),
        tenantId,
        idemKey: idemKey as string,
        currency: "inr",
        customerEmail: customer.email,
        customerName: customer.name,
        address,
      });

      // send message to kafka
      this.broker.sendMessage("order", JSON.stringify(order[0]));

      res.send({
        status: "success",
        paymentURL: session.paymentUrl,
        paymentMode,
      });
    } else {
      // send message to kafka
      this.broker.sendMessage("order", JSON.stringify(order[0]));

      res.send({
        status: "success",
        paymentURL: null,
        paymentMode,
        orderId: order[0]._id,
        tenantId,
      });
    }
  };

  private calculateTotal = async (cart: CartItem[]) => {
    const productIds = cart.map((item) => item._id);

    const productPricings: ProductCache[] = await productCacheModel.find({
      productId: {
        $in: productIds,
      },
    });

    const cartToppingIds = cart.reduce((acc, item) => {
      return [...acc, ...item.toppings.map((topping: Topping) => topping._id)];
    }, []);

    const toppingPricings: ToppingCache[] = await toppingCacheModel.find({
      toppingId: {
        $in: cartToppingIds,
      },
    });

    const totalPrice = cart.reduce((acc, curr) => {
      const cachedProductPrice = productPricings.find(
        (product) => product.productId === curr._id,
      );

      if (!cachedProductPrice) {
        throw new Error(`Product with id ${curr._id} not found in cache.`);
      }

      return (
        acc +
        curr.qty * this.getItemTotal(curr, cachedProductPrice, toppingPricings)
      );
    }, 0);

    return totalPrice;
  };

  private getItemTotal = (
    item: CartItem,
    cachedProductPrice: ProductCache,
    toppingsPricings: ToppingCache[],
  ): number => {
    const toppingsTotal: number = (item.toppings as Topping[]).reduce(
      (acc: number, curr: Topping) => {
        return acc + this.getCurrentToppingPrice(curr, toppingsPricings);
      },
      0,
    );

    const productTotal: number = Object.entries(
      item?.productConfiguration || {},
    ).reduce((acc, [key, value]) => {
      const priceConfiguration = (
        cachedProductPrice.priceConfiguration as unknown as Map<
          string,
          PriceConfiguration
        >
      ).get(key).availableOptions;

      const price = (priceConfiguration as unknown as Map<string, number>).get(
        value,
      );

      return acc + (price || 0);
    }, 0);

    return productTotal + toppingsTotal;
  };

  private getCurrentToppingPrice = (
    topping: Topping,
    toppingPricings: ToppingCache[],
  ): number => {
    const currentTopping = toppingPricings.find(
      (current) => topping._id === current.toppingId,
    );

    if (!currentTopping) {
      // Make sure the item is in the cache, else maybe call catalog service.
      return topping.price;
    }

    return currentTopping.price;
  };

  private getDiscountPercentage = async (
    couponCode: string,
    tenantId: string,
  ): Promise<number> => {
    const code = await couponModel.findOne({ code: couponCode, tenantId });

    if (!code) {
      return 0;
    }

    const currentDate = new Date();
    const couponDate = new Date(code.validUpto);

    if (currentDate <= couponDate) {
      return code.discount;
    }

    return 0;
  };
}
