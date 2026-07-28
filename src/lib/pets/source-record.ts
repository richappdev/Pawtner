export function singleRelatedRecord<T>(
  value: T | T[] | null | undefined,
): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}
