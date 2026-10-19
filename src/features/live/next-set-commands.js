import { setTeamPreferredLibero, setTeamLiberoAutoMap } from "../teams/roster-data.js";
import { enforceAutoLiberoForScope } from "../teams/court/court-engine.js";
import { saveState } from "../storage/save-state.js";
import { renderOpponentPlayers, renderPlayers } from "./team-rendering.js";
import { renderOpponentLiberoChipsInline, updateOpponentRotationDisplay, renderLineupChips, renderLiberoChipsInline, updateRotationDisplay } from "../teams/court/court-ui-bootstrap.js";
import { publishNextSetView } from "./next-set-view.js";

export function setNextSetPreferredLibero(scope, next) {
  setTeamPreferredLibero(scope, next);
  setTeamLiberoAutoMap(scope, {});
  enforceAutoLiberoForScope(scope, { skipServerOnServe: true });
  saveState();
  if (scope === "opponent") {
    renderOpponentPlayers();
    renderOpponentLiberoChipsInline();
    updateOpponentRotationDisplay();
  } else {
    renderPlayers();
    renderLineupChips();
    renderLiberoChipsInline();
    updateRotationDisplay();
  }
  publishNextSetView();
}
