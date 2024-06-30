import ToppingCacheModel, { ToppingCache } from "./topping-cache-model";

export const upsertTopping = async (toppingToAdd: string) => {
  try {
    const topping: ToppingCache = JSON.parse(toppingToAdd);
    await ToppingCacheModel.findOneAndUpdate(
      { toppingId: topping._id },
      {
        $set: { toppingId: topping._id, price: topping.price },
      },
      {
        upsert: true,
      },
    );
  } catch (error) {
    console.log("Invalid topping in kafka", error);
  }
};
