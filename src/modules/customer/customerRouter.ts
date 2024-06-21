import express from "express";
import CustomerController from "./customerController";
import authenticate from "../../common/middleware/authenticate";
import { asyncWrapper } from "../../utils";
const router = express.Router();

const customerController = new CustomerController();

router.get("/", authenticate, asyncWrapper(customerController.getCustomer));
router.patch(
  "/address/:customerId",
  authenticate,
  asyncWrapper(customerController.addAddress),
);

export default router;
