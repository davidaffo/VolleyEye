import { setTeamPreferredLibero, setTeamLiberoAutoMap } from "../teams/roster-data.js";
import { enforceAutoLiberoForScope } from "../teams/court-state-model.js";
import { saveState } from "../storage/save-state.js";
import { renderOpponentPlayers, renderPlayers } from "./team-rendering.js";
import { renderLiberoBench } from "../scout/court-commands.js";
import { updateOpponentRotationDisplay, updateRotationDisplay } from "../teams/court-view.js";
import { publishNextSetView } from "./next-set-view.js";

export function setNextSetPreferredLibero(scope, next) {
  setTeamPreferredLibero(scope, next);
  setTeamLiberoAutoMap(scope, {});
  enforceAutoLiberoForScope(scope, { skipServerOnServe: true });
  saveState();
  if (scope === "opponent") {
    renderOpponentPlayers();
    renderLiberoBench();
    updateOpponentRotationDisplay();
  } else {
    renderPlayers();

    renderLiberoBench();
    updateRotationDisplay();
  }
  publishNextSetView();
}
