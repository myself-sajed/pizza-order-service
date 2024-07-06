import Stripe from "stripe";
import {
  CustomMetadata,
  PaymentGW,
  PaymentOptions,
  VerifiedSession,
} from "./paymentTypes";
import config from "config";

export class StripGW implements PaymentGW {
  private stripe: Stripe;

  constructor() {
    const secretKey = config.get("payment.secretKey") as string;
    this.stripe = new Stripe(secretKey);
  }

  async createSession(options: PaymentOptions) {
    const successURL = `${config.get("server.originURIClient")}/payment?success=true&orderId=${options.orderId}&restaurant=${options.tenantId}`;
    const cancelURL = `${config.get("server.originURIClient")}/payment?success=false&orderId=${options.orderId}&restaurant=${options.tenantId}`;
    const logoURL = `${config.get("server.backendURI")}/order/logo`;

    console.log("options :", options);

    try {
      const session = await this.stripe.checkout.sessions.create(
        {
          customer_email: options.customerEmail,
          metadata: {
            orderId: options.orderId,
            restaurantId: options.tenantId,
          },
          payment_intent_data: {
            shipping: {
              name: options.customerName,
              address: {
                line1: options.address.addressLine,
                city: options.address.city,
                postal_code: options.address.pincode,
                state: options.address.state,
              },
            },
          },
          line_items: [
            {
              price_data: {
                unit_amount: options.amount * 100,
                product_data: {
                  name: "Round Pizza- Your Order Bill",
                  description: "Total amount to be paid",
                  images: [logoURL],
                },
                currency: options.currency || "inr",
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: successURL,
          cancel_url: cancelURL,
        },
        { idempotencyKey: options.idemKey },
      );
      return {
        id: session.id,
        paymentUrl: session.url,
        paymentStatus: session.payment_status,
      };
    } catch (error) {
      console.log(error);
      throw new Error("Payment failed");
    }
  }

  async getSession(id: string) {
    const session = await this.stripe.checkout.sessions.retrieve(id);

    const verifiedSession: VerifiedSession = {
      id: session.id,
      paymentStatus: session.payment_status,
      metadata: session.metadata as unknown as CustomMetadata,
    };

    return verifiedSession;
  }
}
