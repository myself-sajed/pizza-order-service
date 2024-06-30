import mongoose from "mongoose";

export interface ToppingCache {
  _id?: string;
  toppingId?: string;
  price: number;
}

const schema = new mongoose.Schema<ToppingCache>({
  toppingId: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});

export default mongoose.model("ToppingCache", schema);
