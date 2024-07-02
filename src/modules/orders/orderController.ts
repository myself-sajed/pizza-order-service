import { Response } from "express";
import { Request } from "express-jwt";
import { validationResult } from "express-validator";
import { CartItem, DELIVERY_CHARGE, TAXES, Topping } from "./orderTypes";
import productCacheModel, {
  PriceConfiguration,
  ProductCache,
} from "../../cache/product-cache-model";
import toppingCacheModel, {
  ToppingCache,
} from "../../cache/topping-cache-model";
import couponModel from "../coupon/couponModel";

export class OrderController {
  createOrder = async (req: Request, res: Response) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({ errors: result.array() });
    }

    const subTotal = await this.calculateTotal(req.body.cartItems);

    const amountOfDiscount = (subTotal * req.body.coupon.discount) / 100;

    const amountOfTax = Math.round((subTotal * TAXES) / 100);

    const grandTotal = Math.round(
      subTotal + amountOfTax + DELIVERY_CHARGE - amountOfDiscount,
    );

    res.send({ status: "ok", subTotal: grandTotal });
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
