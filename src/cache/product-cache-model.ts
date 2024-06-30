import mongoose from "mongoose";

export interface ProductCache {
  _id?: string;
  productId?: string;
  priceConfiguration: {
    priceType: "base" | "additional";
    availableOptions: {
      [key: string]: string;
    };
  };
}

const priceConfigurationSchema = new mongoose.Schema({
  priceType: {
    type: String,
    enum: ["base", "additional"],
  },
  availableOptions: {
    type: Map,
    of: Number,
  },
});

const productSchema = new mongoose.Schema<ProductCache>(
  {
    productId: {
      type: String,
      required: true,
    },
    priceConfiguration: {
      type: Map,
      of: priceConfigurationSchema,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ProductCache", productSchema);
