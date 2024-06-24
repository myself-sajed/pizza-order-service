export function isExpired(validUpto: Date) {
  console.log(new Date(), validUpto);
  return new Date() > validUpto;
}
