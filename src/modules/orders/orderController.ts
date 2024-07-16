import { Response } from "express";
import { Request } from "express-jwt";
import { validationResult } from "express-validator";
import {
  CartItem,
  DELIVERY_CHARGE,
  GetOrderFilter,
  KafkaOrderEventTypes,
  OrderStatus,
  paginationLabels,
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
    const select = req.query.select
      ? req.query.select.toString().trim().split(",")
      : [];

    const projection = select.reduce((acc, item) => {
      acc[item] = 1;
      return acc;
    }, {});

    const order = await orderModel.findOne(
      {
        _id: req.params.orderId,
        tenantId: req.params.tenantId,
      },
      projection,
    );
    res.send(order);
  };

  getSingleAdminOrder = async (req: Request, res: Response) => {
    const orderId = req.body.orderId;
    const role = req.auth.role;
    const tenant = req.auth.tenant;

    if (role === "Admin" || role === "Manager") {
      const order = await orderModel
        .findOne({
          _id: orderId,
        })
        .populate("customerId")
        .exec();

      const isCorrectManager = tenant === order.tenantId;
      if (role === "Manager" && isCorrectManager) {
        res.send({
          status: "success",
          order,
        });
      } else if (role === "Admin") {
        res.send({
          status: "success",
          order,
        });
      } else {
        res.send({
          status: "error",
          message: "You're not allowed to fetch the order",
        });
      }
    } else {
      res.send({
        status: "error",
        message: "You're not allowed to fetch the order",
      });
    }
  };

  changeOrderStatus = async (req: Request, res: Response) => {
    const orderId = req.body.orderId;
    const orderStatus = req.body.orderStatus;
    const role = req.auth.role;
    const tenant = req.auth.tenant;

    if (role === "Admin" || role === "Manager") {
      const order = await orderModel
        .findOneAndUpdate(
          {
            _id: orderId,
          },
          { $set: { orderStatus } },
          { new: true },
        )
        .populate("customerId")
        .exec();

      const brokerMessage = {
        event_type: KafkaOrderEventTypes.ORDER_STATUS_UPDATED,
        data: order,
      };

      this.broker.sendMessage("order", JSON.stringify(brokerMessage));

      const isCorrectManager = tenant === order.tenantId;
      if (role === "Manager" && isCorrectManager) {
        res.send({
          status: "success",
          order,
        });
      } else if (role === "Admin") {
        res.send({
          status: "success",
          order,
        });
      } else {
        res.send({
          status: "error",
          message: "You're not allowed to change the status of the order",
        });
      }
    } else {
      res.send({
        status: "error",
        message: "You're not allowed to change the status of the order",
      });
    }
  };

  getAllOrders = async (req: Request, res: Response) => {
    const { q, tenantId, orderStatus, paymentMode } = req.query;

    const paginateFilters = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };

    const filter: GetOrderFilter = {};

    if (tenantId && tenantId !== "null" && tenantId !== "undefined") {
      filter.tenantId = tenantId as string;
    }

    if (orderStatus && orderStatus !== "null" && orderStatus !== "undefined") {
      filter.orderStatus = orderStatus as string;
    }

    if (paymentMode && paymentMode !== "null" && paymentMode !== "undefined") {
      filter.paymentMode = paymentMode as string;
    }

    filter.paymentStatus = PaymentStatus.PAID;

    // Only add the name query if 'q' is provided and is not an empty string
    const matchQuery = {
      ...filter,
      ...(q ? { _id: new RegExp(q as string, "i") } : {}),
    };

    const aggregate = orderModel.aggregate([
      {
        $match: matchQuery,
      },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          as: "customer",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    const orders = await orderModel.aggregatePaginate(aggregate, {
      ...paginateFilters,
      customLabels: paginationLabels,
    });

    res.send({
      data: orders,
      total: orders.total,
      pageSize: orders.pageSize,
      currentPage: orders.currentPage,
    });
  };

  getMyOrders = async (req: Request, res: Response) => {
    const customer = await customerModel.findOne({ userId: req.auth.sub });

    if (!customer) {
      return res.send([]);
    }

    const orders = await orderModel.find({
      customerId: customer._id,
      paymentStatus: PaymentStatus.PAID,
    });

    res.send(orders || []);
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
      const brokerMessage = {
        event_type: KafkaOrderEventTypes.ORDER_CREATED,
        data: order[0],
      };
      this.broker.sendMessage("order", JSON.stringify(brokerMessage));

      res.send({
        status: "success",
        paymentURL: session.paymentUrl,
        paymentMode,
      });
    } else {
      // send message to kafka
      const brokerMessage = {
        event_type: KafkaOrderEventTypes.ORDER_CREATED,
        data: order[0],
      };
      this.broker.sendMessage("order", JSON.stringify(brokerMessage));

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
