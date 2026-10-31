import { setAutoRotateEnabled } from "../teams/court/court-ui-bootstrap.js";
import { applyAutoRolePositioning, setAutoRolePositioning, setAutoRoleP1American, setAutoLiberoRole } from "../teams/court/court-engine.js";
import { session as matchState } from "../../../js/globals.js";
import { updateVideoPlaybackSnapshot } from "../video/media-state.js";
import { saveState } from "../storage/save-state.js";
import { updateVideoScoutModeLayout } from "../video/view-commands.js";
import { applyForceMobileLayout } from "../core/bootstrap-state.js";
import { renderPlayers } from "../live/team-rendering.js";
import { publishReactLogServeTrajectories } from "../analysis/trajectory-view.js";
import { publishReactSettings } from "./view.js";

export function changeReactSetting(field, value) {
  if (field === "autoRotate") setAutoRotateEnabled(!!value);
  else if (field === "autoRolePositioning") {
    setAutoRolePositioning(!!value);
    if (value) applyAutoRolePositioning();
  } else if (field === "autoRoleP1American") setAutoRoleP1American(!!value);
  else if (field === "videoScoutMode") {
    if (matchState.state.videoScoutMode && !value) updateVideoPlaybackSnapshot();
    matchState.state.videoScoutMode = !!value;
    saveState();
    updateVideoScoutModeLayout();
  } else if (field === "forceMobileLayout") {
    matchState.state.forceMobileLayout = !!value;
    applyForceMobileLayout(matchState.state.forceMobileLayout);
    saveState();
  } else if (field === "autoLiberoRole") setAutoLiberoRole(value, "our");
  else if (
    [
      "attackTrajectoryEnabled",
      "attackTrajectorySimplified",
      "predictiveSkillFlow",
      "opponentAutoRoleP1American",
      "opponentAttackTrajectoryEnabled",
      "setTypePromptEnabled",
      "opponentSetTypePromptEnabled",
      "serveTrajectoryEnabled",
      "opponentServeTrajectoryEnabled",
      "showServeTrajectoryLogOur",
      "showServeTrajectoryLogOpp",
    ].includes(field)
  ) {
    matchState.state[field] = !!value;
    if (field === "predictiveSkillFlow" && !value)
      matchState.state.skillFlowOverride = null;
    saveState();
    if (field === "predictiveSkillFlow" || field === "setTypePromptEnabled")
      renderPlayers();
    if (
      field === "showServeTrajectoryLogOur" ||
      field === "showServeTrajectoryLogOpp"
    )
      publishReactLogServeTrajectories();
  } else return;
  publishReactSettings();

}
