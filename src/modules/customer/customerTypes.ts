export interface Customer {
  userId: string;
  name: string;
  email: string;
  address: Address[];
}

export interface Address {
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}
