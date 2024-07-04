import mongoose from "mongoose";

const idemSchema = new mongoose.Schema(
  {
    idemKey: {
      type: String,
      required: true,
    },
    response: {
      type: Object,
      required: true,
    },
  },
  { timestamps: true },
);

idemSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 48 });
idemSchema.index({ idemKey: 1 }, { unique: true });

export default mongoose.model("Idempotency", idemSchema);
