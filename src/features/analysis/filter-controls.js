import { buildAttackTypeFilterOptions } from "./trajectory-model.js";
import { getAttackStartZone } from "./values.js";
export { getFilterFields } from "../../domain/analysis-filter-schema.js";

import { buildSetFilterOptions } from "./values.js";
import { filterNormalEvalOptions } from "./filter-model.js";
import { buildUniqueOptions, getOptionLabel, normalizeBaseValue, getEventPhaseValue, normalizeEvalCode, normalizeReceiveZone } from "./values.js";
import { getPlayersForScope, getPlayerNumbersForScope } from "../teams/selectors.js";
import { formatNameWithNumberFor, formatNameWithNumber } from "../teams/roster-data.js";
import { sortPlayerOptionsByNumberForScope } from "../teams/lineup-selectors.js";
export { clearFilterSelections } from '../../domain/filter-selections.js';
import { pruneFilterSelections } from "../../domain/filter-selections.js";


import { renderDynamicFilter, getCheckedValues } from "./filter-view.js";
import { getSetterFromEvent } from "./filter-model.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";

export function buildAdvancedFilterOptions(events, {
  baseLabel = value => getOptionLabel(liveScoreAndSetState.DEFAULT_BASE_OPTIONS, value),
  phaseValue = getEventPhaseValue,
  phaseLabel = value => getOptionLabel(liveScoreAndSetState.DEFAULT_PHASE_OPTIONS, value),
} = {}) {
  return {
    setTypeOpts: buildUniqueOptions(events.map(event => normalizeSetTypeValue(
      event.setType || event.combination?.set_type || event.combination?.setType,
    )), { labelFn: value => getOptionLabel(liveScoreAndSetState.DEFAULT_SET_TYPE_OPTIONS, value) }),
    baseOpts: buildUniqueOptions(events.map(event => normalizeBaseValue(event.base)), { labelFn: baseLabel }),
    phaseOpts: buildUniqueOptions(events.map(phaseValue), { labelFn: phaseLabel }),
    recvEvalOpts: buildUniqueOptions(events.map(event => normalizeEvalCode(event.receiveEvaluation)), { labelFn: value => value }),
    recvZoneOpts: buildUniqueOptions(events.map(event => normalizeReceiveZone(event.receivePosition || event.receiveZone)),
      { asNumber: true, labelFn: value => 'Z' + value }),
  };
}

export function syncFilterSelections(state, fields) {
  for (const [key, container, asNumber = false] of fields) {
    state[key] = new Set(getCheckedValues(container, { asNumber }));
  }
}

export function pruneFilterControls(state, fields, options) {
  pruneFilterSelections(state, fields.map(([key, , asNumber]) => [key, options[key], asNumber]));
}

export function renderFilterControls(state, fields, options, onChange, { prune = true } = {}) {
  if (prune) pruneFilterControls(state, fields, options);
  return fields.map(([key, container, , asNumber]) =>
    renderDynamicFilter(container, options[key], state[key], { asNumber, onChange }));
}

export function buildPlayerFilterOptions(events, scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  return sortPlayerOptionsByNumberForScope(buildUniqueOptions(events.map(event => event.playerIdx), {
    asNumber: true,
    labelFn: index => !players[index] ? '—' : scope === 'opponent'
      ? formatNameWithNumberFor(players[index], numbers) : formatNameWithNumber(players[index]),
  }), scope);
}

export function buildSetterFilterOptions(events, scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const labels = new Map();
  for (const event of events) {
    const index = getSetterFromEvent(event);
    if (typeof index !== 'number') continue;
    const name = event.setterName || players[index];
    const label = (scope === 'opponent' ? formatNameWithNumberFor(name, numbers) : formatNameWithNumber(name))
      || name || 'Alzatrice ' + (index + 1);
    labels.set(index, label);
  }
  return sortPlayerOptionsByNumberForScope(Array.from(labels, ([value, label]) => ({ value, label })), scope);
}

export function buildEventFilterOptions(events, zoneFor) {
  return {
    setsOpts: buildSetFilterOptions(events),
    codesOpts: filterNormalEvalOptions(buildUniqueOptions(events.map(event => event.code), { labelFn: value => value })),
    zonesOpts: buildUniqueOptions(events.map(zoneFor), { asNumber: true, labelFn: value => 'Z' + value }),
  };
}

export function buildAttackTrajectoryFilterOptions(trajectoryEvents, attackEvents) {
  return {
    ...buildEventFilterOptions(trajectoryEvents, getAttackStartZone),
    attackTypeOpts: buildAttackTypeFilterOptions(attackEvents),
    ...buildAdvancedFilterOptions(trajectoryEvents),
  };
}
