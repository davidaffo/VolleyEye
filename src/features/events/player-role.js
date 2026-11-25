import { getRoleLabelForRotation } from '../teams/roles.js';

// Court positions are the actual lineup, not the tactical display used for a skill.
export function getRoleAtCourt(playerName, court, rotation, liberos = []) {
  if (!playerName || !Array.isArray(court) || court.length !== 6) return null;
  const position = court.findIndex(slot => (typeof slot === 'string' ? slot : slot?.main) === playerName);
  if (position < 0) return null;
  if (liberos.includes(playerName)) return 'L';
  const value = Number(rotation);
  if (!Number.isInteger(value) || value < 1 || value > 6) return null;
  return getRoleLabelForRotation(position + 1, value) || null;
}

export function getHistoricalEventRole(event, liberos = []) {
  if (typeof event?.playerRole === 'string' && event.playerRole.trim()) return event.playerRole.trim();
  const scope = (event?.analysisOriginalTeam || event?.team) === 'opponent' ? 'opponent' : 'our';
  const court = event?.courtPlayers?.[scope];
  return getRoleAtCourt(event?.analysisOriginalPlayerName || event?.playerName, court, event?.rotation ?? event?.setterPosition, liberos);
}

export function getRoleFamily(role) {
  const value = String(role || '').trim().toUpperCase();
  if (/^S[12]?$/.test(value)) return 'S';
  if (/^C[12]?$/.test(value)) return 'C';
  return value || null;
}

export function inferPlayerRole(events, getRole = getHistoricalEventRole) {
  const counts = {};
  for (const event of events || []) {
    if (!event || !event.skillId || event.skillId === 'manual') continue;
    const role = getRoleFamily(getRole(event));
    if (role) counts[role] = (counts[role] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { role: entries.length && (entries.length === 1 || entries[0][1] > entries[1][1]) ? entries[0][0] : null, counts };
}
