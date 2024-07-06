import { Request, Response } from "express";
import { PaymentGW } from "./paymentTypes";
import orderModel from "../orders/orderModel";
import { PaymentStatus } from "../orders/orderTypes";

export class PaymentController {
  constructor(private paymentGW: PaymentGW) {}

  handleWebhook = async (req: Request, res: Response) => {
    const webhookBody = req.body;

    if (webhookBody.type === "checkout.session.completed") {
      const paymentId = webhookBody.data.object.id;
      const verifiedSession = await this.paymentGW.getSession(paymentId);

      const isPaymentSuccess = verifiedSession.paymentStatus === "paid";

      console.log(verifiedSession);

      const updatedOrder = await orderModel.updateOne(
        { _id: verifiedSession.metadata.orderId },
        {
          paymentStatus: isPaymentSuccess
            ? PaymentStatus.PAID
            : PaymentStatus.FAILED,
          paymentId: verifiedSession.id,
        },
        {
          new: true,
        },
      );

      // send message to kafka broker
    }

    res.send({ status: "OK" });
  };
}
