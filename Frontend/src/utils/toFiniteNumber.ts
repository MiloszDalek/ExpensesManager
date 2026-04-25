export const toFiniteNumber = (value: unknown): number => {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Safely format a number to fixed decimal places.
 * Handles numbers, strings, and invalid values gracefully.
 */
export const toFixedSafe = (value: unknown, decimals: number = 2): string => {
  const num = toFiniteNumber(value);
  if (Number.isNaN(num)) {
    return "0.00";
  }
  return num.toFixed(decimals);
};