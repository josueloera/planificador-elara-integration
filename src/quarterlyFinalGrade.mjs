export function formatQuarterlyFinal(value, roundToInteger = false) {
  if (value == null || String(value).trim() === '') return value ?? '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return (roundToInteger ? Math.round(numeric) : numeric).toFixed(roundToInteger ? 0 : 1);
}
