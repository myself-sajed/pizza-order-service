import { Response } from "express";
import { Request } from "express-jwt";
import CustomerModel from "./customerModel";

class CustomerController {
  async getCustomer(req: Request, res: Response) {
    const { sub: userId, name, email } = req.auth;

    let customer = await CustomerModel.findOne({ userId });

    if (!customer) {
      customer = await CustomerModel.create({ userId, name, email });
    }

    res.send(customer);
  }

  async addAddress(req: Request, res: Response) {
    const { sub: userId } = req.auth;
    const { customerId } = req.params;
    const { addressLine, pincode, city, state, country } = req.body;

    const customer = await CustomerModel.findOneAndUpdate(
      { _id: customerId, userId },
      {
        $push: {
          address: {
            addressLine,
            pincode,
            city,
            state,
            country,
            isDefault: false,
          },
        },
      },
      {
        new: true,
      },
    );

    res.send(customer);
  }
}

export default CustomerController;
