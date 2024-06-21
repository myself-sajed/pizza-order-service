export function isExpired(validUpto: Date) {
  return new Date() > validUpto;
}
