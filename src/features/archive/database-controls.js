import { SKILLS } from "../../../js/globals.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { importDatabaseFromUrl } from "../io/file-and-url-import.js";
import { databaseImportStore, setTypeShortcutsStore, floatingServeErrorStore } from "../../state/roster-import-store.mjs";
import { openTeamManagerModal } from "../teams/editor/team-editor.js";
import { openMobileLineupModal } from "../live/lineup-editor.js";
import { startPointPickMode, startErrorPickMode } from "../live/live-entry.js";
import { session as matchState } from "../../../js/globals.js";
import { applyScoutWidgetLayout } from "../live/workspace-layout.js";
import { saveState } from "../storage/save-state.js";
import { publishReactSettings } from "../settings/view.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { formatSetTypeLabelWithShortcut, setNextSetType } from "../live/scout-shortcuts.js";
import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getOppositeScope, isSkillEnabledForScope } from "../teams/selectors.js";
import { startVideoResizeDrag, startScoutColumnResize, setVideoLayoutWidth, applyScoutColumnLayout, setScoutColumnWidth, ensureScoutColumnState } from "../scout-ui.js";
import { getAutoFlowState, getServerPlayerForScope } from "../live/flow-model.js";
import { setSelectedSkillForScope } from "../live/game-flow.js";
import { handleEventClick } from "../live/event-recording.js";
import { clearServeTypeInlineListener } from "../live/skill-selection.js";
import { renderPlayers } from "../live/team-rendering.js";

export function openReactDatabasePicker() {
  if (!rosterLineupState.elDbFileInput) return;
  rosterLineupState.elDbFileInput.value = "";
  rosterLineupState.elDbFileInput.click();
}

export function importReactDatabaseUrl() {
  return importDatabaseFromUrl(databaseImportStore.getSnapshot().url);
}

export function openReactLiveTeam() {
  return openTeamManagerModal({ scope: "our", liveEdit: true });
}

export function openReactLiveOpponent() {
  return openTeamManagerModal({ scope: "opponent", liveEdit: true });
}

export function openReactOpponentLineup() {
  return openMobileLineupModal("opponent");
}

export function startReactPointPick() {
  return startPointPickMode("our");
}

export function startReactErrorPick() {
  return startErrorPickMode("our");
}

export function resetReactScoutWidgets() {
  matchState.state.uiScoutWidgetLayout = null;
  applyScoutWidgetLayout();
  saveState({ persistLocal: true });
}

export function changeReactOpponentSkill(skillId, enabled) {
  if (!SKILLS.some((skill) => skill.id === skillId)) return;
  matchState.state.opponentSkillConfig = matchState.state.opponentSkillConfig || {};
  matchState.state.opponentSkillConfig[skillId] = !!enabled;
  saveState();
  publishReactSettings();
}

export function publishReactSetTypeShortcuts() {
  setTypeShortcutsStore.publish({
    selected: normalizeSetTypeValue(matchState.state.nextSetType) || "",
    choices: liveScoreAndSetState.DEFAULT_SET_TYPE_OPTIONS.map((option) => ({
      value: option.value,
      label: formatSetTypeLabelWithShortcut(option.value, option.label),
    })),
  });
}

export function changeReactSetType(value) {
  if (
    value &&
    !liveScoreAndSetState.DEFAULT_SET_TYPE_OPTIONS.some((option) => option.value === value)
  )
    return;
  scoutUiState.queuedSetTypeChoice = value || null;
  setNextSetType(value);
}

export function publishReactFloatingServeError(isCompactMobile) {
  const flow =
    isCompactMobile && matchState.state.useOpponentTeam && matchState.state.predictiveSkillFlow
      ? getAutoFlowState()
      : null;
  const scope =
    flow?.skillId === "pass" ? getOppositeScope(flow.teamScope) : "";
  const server =
    scope && isSkillEnabledForScope("serve", scope)
      ? getServerPlayerForScope(scope)
      : null;
  floatingServeErrorStore.publish({
    visible: !!server?.name,
    scope,
    playerIdx: server?.idx ?? null,
    playerName: server?.name || "",
  });
}

export async function recordReactFloatingServeError() {
  const { visible, scope, playerIdx, playerName } =
    floatingServeErrorStore.getSnapshot();
  if (!visible || !scope || playerIdx === null || !playerName) return;
  const success = await handleEventClick(
    playerIdx,
    "serve",
    "=",
    playerName,
    scoutUiState.elFloatingServeErrorBtn,
    { scope },
  );
  if (!success) return;
  clearServeTypeInlineListener();
  setSelectedSkillForScope(scope, playerIdx, null);
  renderPlayers();
}

export function resizeReactPanel(panel, operation, event) {
  const video = panel === "analysisHeight" || panel === "scoutHeight";
  if (operation === "start")
    return video
      ? startVideoResizeDrag(event, panel)
      : startScoutColumnResize(event, panel);
  if (operation === "reset") {
    event.preventDefault();
    if (video)
      return setVideoLayoutWidth(panel, scoutUiState.VIDEO_LAYOUT_DEFAULTS[panel], true);
    matchState.state.uiScoutColumns = { ...scoutUiState.SCOUT_COLUMN_DEFAULTS };
    applyScoutColumnLayout();
    saveState({ persistLocal: true });
  } else if (
    operation === "key" &&
    !video &&
    ["ArrowLeft", "ArrowRight"].includes(event.key)
  ) {
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    setScoutColumnWidth(
      panel,
      ensureScoutColumnState()[panel] +
        (panel === "left" ? direction * 16 : -direction * 16),
      true,
    );
  }
}
