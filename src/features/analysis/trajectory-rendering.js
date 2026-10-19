import {
  renderTrajectoryFilters,
  renderServeTrajectoryFilters,
} from "./trajectory-filters.js";

import { session as scoutUiState } from "../state/scout-ui.js";

import {
  publishReactLogServeTrajectories,
  publishReactGlobalAttackGrid,
  publishReactAttackSummary,
  publishReactGlobalServeGrid,
} from "./trajectory-view.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";

export function renderLogServeTrajectories() {
  if (!scoutUiState.elLogServeTrajectory) return;

  return publishReactLogServeTrajectories();
}

export function initLogServeTrajectoryControls() {
  if (!scoutUiState.elLogServeTrajectory) return;

  renderLogServeTrajectories();
}

export function renderTrajectoryAnalysis() {
  if (!rosterLineupState.elTrajectoryGrid) return;

  renderTrajectoryFilters();
  return publishReactGlobalAttackGrid();
}

export function renderAttackMetricsSummary(
  target,
  events,
  compareEvents = null,
) {
  if (!target) return;

  return publishReactAttackSummary(target, events, compareEvents);
}

export function renderServeTrajectoryAnalysis() {
  if (!rosterLineupState.elServeTrajectoryGrid) return;

  renderServeTrajectoryFilters();
  return publishReactGlobalServeGrid();
}
