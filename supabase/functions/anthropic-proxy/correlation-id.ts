const CORRELATION_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export function correlationId(
  value: string | null,
  createId: () => string = () => crypto.randomUUID(),
): string {
  return value !== null && CORRELATION_ID_PATTERN.test(value) ? value : createId();
}
