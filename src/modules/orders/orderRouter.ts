import express, { Request, Response } from "express";
import { OrderController } from "./orderController";
import { asyncWrapper } from "../../utils";
import authenticate from "../../common/middleware/authenticate";
import createOrderValidator from "./createOrderValidator";
import path from "path";
import createPaymentGW from "../../factories/paymentGateway";
import { createMessageBroker } from "../../factories/messageBroker";

const router = express.Router();

const paymentGW = createPaymentGW();
const broker = createMessageBroker();
const orderController = new OrderController(paymentGW, broker);
router.post(
  "/createOrder",
  authenticate,
  createOrderValidator,
  asyncWrapper(orderController.createOrder),
);

router.get(
  "/:orderId/:tenantId",
  authenticate,
  asyncWrapper(orderController.getOrder),
);

router.get(
  "/getMyOrders",
  authenticate,
  asyncWrapper(orderController.getMyOrders),
);

router.delete(
  "/:orderId/:tenantId",
  authenticate,
  asyncWrapper(orderController.deleteOrder),
);

router.get("/logo", (_: Request, res: Response) => {
  const logoPath = path.join(__dirname, `logo.svg`);
  res.sendFile(logoPath);
});

export default router;
