import { session as matchState } from '../../../js/globals.js';
import { session as liveState } from '../state/live-live-score-and-set.js';
import { getPlayersForScope, getPlayerNumbersForScope, getTeamNameForScope } from '../teams/selectors.js';
import { formatNameWithNumberFor } from '../teams/roster-data.js';
import { getFilteredVideoEventsForAnalysis } from './video-events.js';
import { videoEditStore } from '../../state/video-edit-store.mjs';
import { setGlobalModalState } from '../layout/modals.js';
import { applyAttackFieldToEvents } from './event-editor.js';

export function scopeOf(event) { return event?.team === 'opponent' ? 'opponent' : 'our'; }
export function setterIndex(event, eventsById, players) {
  const scope = scopeOf(event), roster = players[scope] || [];
  if (event.skillId === 'second') return Number.isInteger(event.playerIdx) && roster[event.playerIdx] ? event.playerIdx : null;
  for (const index of [event.setterIdx, event.setterId]) {
    if (Number.isInteger(index) && roster[index]) return index;
  }
  if (event.setterName) {
    const name = String(event.setterName).trim().toLocaleLowerCase('it');
    const index = roster.findIndex(value => String(value || '').trim().toLocaleLowerCase('it') === name);
    if (index >= 0) return index;
  }
  for (const id of Array.isArray(event.relatedEvents) ? event.relatedEvents : []) {
    const related = eventsById.get(String(id));
    if (related?.skillId === 'second' && scopeOf(related) === scope && Number.isInteger(related.playerIdx) && roster[related.playerIdx]) return related.playerIdx;
  }
  return null;
}

// Rows come from recorded sets and filtered attacks; event references stay outside the UI store.
export function buildSetterAssignmentModel(events, filteredEvents, players) {
  const eventsById = new Map(events.filter(Boolean).map(event => [String(event.eventId), event]));
  const rows = new Map(), attackGroups = new Map();
  let unknownCount = 0;
  function ensure(event) {
    const scope = scopeOf(event), index = setterIndex(event, eventsById, players);
    if (index === null) return null;
    const id = `${scope}:${index}`;
    if (!rows.has(id)) rows.set(id, { id, scope, index, count: 0 });
    return id;
  }
  for (const event of events) if (event?.skillId === 'second') ensure(event);
  for (const event of filteredEvents) {
    if (event?.skillId !== 'attack') continue;
    const id = ensure(event);
    if (id === null) { unknownCount++; continue; }
    rows.get(id).count++;
    attackGroups.set(event, id);
  }
  return { rows: [...rows.values()], attackGroups, unknownCount };
}

function getModel() {
  const events = matchState.state.events || [];
  return buildSetterAssignmentModel(events, getFilteredVideoEventsForAnalysis().events, {
    our: getPlayersForScope('our'), opponent: getPlayersForScope('opponent'),
  });
}

export function openSetTypeBySetter() {
  const model = getModel();
  const options = getSetTypeOptions();
  const rows = model.rows.map(row => {
    const name = getPlayersForScope(row.scope)[row.index];
    const label = formatNameWithNumberFor(name, getPlayerNumbersForScope(row.scope)) || name;
    return { ...row, label: matchState.state.useOpponentTeam ? `${getTeamNameForScope(row.scope)} · ${label}` : label, value: '' };
  }).sort((a, b) => a.label.localeCompare(b.label, 'it', { sensitivity: 'base' }));
  videoEditStore.publish('setterSetType', { open: true, rows, options, unknownCount: model.unknownCount });
  setGlobalModalState(true, { forcePopup: true });
}

export function getSetTypeOptions() {
  const options = [...liveState.DEFAULT_SET_TYPE_OPTIONS];
  if (!options.some(option => String(option.value).toLowerCase() === 'damp')) options.push({ value: 'Damp', label: 'Damp' });
  return options;
}

export function closeSetTypeBySetter() {
  videoEditStore.publish('setterSetType', { open: false });
  setGlobalModalState(false);
}

export function applySetTypeBySetter() {
  const view = videoEditStore.getView('setterSetType');
  const allowed = new Set((view.options || []).map(option => String(option.value)));
  const choices = new Map(view.rows.filter(row => row.value && allowed.has(row.value)).map(row => [row.id, row.value]));
  const { attackGroups } = getModel();
  const targets = [...attackGroups].filter(([event, id]) => choices.has(id) && event.setType !== choices.get(id)).map(([event]) => event);
  if (targets.length) applyAttackFieldToEvents(targets, event => { event.setType = choices.get(attackGroups.get(event)); });
  closeSetTypeBySetter();
}
