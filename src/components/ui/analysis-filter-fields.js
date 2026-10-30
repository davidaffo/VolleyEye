import { getAnalysisFilterKeys } from "../../domain/analysis-filter-schema.js";
const labels = {
  teams: 'Squadra', setters: 'Alzatrice', players: 'Giocatrici', skills: 'Fondamentale',
  sets: 'Set', rotations: 'Rotazione', 'set-types': 'Tipo alzata', bases: 'Base',
  phases: 'Fase (SO/BP)', 'receive-evals': 'Valutazione rice', 'receive-zones': 'Zona ricezione',
  codes: 'Valutazione attacco', 'attack-types': 'Tipo attacco', zones: 'Zona partenza',
  prev: 'Skill precedente', 'serve-types': 'Tipo servizio',
};
const overrides = {
  serve: { codes: 'Valutazione battuta' },
  playerServe: { codes: 'Valutazione battuta' },
  video: { setters: 'Alzatore', codes: 'Codice', zones: 'Zona' },
};

export function analysisFilterFields(group, prefix, extra = []) {
  return getAnalysisFilterKeys(group).map(key => [prefix + key, overrides[group]?.[key] || labels[key],
    ...(key === 'prev' ? ['previous'] : [])]).concat(extra);
}
