import express, { Request, Response } from "express";
import { OrderController } from "./orderController";
import { asyncWrapper } from "../../utils";
import authenticate from "../../common/middleware/authenticate";
import createOrderValidator from "./createOrderValidator";
import { StripGW } from "../../payment/stripe";
import path from "path";

const router = express.Router();

const paymentGW = new StripGW();
const orderController = new OrderController(paymentGW);
router.post(
  "/createOrder",
  authenticate,
  createOrderValidator,
  asyncWrapper(orderController.createOrder),
);

router.get("/logo", (_: Request, res: Response) => {
  const logoPath = path.join(__dirname, `logo.svg`);
  res.sendFile(logoPath);
});

export default router;
