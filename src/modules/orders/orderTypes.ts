import mongoose from "mongoose";
import { Address } from "../customer/customerTypes";

export interface Tenant {
  id: string;
  name: string;
  address: Address;
}

export type priceType = "base" | "additional";
export type widgetType = "switch" | "radio";

export interface Attributes {
  name: string;
  widgetType: widgetType;
  defaultValue: string;
  availableOptions: string[];
}

export interface AvailableOptions {
  [key: string]: number;
}

export interface PriceConfiguration {
  [key: string]: {
    priceType: priceType;
    availableOptions: AvailableOptions;
  };
}

export interface Category {
  _id: string;
  name: string;
  price: PriceConfiguration;
  attributes: Attributes[];
  hasToppings: boolean;
}

export interface Product {
  _id: string;
  key: string;
  name: string;
  isPublish: number;
  createdAt: string;
  description: string;
  image: string;
  tenantId: string;
  categoryId: string;
  category: Category;
  priceConfiguration: PriceConfiguration;
  attributes: Attributes[];
}

export interface Topping {
  _id: string;
  name: string;
  price: number;
  image: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  tenant: Tenant | null;
}
export interface Customer {
  _id: string;
  name: string;
  email: string;
  role: string;
  address: Address[];
}

export interface ProductConfiguration {
  [key: string]: string;
}
export interface CartItem
  extends Pick<Product, "_id" | "name" | "image" | "tenantId"> {
  _id: string;
  name: string;
  image: string;
  tenantId: string;
  productConfiguration: ProductConfiguration | null;
  toppings: Topping[] | [];
  qty: number;
  totalPrice: number;
}

export const TAXES = 12;
export const DELIVERY_CHARGE = 50;

export enum PaymentMode {
  CARD = "Card",
  CASH = "Cash",
}

export enum PaymentStatus {
  PENDING = "Pending",
  PAID = "Paid",
  FAILED = "Failed",
}

export enum OrderStatus {
  RECEIVED = "Received",
  CONFIRMED = "Confirmed",
  PREPARING = "Preparing",
  OUT_FOR_DELIVERY = "Out for delivery",
  DELIVERED = "Delivered",
  FAILED = "Failed",
}

export interface Order {
  cart: CartItem[];
  customerId: mongoose.Types.ObjectId;
  tenantId: string;
  discount: number;
  tax: number;
  deliveryCharge: number;
  total: number;
  address: Address;
  couponCode?: string;
  comment?: string;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentId?: string;
}
