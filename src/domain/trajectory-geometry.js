export function clamp01(n) {
  if (n == null || isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function mirrorTrajectoryPoint(norm) {
  if (!norm) return norm;
  return {
    x: 1 - clamp01(norm.x),
    y: 1 - clamp01(norm.y),
  };
}

export function computeAttackDirectionDeg(start, end) {
  if (!start || !end) return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return Math.round(((angle + 360) % 360) * 10) / 10; // 0-360, 1 decimal
}

export function getAttackZone(normalizedPoint, isFarSide = false) {
  if (!normalizedPoint) return null;
  const x = clamp01(normalizedPoint.x);
  const third = x < 1 / 3 ? 0 : x < 2 / 3 ? 1 : 2;
  if (!isFarSide) {
    return third === 0 ? 4 : third === 1 ? 3 : 2;
  }
  return third === 0 ? 5 : third === 1 ? 6 : 1;
}

export function mapBackRowZone(zone, baseZone) {
  if (!zone) return zone;
  const isBackRow = baseZone === 5 || baseZone === 6 || baseZone === 1;
  if (isBackRow) {
    if (zone === 4) return 5;
    if (zone === 3) return 6;
    if (zone === 2) return 1;
  }
  return zone;
}
