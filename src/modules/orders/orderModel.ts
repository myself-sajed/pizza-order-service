import mongoose, { Schema } from "mongoose";
import {
  CartItem,
  Order,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
} from "./orderTypes";

const toppingSchema = new mongoose.Schema({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});

const cartSchema = new mongoose.Schema<CartItem>({
  name: String,
  image: String,
  qty: Number,
  productConfiguration: {
    type: Map,
    of: String,
    required: true,
  },
  toppings: {
    type: [toppingSchema],
    required: false,
  },
});

const orderSchema = new mongoose.Schema<Order>(
  {
    cart: {
      type: [cartSchema],
      required: true,
    },
    address: {
      type: Object,
      required: true,
    },
    comment: {
      type: String,
      required: false,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    deliveryCharge: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: OrderStatus,
    },
    paymentMode: {
      type: String,
      enum: PaymentMode,
    },
    paymentStatus: {
      type: String,
      enum: PaymentStatus,
    },
    paymentId: {
      type: String,
      required: false,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Order", orderSchema);
