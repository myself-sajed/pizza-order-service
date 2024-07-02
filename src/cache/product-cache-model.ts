import mongoose from "mongoose";

export interface AvailableOptions {
  [key: string]: number;
}

export interface PriceConfiguration {
  priceType: "base" | "additional";
  availableOptions: AvailableOptions;
}

export interface ProductCache {
  _id?: string;
  productId?: string;
  priceConfiguration: PriceConfiguration;
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
