/**
 * Defensively format occupancy rate percentage.
 * API reports are already expressed on a 0..100 percentage scale.
 * Gracefully guards against null, undefined, NaN, and negative numbers.
 */
export const formatOccupancyRate = (rate: number | undefined | null): string => {
  if (rate === undefined || rate === null || isNaN(Number(rate))) return '0.0%';
  const num = Number(rate);
  if (num <= 0) return '0.0%';
  return `${num.toFixed(1)}%`;
};
