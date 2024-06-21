import express from "express";
import { asyncWrapper } from "../../utils";
import CouponController from "./couponController";
import authenticate from "../../common/middleware/authenticate";
const router = express.Router();

const couponController = new CouponController();
router.post("/create", authenticate, asyncWrapper(couponController.create));
router.get("/:code", authenticate, asyncWrapper(couponController.getCoupon));
router.patch("/update", authenticate, asyncWrapper(couponController.update));
router.post(
  "/delete/:code",
  authenticate,
  asyncWrapper(couponController.delete),
);

export default router;
