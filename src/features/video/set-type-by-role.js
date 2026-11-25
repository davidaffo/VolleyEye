import { session as matchState } from '../../../js/globals.js';
import { getPlayersForScope } from '../teams/selectors.js';
import { getRoleAtCourt, getHistoricalEventRole, getRoleFamily, inferPlayerRole, inferRoleFromSetStarts } from '../events/player-role.js';
export { inferRoleFromSetStarts } from '../events/player-role.js';
import { scopeOf, setterIndex, getSetTypeOptions } from './set-type-by-setter.js';
import { getFilteredVideoEventsForAnalysis } from './video-events.js';
import { videoEditStore } from '../../state/video-edit-store.mjs';
import { setGlobalModalState } from '../layout/modals.js';
import { applyAttackFieldToEvents } from './event-editor.js';

const ROLE_LABELS = { P: 'Palleggiatrice', S: 'Schiacciatrice', C: 'Centrale', O: 'Opposta', L: 'Libero' };

export function buildRoleAssignmentModel(events, filteredEvents, players, liberos, setStarts = {}) {
  const eventsById = new Map(events.filter(Boolean).map(event => [String(event.eventId), event]));
  const roleFor = event => getRoleFamily(getHistoricalEventRole(event, liberos[scopeOf(event)] || []));
  const roleCache = new Map();
  const playerRole = (scope, index) => {
    const key = `${scope}:${index}`;
    if (!roleCache.has(key)) roleCache.set(key, inferPlayerRole(events.filter(event => event && scopeOf(event) === scope && event.playerIdx === index), roleFor).role);
    return roleCache.get(key);
  };
  const rows = new Map(), attackGroups = new Map();
  let unknownCount = 0;
  for (const event of filteredEvents) {
    if (event?.skillId !== 'attack') continue;
    const scope = scopeOf(event), index = setterIndex(event, eventsById, players);
    if (index === null) { unknownCount++; continue; }
    let setterRole = null;
    for (const id of Array.isArray(event.relatedEvents) ? event.relatedEvents : []) {
      const related = eventsById.get(String(id));
      if (related?.skillId === 'second' && scopeOf(related) === scope && related.playerIdx === index) {
        setterRole = roleFor(related);
        if (setterRole) break;
      }
    }
    setterRole ||= getRoleFamily(getRoleAtCourt(players[scope][index], event.courtPlayers?.[scope], event.rotation ?? event.setterPosition, liberos[scope] || []));
    setterRole ||= playerRole(scope, index);
    setterRole ||= inferRoleFromSetStarts(players[scope][index], scope, event.set, setStarts, liberos[scope] || []);
    if (!setterRole) { unknownCount++; continue; }
    if (setterRole !== 'P') continue;
    const role = roleFor(event) || (Number.isInteger(event.playerIdx)
      ? playerRole(scope, event.playerIdx) || inferRoleFromSetStarts(players[scope][event.playerIdx], scope, event.set, setStarts, liberos[scope] || [])
      : null);
    if (!role) { unknownCount++; continue; }
    if (!rows.has(role)) rows.set(role, { id: role, label: ROLE_LABELS[role] || role, count: 0, value: '' });
    rows.get(role).count++;
    attackGroups.set(event, role);
  }
  return { rows: [...rows.values()].sort((a, b) => a.label.localeCompare(b.label, 'it')), attackGroups, unknownCount };
}

function getModel() {
  return buildRoleAssignmentModel(matchState.state.events || [], getFilteredVideoEventsForAnalysis().events,
    { our: getPlayersForScope('our'), opponent: getPlayersForScope('opponent') },
    { our: matchState.state.liberos || [], opponent: matchState.state.opponentLiberos || [] },
    matchState.state.setStarts || {});
}

export function openSetTypeByRole() {
  const { rows, unknownCount } = getModel();
  videoEditStore.publish('roleSetType', { open: true, rows, unknownCount, options: getSetTypeOptions() });
  setGlobalModalState(true, { forcePopup: true });
}

export function closeSetTypeByRole() {
  videoEditStore.publish('roleSetType', { open: false });
  setGlobalModalState(false);
}

export function applySetTypeByRole() {
  const view = videoEditStore.getView('roleSetType');
  const allowed = new Set((view.options || []).map(option => String(option.value)));
  const choices = new Map(view.rows.filter(row => row.value && allowed.has(row.value)).map(row => [row.id, row.value]));
  const { attackGroups } = getModel();
  const targets = [...attackGroups].filter(([event, role]) => choices.has(role) && event.setType !== choices.get(role)).map(([event]) => event);
  if (targets.length) applyAttackFieldToEvents(targets, event => { event.setType = choices.get(attackGroups.get(event)); });
  closeSetTypeByRole();
}
