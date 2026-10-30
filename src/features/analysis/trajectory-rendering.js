import { renderTrajectoryFilters, renderServeTrajectoryFilters } from "./trajectory-filters.js";

import { publishReactLogServeTrajectories, publishReactGlobalAttackGrid, publishReactGlobalServeGrid } from "./trajectory-view.js";


export function initLogServeTrajectoryControls() {

publishReactLogServeTrajectories();
}

export function renderTrajectoryAnalysis() {

renderTrajectoryFilters();
  return publishReactGlobalAttackGrid();
}

export function renderServeTrajectoryAnalysis() {

renderServeTrajectoryFilters();
  return publishReactGlobalServeGrid();
}
