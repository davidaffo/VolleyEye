// An absent trajectory is interpreted as a net error, including older records.
export function getAttackErrorType(event) {
  if (!event || event.skillId !== 'attack') return null;
  const code = String(event.code || event.evaluation || '').trim();
  if (code === '/') return 'murato';
  if (code !== '=') return null;
  return (event.attackDirection?.start && event.attackDirection?.end) ||
    (event.attackTrajectory?.start && event.attackTrajectory?.end) ||
    (event.attackStart && event.attackEnd)
    ? 'fuori' : 'rete';
}

export const ATTACK_ERROR_LABELS = Object.freeze({ fuori: 'Fuori', rete: 'In rete', murato: 'Murato' });

export function countAttackErrors(events) {
  const counts = { fuori: 0, rete: 0, murato: 0 };
  for (const event of events || []) {
    const type = getAttackErrorType(event);
    if (type) counts[type]++;
  }
  return counts;
}
