const filterSchemaAdvanced = ['sets', 'set-types', 'bases', 'phases', 'receive-evals', 'receive-zones'];
const attack = ['codes', 'attack-types', 'zones', 'prev'];
const serve = ['codes', 'zones'];
const filterSchemaGroups = {
  attack: ['setters', 'players', ...filterSchemaAdvanced, ...attack],
  serve: ['players', ...filterSchemaAdvanced, ...serve],
  playerAttack: [...filterSchemaAdvanced, ...attack],
  playerServe: [...filterSchemaAdvanced, ...serve],
  second: ['setters', 'players', ...filterSchemaAdvanced, 'codes', 'zones', 'prev'],
  playerSecond: [...filterSchemaAdvanced.slice(1), 'sets', 'prev'],
  video: ['teams', 'players', 'setters', 'skills', 'codes', 'prev', 'sets', 'rotations', 'zones',
    'bases', 'set-types', 'phases', 'receive-evals', 'receive-zones', 'serve-types', 'attack-types'],
};
const filterSchemaDefinitions = {
  trajectoryFilterState: ['attack', 'traj-filter-'],
  serveTrajectoryFilterState: ['serve', 'serve-traj-filter-'],
  playerTrajectoryFilterState: ['playerAttack', 'player-traj-filter-'],
  playerServeTrajectoryFilterState: ['playerServe', 'player-serve-traj-filter-'],
  secondFilterState: ['second', 'second-filter-'],
  playerSecondFilterState: ['playerSecond', 'player-second-filter-'],
  videoFilterState: ['video', 'video-filter-'],
};
const filterSchemaNames = {
  'set-types': 'setTypes', 'receive-evals': 'receiveEvaluations', 'receive-zones': 'receiveZones',
  'attack-types': 'attackTypes', 'serve-types': 'serveTypes',
};
const filterSchemaNumericFields = new Set(['setters', 'players', 'sets', 'zones', 'receiveZones', 'rotations']);

export function getAnalysisFilterKeys(group) {
  return filterSchemaGroups[group];
}

export function getFilterFields(state) {
  const [group, prefix] = filterSchemaDefinitions[state];
  return filterSchemaGroups[group].filter(suffix => suffix !== 'prev').map(suffix => {
    const key = filterSchemaNames[suffix] || suffix;
    const numeric = filterSchemaNumericFields.has(key) && !(group === 'video' && ['setters', 'players'].includes(key));
    return [key, prefix + suffix, numeric, group === 'video' ? false : numeric];
  });
}

export function getFilterControlIds(state) {
  const [group, prefix] = filterSchemaDefinitions[state];
  return Object.fromEntries(filterSchemaGroups[group].map(suffix => [
    suffix === 'receive-evals' ? 'receiveEvals' : filterSchemaNames[suffix] || suffix,
    prefix + suffix,
  ]).concat([['reset', prefix + 'reset']]));
}
