import express from "express";
import { asyncWrapper } from "../../utils";
import CouponController from "./couponController";
import authenticate from "../../common/middleware/authenticate";
const router = express.Router();

const couponController = new CouponController();

router.get(
  "/getAllCoupons",
  authenticate,
  asyncWrapper(couponController.getAllCoupons),
);
router.post("/create", authenticate, asyncWrapper(couponController.create));
router.post(
  "/verify",
  authenticate,
  asyncWrapper(couponController.verifyCoupon),
);
router.patch("/update", authenticate, asyncWrapper(couponController.update));
router.delete("/delete", authenticate, asyncWrapper(couponController.delete));

export default router;
