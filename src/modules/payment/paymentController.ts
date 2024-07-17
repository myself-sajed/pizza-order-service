import { Request, Response } from "express";
import { PaymentGW } from "./paymentTypes";
import orderModel from "../orders/orderModel";
import { KafkaOrderEventTypes, PaymentStatus } from "../orders/orderTypes";
import { MessageBroker } from "../../types/broker";

export class PaymentController {
  constructor(
    private paymentGW: PaymentGW,
    private broker: MessageBroker,
  ) {}

  handleWebhook = async (req: Request, res: Response) => {
    const webhookBody = req.body;

    if (webhookBody.type === "checkout.session.completed") {
      const paymentId = webhookBody.data.object.id;
      const verifiedSession = await this.paymentGW.getSession(paymentId);

      const isPaymentSuccess = verifiedSession.paymentStatus === "paid";

      const updatedOrder = await orderModel
        .findOneAndUpdate(
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
        )
        .populate("customerId")
        .exec();

      // send message to kafka broker
      const brokerMessage = {
        event_type: isPaymentSuccess
          ? KafkaOrderEventTypes.ORDER_CREATED
          : KafkaOrderEventTypes.ORDER_PAYMENT_FAILED,
        data: updatedOrder,
      };

      this.broker.sendMessage("order", JSON.stringify(brokerMessage));
    }

    res.send({ status: "OK" });
  };
}
