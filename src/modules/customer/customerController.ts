import { Response } from "express";
import { Request } from "express-jwt";
import CustomerModel from "./customerModel";

class CustomerController {
  async getCustomer(req: Request, res: Response) {
    const { sub: userId, name, email } = req.auth;

    let customer = await CustomerModel.findOne({ userId });

    if (!customer) {
      customer = new CustomerModel({ userId, name, email });
    }

    res.send(customer);
  }
}

export default CustomerController;
