import { RESULT_CODES } from '../../js/globals.js';
export function emptyCounts() {
  return { "#": 0, "+": 0, "!": 0, "-": 0, "=": 0, "/": 0 };
}

export function totalFromCounts(counts) {
  const safeCounts = normalizeCounts(counts);
  return RESULT_CODES.reduce((sum, code) => sum + (safeCounts[code] || 0), 0);
}

export function mergeCounts(target, source) {
  const safeTarget = target || emptyCounts();
  const safeSource = normalizeCounts(source);
  RESULT_CODES.forEach(code => {
    safeTarget[code] = (safeTarget[code] || 0) + (safeSource[code] || 0);
  });
  return safeTarget;
}

export function normalizeCounts(raw) {
  return Object.assign(emptyCounts(), raw || {});
}

export function formatPercentValue(numerator, denominator) {
  if (!denominator) return "-";
  return formatPercent((numerator / denominator) * 100);
}

export function formatPercent(x) {
  if (x === null || x === undefined || isNaN(x)) return "-";
  return x.toFixed(0) + "%";
}
