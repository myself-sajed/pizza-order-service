import { Response } from "express";
import { Request } from "express-jwt";
import CouponModel from "./couponModel";
import { isExpired } from "./couponFunctions";

class CouponController {
  async verifyCoupon(req: Request, res: Response) {
    const { code, tenantId } = req.body;

    const coupon = await CouponModel.findOne({ code, tenantId });

    if (coupon) {
      if (!isExpired(coupon.validUpto)) {
        res.send({ status: "success", coupon });
      } else {
        res.send({ status: "error", message: "Coupon Expired" });
      }
    } else {
      res.send({ status: "error", message: "Coupon Not Found" });
    }
  }

  async delete(req: Request, res: Response) {
    const { code, tenantId } = req.body;

    const isDeleted = await CouponModel.findOneAndDelete({ code, tenantId });

    if (isDeleted) {
      res.send({ status: "success", message: "Coupon has been deleted" });
    } else {
      res.send({ status: "error", message: "Coupon does not exists" });
    }
  }

  async create(req: Request, res: Response) {
    const { title, code, validUpto, discount, tenantId } = req.body;

    const exists = await CouponModel.findOne({ code, tenantId });

    if (!exists) {
      const coupon = await CouponModel.create({
        title,
        code,
        validUpto,
        discount,
        tenantId,
      });

      return res.send({
        status: "success",
        coupon,
        message: "Coupon created successfully",
      });
    }

    return res.send({
      status: "error",
      coupon: exists,
      message: "Coupon already exists",
    });
  }

  async update(req: Request, res: Response) {
    const { title, code, validUpto, discount, tenantId } = req.body;

    const updatedCoupon = await CouponModel.findOneAndUpdate(
      { code, tenantId },
      { title, code, validUpto, discount, tenantId },
      { new: true },
    );

    if (!updatedCoupon) {
      return res.send({
        status: "error",
        message: "Coupon does not exists in the database",
      });
    }

    return res.send({
      status: "success",
      coupon: updatedCoupon,
      message: "Coupon Updated Successfully",
    });
  }
}

export default CouponController;
