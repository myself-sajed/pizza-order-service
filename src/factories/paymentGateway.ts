import { PaymentGW } from "../modules/payment/paymentTypes";
import { StripeGW } from "../modules/payment/stripe";

let paymentGW: PaymentGW | null = null;

const createPaymentGW = () => {
  if (!paymentGW) {
    paymentGW = new StripeGW();
  }
  return paymentGW;
};

export default createPaymentGW;
