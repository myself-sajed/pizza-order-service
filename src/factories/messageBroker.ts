import { KafkaMessageBroker } from "../config/kafka";
import { MessageBroker } from "../types/broker";
import config from "config";

let messageBroker: MessageBroker | null = null;

export const createMessageBroker = () => {
  const broker = config.get("kafka.broker");

  if (!messageBroker) {
    messageBroker = new KafkaMessageBroker("order-service", [broker as string]);
  }

  return messageBroker;
};
