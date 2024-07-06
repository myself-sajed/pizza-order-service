import express from "express";
import { asyncWrapper } from "../../utils";
import createPaymentGW from "../../factories/paymentGateway";
import { PaymentController } from "./paymentController";
import { createMessageBroker } from "../../factories/messageBroker";

const router = express.Router();

const paymentGW = createPaymentGW();
const broker = createMessageBroker();
const paymentController = new PaymentController(paymentGW, broker);
router.post("/webhook", asyncWrapper(paymentController.handleWebhook));

export default router;
