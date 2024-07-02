import express from "express";
import { OrderController } from "./orderController";
import { asyncWrapper } from "../../utils";
import authenticate from "../../common/middleware/authenticate";
import createOrderValidator from "./createOrderValidator";

const router = express.Router();

const orderController = new OrderController();
router.post(
  "/createOrder",
  authenticate,
  createOrderValidator,
  asyncWrapper(orderController.createOrder),
);

export default router;
