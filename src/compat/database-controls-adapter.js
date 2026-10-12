function openReactDatabasePicker() {
  if (!elDbFileInput) return;
  elDbFileInput.value = "";
  elDbFileInput.click();
}
function importReactDatabaseUrl() {
  return importDatabaseFromUrl(databaseImportStore.getSnapshot().url);
}
function openReactLiveTeam() {
  return openTeamManagerModal({ scope: "our", liveEdit: true });
}
function openReactLiveOpponent() {
  return openTeamManagerModal({ scope: "opponent", liveEdit: true });
}
function openReactOpponentLineup() {
  return openMobileLineupModal("opponent");
}

function startReactPointPick() {
  return startPointPickMode("our");
}
function startReactErrorPick() {
  return startErrorPickMode("our");
}
function resetReactScoutWidgets() {
  state.uiScoutWidgetLayout = null;
  applyScoutWidgetLayout();
  saveState({ persistLocal: true });
}
function changeReactOpponentSkill(skillId, enabled) {
  if (!SKILLS.some((skill) => skill.id === skillId)) return;
  state.opponentSkillConfig = state.opponentSkillConfig || {};
  state.opponentSkillConfig[skillId] = !!enabled;
  saveState();
  publishReactSettings();
}

function publishReactSetTypeShortcuts() {
  setTypeShortcutsStore.publish({
    selected: normalizeSetTypeValue(state.nextSetType) || "",
    choices: DEFAULT_SET_TYPE_OPTIONS.map((option) => ({
      value: option.value,
      label: formatSetTypeLabelWithShortcut(option.value, option.label),
    })),
  });
}
function changeReactSetType(value) {
  if (
    value &&
    !DEFAULT_SET_TYPE_OPTIONS.some((option) => option.value === value)
  )
    return;
  queuedSetTypeChoice = value || null;
  setNextSetType(value);
}

function publishReactFloatingServeError(isCompactMobile) {
  const flow =
    isCompactMobile && state.useOpponentTeam && state.predictiveSkillFlow
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
async function recordReactFloatingServeError() {
  const { visible, scope, playerIdx, playerName } =
    floatingServeErrorStore.getSnapshot();
  if (!visible || !scope || playerIdx === null || !playerName) return;
  const success = await handleEventClick(
    playerIdx,
    "serve",
    "=",
    playerName,
    elFloatingServeErrorBtn,
    { scope },
  );
  if (!success) return;
  clearServeTypeInlineListener();
  setSelectedSkillForScope(scope, playerIdx, null);
  renderPlayers();
}
function resizeReactPanel(panel, operation, event) {
  const video = panel === "analysisHeight" || panel === "scoutHeight";
  if (operation === "start")
    return video
      ? startVideoResizeDrag(event, panel)
      : startScoutColumnResize(event, panel);
  if (operation === "reset") {
    event.preventDefault();
    if (video)
      return setVideoLayoutWidth(panel, VIDEO_LAYOUT_DEFAULTS[panel], true);
    state.uiScoutColumns = { ...SCOUT_COLUMN_DEFAULTS };
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
