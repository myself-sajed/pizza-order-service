import { ProductCache } from "./product-cache-model";
import ProductCacheModel from "./product-cache-model";

export const upsertProduct = async (productToAdd: string) => {
  try {
    const product: ProductCache = JSON.parse(productToAdd);
    await ProductCacheModel.findOneAndUpdate(
      { productId: product._id },
      {
        $set: {
          productId: product._id,
          priceConfiguration: product.priceConfiguration,
        },
      },
      {
        upsert: true,
      },
    );
  } catch (error) {
    console.log("Invalid product in kafka", error);
  }
};
