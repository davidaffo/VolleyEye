const labels = {
  teams: 'Squadra', setters: 'Alzatrice', players: 'Giocatrici', skills: 'Fondamentale',
  sets: 'Set', rotations: 'Rotazione', 'set-types': 'Tipo alzata', bases: 'Base',
  phases: 'Fase (SO/BP)', 'receive-evals': 'Valutazione rice', 'receive-zones': 'Zona ricezione',
  codes: 'Valutazione attacco', 'attack-types': 'Tipo attacco', zones: 'Zona partenza',
  prev: 'Skill precedente', 'serve-types': 'Tipo servizio',
};
const advanced = ['sets', 'set-types', 'bases', 'phases', 'receive-evals', 'receive-zones'];
const attack = ['codes', 'attack-types', 'zones', 'prev'];
const serve = ['codes', 'zones'];
const groups = {
  attack: ['setters', 'players', ...advanced, ...attack],
  serve: ['players', ...advanced, ...serve],
  playerAttack: [...advanced, ...attack],
  playerServe: [...advanced, ...serve],
  second: ['setters', 'players', ...advanced, 'codes', 'zones', 'prev'],
  playerSecond: [...advanced.slice(1), 'sets', 'prev'],
  video: ['teams', 'players', 'setters', 'skills', 'codes', 'prev', 'sets', 'rotations', 'zones',
    'bases', 'set-types', 'phases', 'receive-evals', 'receive-zones', 'serve-types', 'attack-types'],
};
const overrides = {
  serve: { codes: 'Valutazione battuta' },
  playerServe: { codes: 'Valutazione battuta' },
  video: { setters: 'Alzatore', codes: 'Codice', zones: 'Zona' },
};

export function analysisFilterFields(group, prefix, extra = []) {
  return groups[group].map(key => [prefix + key, overrides[group]?.[key] || labels[key],
    ...(key === 'prev' ? ['previous'] : [])]).concat(extra);
}
