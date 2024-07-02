import express, { Request, Response } from "express";
import { globalErrorHandler } from "./common/middleware/globalErrorHandler";
import cookieParser from "cookie-parser";
import customerRouter from "./modules/customer/customerRouter";
import couponRouter from "./modules/coupon/couponRouter";
import orderRouter from "./modules/orders/orderRouter";
import config from "config";
import cors from "cors";

const app = express();
app.use(cookieParser());
app.use(express.json());

const ORIGIN_URI_Admin = config.get("server.originURIAdmin");
const ORIGIN_URI_Client = config.get("server.originURIClient");
app.use(
  cors({
    origin: [ORIGIN_URI_Admin as string, ORIGIN_URI_Client as string],
    credentials: true,
  }),
);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from order service service!" });
});

app.use("/customer", customerRouter);
app.use("/coupon", couponRouter);
app.use("/order", orderRouter);

app.use(globalErrorHandler);

export default app;
