export interface ICoupon {
  title: string;
  code: string;
  discount: number;
  validUpto: Date;
  tenantId?: string | null;
}

export interface GetCouponFilter {
  tenantId?: string;
  discount?: number;
}
