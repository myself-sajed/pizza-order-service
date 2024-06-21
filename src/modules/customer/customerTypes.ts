export interface Customer {
  userId: string;
  name: string;
  email: string;
  address: Address[];
}

export interface Address {
  address: string;
  isDefault: boolean;
}
