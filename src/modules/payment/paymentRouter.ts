import express from "express";
import { asyncWrapper } from "../../utils";
import createPaymentGW from "../../factories/paymentGateway";
import { PaymentController } from "./paymentController";

const router = express.Router();

const paymentGW = createPaymentGW();
const paymentController = new PaymentController(paymentGW);
router.post("/webhook", asyncWrapper(paymentController.handleWebhook));

export default router;
