import mongoose from "mongoose";
import { Address, Customer } from "./customerTypes";

const addressSchema = new mongoose.Schema<Address>(
  {
    address: {
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
