import { body } from "express-validator";

export default [
  body("cartItems").exists().withMessage("Cart is empty."),
  body("customerId").exists().withMessage("Customer is not present."),
  body("address").exists().withMessage("Address was not specified."),
  body("paymentMode").exists().withMessage("Payment mode was not specified"),
  body("coupon").exists().withMessage("Coupon details were not specified"),
];
