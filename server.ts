import app from "./src/app";
import config from "config";
import logger from "./src/config/logger";
import connectDB from "./src/config/db";
import { MessageBroker } from "./src/types/broker";
import { createMessageBroker } from "./src/factories/messageBroker";

const startServer = async () => {
  const PORT = config.get("server.port") || 5503;
  let messageBroker: MessageBroker | null = null;

  try {
    await connectDB();

    messageBroker = createMessageBroker();
    // await messageBroker.connectConsumer();
    // await messageBroker.consumeMessage(["product", "topping"], false);

    app
      .listen(PORT, () => console.log(`Listening on port ${PORT}`))
      .on("error", (err) => {
        console.log("err", err.message);
        process.exit(1);
      });
  } catch (err) {
    if (messageBroker) {
      await messageBroker.disconnectConsumer();
    }
    logger.error("Error happened: ", err.message);
    process.exit(1);
  }
};

void startServer();
