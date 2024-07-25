import {
  Consumer,
  EachMessagePayload,
  Kafka,
  KafkaConfig,
  Producer,
} from "kafkajs";
import { MessageBroker } from "../types/broker";
import { upsertProduct } from "../cache/product-cache-handler";
import { upsertTopping } from "../cache/topping-cache-handler";
import config from "config";

export class KafkaMessageBroker implements MessageBroker {
  private consumer: Consumer;
  private producer: Producer;

  constructor(clientId: string, brokers: string[]) {
    let kafkaConfig: KafkaConfig = { clientId, brokers };

    if (process.env.NODE_ENV === "production") {
      kafkaConfig = {
        ...kafkaConfig,
        ssl: true,
        connectionTimeout: 45000,
        sasl: {
          username: config.get("kafka.sasl.username"),
          password: config.get("kafka.sasl.password"),
          mechanism: "plain",
        },
      };
    }

    const kafka = new Kafka(kafkaConfig);
    this.consumer = kafka.consumer({ groupId: clientId });
    this.producer = kafka.producer();
  }

  // 1. CONSUMERS

  async connectConsumer() {
    await this.consumer.connect();
    console.log("Kafka Consumer connected...");
  }

  async disconnectConsumer() {
    if (this.consumer) {
      await this.consumer.disconnect();
    }
  }

  async consumeMessage(topics: string[], fromBeginning: boolean = false) {
    await this.consumer.subscribe({ topics, fromBeginning });

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        switch (topic) {
          case "product":
            await upsertProduct(message.value.toString());
            return;

          case "topping":
            await upsertTopping(message.value.toString());
            return;

          default:
            console.log("Topic not matched", topic, message.value.toString());
        }
      },
    });
  }

  // 2. PRODUCERS
  async connectProducer() {
    await this.producer.connect();
  }

  async disconnectProducer() {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  async sendMessage(topic: string, message: string, key: string) {
    const brokerMessage: { value: string; key?: string } = {
      value: message,
    };

    if (key) {
      brokerMessage.key = key;
    }

    await this.producer.send({ topic, messages: [brokerMessage] });
  }
}
