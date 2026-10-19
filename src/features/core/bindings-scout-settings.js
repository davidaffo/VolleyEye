import { bindViewportResizeUpdates } from "../scout-ui.js";
import { syncAutoLiberoSelects } from "../teams/court/court-engine.js";
import { session as matchState } from "../../../js/globals.js";
import { syncOpponentSettingsUI } from "../live/team-management.js";

export function bindScoutSettingsControls() {
  bindViewportResizeUpdates();
  syncAutoLiberoSelects();
  matchState.state.opponentSkillConfig ||= {};
  syncOpponentSettingsUI();
}
