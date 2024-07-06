import mongoose from "mongoose";
import { Address, Customer } from "./customerTypes";

const addressSchema = new mongoose.Schema<Address>(
  {
    addressLine: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    pincode: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    isDefault: {
      type: Boolean,
      required: false,
    },
  },
  { _id: false },
);

const customerSchema = new mongoose.Schema<Customer>({
  userId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  address: [addressSchema],
});

export default mongoose.model("customer", customerSchema);
