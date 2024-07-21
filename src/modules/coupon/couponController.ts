import { Response } from "express";
import { Request } from "express-jwt";
import CouponModel from "./couponModel";
import { isExpired } from "./couponFunctions";
import { GetCouponFilter } from "./couponTypes";
import { paginationLabels } from "../orders/orderTypes";

class CouponController {
  async getAllCoupons(req: Request, res: Response) {
    const { q, tenantId, discount } = req.query;

    const paginateFilters = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };

    const filter: GetCouponFilter = {};

    if (tenantId && tenantId !== "null" && tenantId !== "undefined") {
      filter.tenantId = tenantId as string;
    }

    if (discount && discount !== "null" && discount !== "undefined") {
      filter.discount = parseInt(discount as string);
    }

    // Only add the name query if 'q' is provided and is not an empty string
    const matchQuery = {
      ...filter,
      ...(q ? { code: new RegExp(q as string, "i") } : {}),
    };

    const aggregate = CouponModel.aggregate([
      {
        $match: matchQuery,
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    const coupons = await CouponModel.aggregatePaginate(aggregate, {
      ...paginateFilters,
      customLabels: paginationLabels,
    });

    res.send(coupons);
  }

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

    console.log(title, code, tenantId);

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
    const { title, code, validUpto, discount, tenantId, _id } = req.body;

    const updatedCoupon = await CouponModel.findOneAndUpdate(
      { _id },
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
