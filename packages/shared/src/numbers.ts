export type ParsePositiveIntOptions = {
  min?: number;
  max?: number;
  fallback?: number;
};

export function parsePositiveInt(
  value: string | null,
  options: ParsePositiveIntOptions = {},
): number {
  const min = options.min ?? 0;
  const max = options.max ?? 256 * 1024;
  const fallback = options.fallback ?? min;

  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

