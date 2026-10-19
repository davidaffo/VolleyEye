// Shared column order for team totals, individual tables and player comparisons.
export const SKILL_COLUMNS = [
  { id: 'serve', label: 'Battuta', columns: ['Tot', 'Err', 'Punti', 'Eff', 'Pos'] },
  { id: 'pass', label: 'Ricezione', columns: ['Tot', 'Err', 'Ace', 'Pos', 'Prf', 'Eff'] },
  { id: 'freeball', label: 'Freeball', columns: ['Tot', 'Err', 'Pos', 'Prf', 'Eff'] },
  { id: 'attack', label: 'Attacco', columns: ['Tot', 'Err', 'Mur', 'Punti', '% Punti', 'Eff'] },
  { id: 'block', label: 'Muro', columns: ['Tot', 'Punti'] },
  { id: 'defense', label: 'Difesa', columns: ['Tot', 'Err', 'Eff'] },
];
export const COUNT_COLUMNS = ['Tot', '#', '+', '!', '-', '=', '/', 'Pos', 'Prf', 'Eff'];
