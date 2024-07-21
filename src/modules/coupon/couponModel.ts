import mongoose from "mongoose";
import { ICoupon } from "./couponTypes";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const schema = new mongoose.Schema<ICoupon>(
  {
    title: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    validUpto: {
      type: Date,
      required: true,
    },
    tenantId: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

schema.index({ code: 1, tenantId: 1 }, { unique: true });
schema.plugin(mongooseAggregatePaginate);

export default mongoose.model("coupon", schema);
