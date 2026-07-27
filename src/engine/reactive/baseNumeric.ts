export function getBaseNumeric(
  baseControlValues: Record<string, number | boolean>,
  key: string,
  fallback: number,
): number {
  const value = baseControlValues[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
