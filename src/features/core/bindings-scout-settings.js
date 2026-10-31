import { bindViewportResizeUpdates } from "./viewport.js";
import { publishReactSettings } from "../settings/view.js";
import { session as matchState } from "../../../js/globals.js";
import { syncOpponentSettingsUI } from "../live/team-management.js";

export function bindScoutSettingsControls() {
  bindViewportResizeUpdates();
  publishReactSettings();
  matchState.state.opponentSkillConfig ||= {};
  syncOpponentSettingsUI();
}
