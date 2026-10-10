// Appended to the compatibility engine by Vite, sharing its private lexical scope.
// runtimeStore is imported by the virtual entrypoint; domain functions remain private.
const commands = {
  openDebugModal,
  closeDebugModal,
  forceRefreshAppAssets,
  toggleReactTopbar,
  syncReactDebugLog,
  backfillReactPlayerIds,
  openAttackTrajectoryModal,
  closeAttackTrajectoryModal,
  setServeTypeSelection,
  chooseReactTrajectoryNetPoint,
  chooseFfmpegEncoder,
  closeVideoMobileSourceModal,
  openVideoMobileSourceModal,
  loadReactMobileYoutube,
  changeReactPlayerAnalysis,
  selectReactSetTrendPoint,
  changeReactPlayByPlaySet,
  toggleMetricAssignment,
  togglePointRule,
  toggleActiveCode,
  toggleSkillEnabled,
  changeReactMatchSheetFilter,
  changeReactMatchSheetNote,
  openReactMultiscout,
  closeReactMultiscout,
  changeReactMultiscoutScope,
  resetReactMultiscout,
  saveCurrentVideoFilterPreset,
  applyReactVideoPreset,
  renameReactVideoPreset,
  removeReactVideoPreset,
  reorderReactVideoPresets,
  undoLastVideoEdit,
  openAggSkillModal,
  closeAggSkillModal,
  changeReactChartMetric,
  openVideoScoreModal,
  closeVideoScoreModal,
  correctVideoScoresFromSelection,
  closeBulkEditModal,
  openBulkEditModal,
  applyBulkEditSession,
  openSettingsModal,
  closeSettingsModal,
  changeReactSetting,
  swapManagedSettingsLibero: () => {
    swapPreferredLibero();
    syncAutoLiberoSelects();
  },
  openOffsetModal,
  closeOffsetModal,
  applyOffsetsToSelectedSkills,
  openSkillDurationModal,
  closeSkillDurationModal,
  applySkillDurationDefaults,
  openUnifyTimesModal,
  closeUnifyTimesModal,
  applyUnifyTimes,
  openPlayerPhotoEditor,
  showCamp3ImportConfirm,
  closePlayerPhotoEditor,
  renderPlayerPhotoEditor,
  changePlayerPhotoZoom: (value) => {
    const zoom = parseFloat(value);
    playerPhotoEditorState.zoom = Number.isFinite(zoom) ? Math.max(1, zoom) : 1;
    renderPlayerPhotoEditor();
  },
  removeManagedPlayerPhoto: () =>
    closePlayerPhotoEditor(PLAYER_PHOTO_REMOVE_RESULT),
  saveManagedPlayerPhoto: () => {
    try {
      closePlayerPhotoEditor(exportPlayerPhotoDataUrl());
    } catch (error) {
      logError("player-photo-export", error);
      closePlayerPhotoEditor(null);
    }
  },
  closeCamp3ConfirmModal,
  closeManagedPlayersPaste,
  applyManagedPlayersPaste,
  closePlayersDbModal,
  removeOrphanPlayersFromDb,
  mergeManagedPlayersDb,
  openBaseModal,
  openAttackSetterModal,
  openAttackTypeModal,
  openBlockNumberModal,
  resetAttackShortcutModals,
  applyBaseToTarget,
  applySetterToTarget,
  applyAttackTypeToTarget,
  applyBlockNumberToTarget,
  addManagedTeamPlayer,
  duplicateManagedTeamPlayers,
  generateManagedTeamTemplate,
  openManagedPlayersPaste,
  importCamp3IntoTeamManager,
  openTeamManagerModal,
  openNewTeamManager,
  closeTeamManagerModal,
  saveTeamManagerPayload,
  exportCurrentTeamToFile,
  openSkillModal,
  openSkillCodesModal,
  closeSkillModal,
  cancelSkillModalFlow,
  openMobileLineupModal,
  openNextSetLineupModal,
  closeLineupModal,
  saveLineupModal,
  applyDefaultLineupToModal,
  changeLineupPreferredLibero,
  toggleLineupNumbers: () => {
    lineupNumberMode = !lineupNumberMode;
    renderLineupModal();
  },
  changeLineupNumber: (index, value, exit = false) => {
    applyNumberToLineupSlot(index, value);
    if (exit) exitLineupNumberMode();
    else renderLineupModal();
  },
  selectLineupSlot: (index) => {
    if (lineupNumberMode) return;
    if (lineupSelectedName) {
      assignPlayerToLineup(lineupSelectedName, index);
      lineupSelectedName = "";
    } else if (getCourtShape(lineupModalCourt)[index]?.main)
      clearLineupSlot(index);
    renderLineupModal();
  },
  clearManagedLineupSlot: (index) => {
    clearLineupSlot(index);
    renderLineupModal();
  },
  placeManagedLineupPlayer: (name, index) => {
    assignPlayerToLineup(name, index);
    lineupSelectedName = "";
    renderLineupModal();
  },
  moveManagedLineupSlot: (from, to) => {
    swapLineupSlots(from, to);
    renderLineupModal();
  },
  openSetStartEditor,
  closeSetStartModal,
  applySetStartDraft,
  changeSetStartSelection: (name, value) => {
    if (!setStartDraft) return;
    updateSetStartSelection(
      setStartDraft.setNum,
      setStartDraft.scope,
      name,
      value,
    );
    renderSetStartModal();
  },
  openErrorModal,
  openPointModal,
  closeErrorModal,
  closePointModal,
  selectAttributionErrorType,
  applyAttribution,
  closeNextSetModal,
  applyNextSetDraft,
  setNextSetRotation,
  rotateNextSetCourt,
  handleLineupTouchStart,
  changeNextSetPlayer: (scope, index, name) => {
    if (name) setNextSetPlayer(scope, index, name);
    else clearNextSetSlot(scope, index);
    renderNextSetLineups();
  },
  moveNextSetSlot: (scope, from, to) => {
    swapNextSetSlots(scope, from, to);
    renderNextSetLineups();
  },
  changeNextSetOption: (key, value) => {
    if (!nextSetDraft || !["swapCourt", "isServing"].includes(key)) return;
    nextSetDraft[key] = !!value;
    publishNextSetView();
  },
  restoreNextSetDefaults: (scope) => {
    const defaults = getRawDefaultStartForScope(scope);
    if (!nextSetDraft || !defaults) return;
    updateNextSetEntry(scope, defaults);
    renderNextSetLineups();
  },
  setNextSetPreferredLibero,

  openTeamsManagerModal,
  closeTeamsManagerModal,
  openSelectedManagedTeam,
  deleteSelectedManagedTeam,
  duplicateSelectedManagedTeam,
  exportSelectedManagedTeam,
  createManagedTeam,
  openPlayersDbModal,
  importTeamToStorageOnly,
  selectManagedTeam: (name) => {
    teamsManagerSelectedName = listTeamsFromStorage().includes(name)
      ? name
      : "";
    renderTeamsManagerList();
  },
  mergeManagedTeams,
  selectArchivedMatch,
  deleteSelectedMatch,
  createNewMatchFromPrompt,
  editMatch: () => openNewMatchModal("edit"),
  closeMatchDialog: closeNewMatchModal,
  submitMatchDialog: submitReactMatchDialog,
  manageDialogTeams: () => {
    closeNewMatchModal();
    setActiveTab("info");
    openTeamsManagerModal();
  },
  handleManualScore,
  endMatch,
  prepareNextSet: () => openNextSetModal((state.currentSet || 1) + 1),
  navigateToTab,
  setActiveTab,
  setActiveAggTab,
  applyTheme,
  saveState,
  recordTimeoutEvent,
  recordOpponentTimeoutEvent,
  recordSubstitutionEvent,
  undoLastEvent,
  setCurrentSet,
  applyImportedMatch,
  createNewMatchFromSetup,
  loadSelectedMatch,
  enterSelectedMatch,
  exitCurrentMatch,
  exportMatchToFile,
  exportDataVolleyToFile,
  exportAnalysisHtml,
  flushStorage: () => archiveStorage.flush(),
};
let startup;

function openReactMatchDialog(dialogMode, details, archiveName) {
  matchDialogStore.open({
    mode: dialogMode,
    archiveName,
    details: {
      match: { ...details.match },
      selectedTeam: details.selectedTeam,
      selectedOpponentTeam: details.selectedOpponentTeam,
      useOpponentTeam: details.useOpponentTeam,
    },
    teamNames: listTeamsFromStorage(),
    today: getTodayIso(),
    currentCategory: (state.match && state.match.category) || "",
  });
  setGlobalModalState(true);
  return true;
}
function closeReactMatchDialog() {
  matchDialogStore.close();
  setGlobalModalState(false);
}
function submitReactMatchDialog() {
  const view = matchDialogStore.getSnapshot();
  if (!view.open) return false;
  const setup = { ...view.draft };
  matchDetailsArchiveName = view.archiveName;
  const saved =
    view.mode === "edit"
      ? saveMatchDetailsFromSetup(setup)
      : createNewMatchFromSetup(setup);
  if (saved) closeNewMatchModal();
  return saved;
}

export function getMatchSnapshot() {
  return cloneIsolationData(buildCompactLocalStateSnapshot(state));
}

let archiveRows = Object.freeze([]);
let archiveSignature = "";
let scoutControlsDisabled = false;

function publishScoutControlState(disabled) {
  scoutControlsDisabled = !!disabled;
  publishRuntimeView();
}

export function publishRuntimeView() {
  publishReactSettings();
  const names = Object.keys(state.savedMatches || {});
  // Avoid resolving duplicate archive labels on every point/counter update.
  const signature = JSON.stringify(
    names.map((name) => {
      const payload = state.savedMatches[name];
      return [
        name,
        payload && payload.state && payload.state.match
          ? buildMatchDisplayName(payload.state.match)
          : name,
      ];
    }),
  );
  if (signature !== archiveSignature) {
    archiveSignature = signature;
    archiveRows = Object.freeze(
      names.map((name) =>
        Object.freeze({
          name,
          label:
            getMatchArchiveLabel(name, state.savedMatches[name], names) || name,
        }),
      ),
    );
  }
  const set = state.currentSet || 1;
  const score = computePointsSummary(set);
  const setScore = computeSetWinScore();
  runtimeStore.publish({
    ready: true,
    currentSet: set,
    theme: state.theme,
    activeTab: state.uiActiveTab,
    activeAggTab: state.uiAggTab,
    topbarHidden: !!state.uiTopBarHidden,
    selectedMatch: state.selectedMatch,
    archivedMatches: archiveRows,
    matchLabel:
      buildMatchDisplayName(state.match || {}) ||
      state.loadedMatchName ||
      state.selectedMatch ||
      "Partita",
    scoreLabel: score.totalFor + " - " + score.totalAgainst,
    setWinLabel: setScore.for + " - " + setScore.against,
    matchFinished: !!state.matchFinished,
    scoutControlsDisabled,
    timeoutsOur: Math.max(0, MAX_TIMEOUTS_PER_SET - getTimeoutCountForSet(set)),
    timeoutsOpponent: Math.max(
      0,
      MAX_TIMEOUTS_PER_SET - getTimeoutOppCountForSet(set),
    ),
    substitutionsOur: Math.max(
      0,
      MAX_SUBSTITUTIONS_PER_SET - getSubstitutionCountForSet(set, "our"),
    ),
    substitutionsOpponent: Math.max(
      0,
      MAX_SUBSTITUTIONS_PER_SET - getSubstitutionCountForSet(set, "opponent"),
    ),
  });
}

export function start() {
  startup ??= init().then(publishRuntimeView);
  return startup;
}

export async function invoke(name, ...args) {
  await start();
  if (!Object.hasOwn(commands, name))
    throw new Error("Unknown command: " + name);
  try {
    return await commands[name](...args);
  } finally {
    publishRuntimeView();
  }
}

function publishTeamsManagerView() {
  const teams = listTeamsFromStorage().map((name) => {
    const team = loadTeamNormalized(name);
    return Object.freeze({
      name,
      players: Object.freeze(
        (team?.playersDetailed || []).map((player) =>
          Object.freeze({ id: player.id, name: player.name }),
        ),
      ),
    });
  });
  teamsManagerStore.publish({ selectedName: teamsManagerSelectedName, teams });
}
function setTeamsManagerOpen(open) {
  teamsManagerStore.publish({ open });
}
async function mergeManagedTeams(secondaryName, choices) {
  const primaryName = teamsManagerSelectedName;
  try {
    buildTeamMerge(primaryName, secondaryName, choices);
    if (
      !confirm(
        "Unire “" +
          secondaryName +
          "” in “" +
          primaryName +
          "”? Le partite saranno ricollegate e “" +
          secondaryName +
          "” sarà eliminata. Gli ID delle giocatrici abbinate saranno unificati anche nelle altre squadre e partite.",
      )
    )
      return;
    await commitTeamMerge(primaryName, secondaryName, choices);
  } catch (error) {
    alert(error.message);
    return;
  }
  renderTeamsManagerList();
  renderTeamsSelect();
  renderOpponentTeamsSelect();
  if (typeof applyMatchInfoToUI === "function") applyMatchInfoToUI();
  alert("Squadre unite e partite aggiornate.");
}

function publishNextSetView() {
  if (!nextSetDraft) {
    nextSetStore.publish({ open: false });
    return;
  }
  const teams = {};
  for (const scope of ["our", "opponent"]) {
    const entry = getNextSetEntry(scope);
    const court = getCourtShape(entry?.court || []);
    const numbers = getPlayerNumbersForScope(scope);
    const label = (name) =>
      formatLineupModalName(name, { compactCourt: true, scope });
    const liberos = getLiberosForScope(scope);
    const ordered =
      typeof sortNamesByNumber === "function"
        ? sortNamesByNumber(liberos, numbers)
        : liberos.slice();
    const preferred = getTeamPreferredLibero(scope);
    teams[scope] = Object.freeze({
      name: getTeamNameForScope(scope),
      rotation: entry?.rotation || 1,
      hasDefaults: !!getRawDefaultStartForScope(scope),
      court: Object.freeze(
        court.map((slot) =>
          Object.freeze({
            ...slot,
            label: slot.main ? label(slot.main) : "Trascina qui",
          }),
        ),
      ),
      bench: Object.freeze(
        getBenchForLineupWithRoster(
          court,
          getPlayersForScope(scope),
          liberos,
          numbers,
        ).map((name) => Object.freeze({ name, label: label(name) })),
      ),
      liberos: Object.freeze(
        ordered.map((name) =>
          Object.freeze({
            name,
            label:
              scope === "opponent"
                ? formatNameWithNumberFor(name, numbers)
                : formatNameWithNumber(name),
          }),
        ),
      ),
      preferredLibero: ordered.includes(preferred) ? preferred : "",
    });
  }
  nextSetStore.publish({
    open: nextSetModalOpen,
    setNum: nextSetDraft.setNum,
    double: !!state.useOpponentTeam,
    swapCourt: !!nextSetDraft.swapCourt,
    isServing: !!nextSetDraft.isServing,
    teams: Object.freeze(teams),
  });
}
function setNextSetPreferredLibero(scope, next) {
  setTeamPreferredLibero(scope, next);
  setTeamLiberoAutoMap(scope, {});
  if (typeof enforceAutoLiberoForScope === "function")
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

export function invokeEvent(name, ...args) {
  const eventCommands = {
    handleReactTrajectoryPointer,
    resizeTrajectoryCanvas,
    openReactLocalVideoPicker,
    refreshReactCompareSections,
    bindReactEventTable,
    registerReactEventEdit,
    copySkillChartImageToClipboard,
    handlePlayerPhotoPointerDown,
    handlePlayerPhotoPointerMove,
    handlePlayerPhotoPointerUp,
    handleLineupTouchStart,
    handleDefaultLineupTouchStart,
    finalizeDefaultLineupTouch,
    handleCourtDragStart,
    handleCourtDragEnd,
    handlePositionDragOver,
    handlePositionDragLeave,
    handlePositionDrop,
    animateFlip,
  };
  if (!Object.hasOwn(eventCommands, name))
    throw new Error("Unknown event command: " + name);
  return eventCommands[name](...args);
}

function publishAttributionView(kind) {
  const prefill = kind === "error" ? errorModalPrefillPlayer : null;
  const scope = prefill?.scope || "our";
  const prefilled = typeof prefill?.playerIdx === "number";
  const pickedName = prefilled
    ? prefill.playerName ||
      getPlayersForScope(scope)[prefill.playerIdx] ||
      "Giocatrice"
    : "";
  const entries =
    scope === "opponent"
      ? getSortedPlayerEntriesForScope(scope)
      : getSortedPlayerEntries();
  attributionStore.publish(kind, {
    courtModal: isDesktopCourtModalLayout(),
    scope,
    prefilled,
    fromPicker: !!prefill?.fromPicker,
    teamFromPicker: !!prefill?.teamFromPicker,
    pickedName,
    pickedLabel: pickedName ? formatNameWithNumber(pickedName) : "",
    pickedIndex: prefill?.playerIdx,
    selectedType: selectedErrorType || "Generic",
    types: Object.freeze(ERROR_TYPES.map((type) => Object.freeze({ ...type }))),
    players: Object.freeze(
      entries.map(({ name, idx }) =>
        Object.freeze({
          name,
          idx,
          label:
            scope === "opponent"
              ? formatNameWithNumberFor(name, getPlayerNumbersForScope(scope))
              : formatNameWithNumber(name),
        }),
      ),
    ),
  });
}
function setAttributionOpen(kind, open) {
  attributionStore.publish(kind, {
    open,
    courtModal: isDesktopCourtModalLayout(),
  });
}
function selectAttributionErrorType(type) {
  if (!ERROR_TYPES.some((item) => item.id === type)) return;
  setSelectedErrorType(type);
  const prefill = errorModalPrefillPlayer;
  if (prefill?.fromPicker && typeof prefill.playerIdx === "number") {
    const name =
      prefill.playerName ||
      getPlayersForScope(prefill.scope || "our")[prefill.playerIdx] ||
      "Giocatrice";
    addPlayerError(prefill.playerIdx, name, type, prefill.scope || "our");
    errorModalPrefillPlayer = null;
    closeErrorModal();
  } else if (prefill?.teamFromPicker) {
    handleTeamError(type, prefill.scope || "our");
    errorModalPrefillPlayer = null;
    closeErrorModal();
  } else publishAttributionView("error");
}
function applyAttribution(kind, index = null) {
  const view = attributionStore.getSnapshot()[kind];
  if (!view?.open) return;
  if (index === null) {
    if (kind === "point") handleTeamPoint();
    else handleTeamError(selectedErrorType, view.scope);
  } else {
    const player = view.players.find((entry) => entry.idx === index);
    if (!player) return;
    if (kind === "point") addPlayerPoint(player.idx, player.name);
    else addPlayerError(player.idx, player.name, selectedErrorType, view.scope);
  }
  if (kind === "point") closePointModal();
  else {
    errorModalPrefillPlayer = null;
    closeErrorModal();
  }
}

function publishSetStartView() {
  const setNum = setStartModalSetNum || state.currentSet || 1;
  const scope = setStartModalScope || "our";
  ensureSetStartSnapshot(setNum);
  const draft = ensureSetStartDraft(setNum, scope);
  const startInfo = buildSetStartInfoList([setNum], scope)[0];
  const entries =
    scope === "opponent"
      ? getSortedPlayerEntriesForScope(scope)
      : getSortedPlayerEntries();
  const rows = entries.map(({ name }) => {
    const key = makePlayerNameKey(name);
    const entry = draft?.selections?.get(key);
    const pos = startInfo?.positions?.get(key);
    const isSub = startInfo?.subsIn?.has(key);
    return Object.freeze({
      name,
      label:
        scope === "opponent"
          ? formatNameWithNumberFor(name, getPlayerNumbersForScope(scope))
          : formatNameWithNumber(name),
      value: entry ? entry.value || "" : pos ? String(pos) : isSub ? "in" : "",
    });
  });
  setStartStore.publish({
    title:
      "Formazione di partenza S" +
      setNum +
      (scope === "opponent" ? " avversaria" : ""),
    rows: Object.freeze(rows),
  });
}
function setSetStartOpen(open) {
  setStartStore.publish({ open });
}

function publishLineupView() {
  const court = getCourtShape(lineupModalCourt);
  const numbers = getLineupModalNumbers();
  const liberos = getLineupModalLiberos();
  const ordered = sortNamesByNumber(liberos, numbers);
  const preferred = getLineupModalPreferredLibero();
  const label = (name) => formatLineupModalName(name, { compactCourt: true });
  lineupStore.publish({
    scope: lineupModalScope,
    context: lineupModalContext,
    numberMode: lineupNumberMode,
    selectedName: lineupSelectedName,
    court: Object.freeze(
      court.map((slot) =>
        Object.freeze({
          ...slot,
          label: slot.main ? label(slot.main) : "Trascina qui",
          number: (numbers[slot.main] || "").trim(),
        }),
      ),
    ),
    bench: Object.freeze(
      getBenchForLineupWithRoster(
        court,
        getLineupModalPlayers(),
        liberos,
        numbers,
      ).map((name) => Object.freeze({ name, label: label(name) })),
    ),
    liberos: Object.freeze(
      ordered.map((name) =>
        Object.freeze({
          name,
          label:
            lineupModalScope === "opponent"
              ? formatNameWithNumberFor(name, numbers)
              : formatNameWithNumber(name),
        }),
      ),
    ),
    preferredLibero: ordered.includes(preferred) ? preferred : "",
  });
}
function setLineupOpen(open) {
  lineupStore.publish({ open, courtModal: isDesktopCourtModalLayout() });
}

function setAttackShortcutOpen(kind, open) {
  attackShortcutStore.publish({ [kind]: open });
}
function getAttackShortcutOpen(id) {
  const kind = {
    "base-modal": "base",
    "attack-setter-modal": "setter",
    "attack-type-modal": "type",
    "block-number-modal": "block",
  }[id];
  return !!attackShortcutStore.getSnapshot()[kind];
}
function publishAttackSetterOptions(scope, setterIndex) {
  const players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    liberos = new Set(getLiberosForScope(scope));
  const shaped = ensureCourtShapeFor(
      scope === "opponent" ? state.opponentCourt : state.court,
    ),
    inCourt = new Set();
  shaped.forEach((slot) => {
    if (slot.main) inCourt.add(slot.main);
    if (slot.replaced) inCourt.add(slot.replaced);
  });
  if (document.body.dataset.activeTab === "video")
    liberos.forEach((name) => {
      if (name) inCourt.add(name);
    });
  const options = [
    Object.freeze({ index: null, label: "—", className: "base-modal-btn" }),
  ];
  players.forEach((name, index) => {
    if (!inCourt.has(name)) return;
    options.push(
      Object.freeze({
        index,
        label:
          (scope === "opponent"
            ? formatNameWithNumberFor(name, numbers)
            : formatNameWithNumber(name)) ||
          name ||
          "Giocatrice " + (index + 1),
        className:
          "base-modal-btn" +
          (liberos.has(name) ? " player-role-libero" : "") +
          (isSetterPlayerForScope(scope, index) ? " player-role-setter" : "") +
          (index === setterIndex ? " active" : ""),
      }),
    );
  });
  attackShortcutStore.publish({ setters: Object.freeze(options) });
}

function closeManagedPlayersPaste() {
  pastePlayersStore.publish({ open: false });
  if (teamEditorStore.getSnapshot().open) return;
  setGlobalModalState(false);
}
function applyManagedPlayersPaste(mode) {
  if (applyPlayersFromTextarea({ mode })) {
    closeManagedPlayersPaste();
    pastePlayersStore.publish({ text: "" });
  }
}
function publishCamp3ConfirmView(draft) {
  const map = (row) =>
    Object.freeze({
      ...row,
      kind: getCamp3RowKind(row),
      onRemove: () => {
        row.enabled = false;
        publishCamp3ConfirmView(draft);
      },
      onChange: (field, value) => {
        if (
          !["number", "lastName", "firstName", "role", "isCaptain"].includes(
            field,
          )
        )
          return;
        if (field === "isCaptain" && value)
          (draft.rows || []).forEach((other) => {
            if (other) other.isCaptain = other.id === row.id;
          });
        else row[field] = value;
        publishCamp3ConfirmView(draft);
      },
    });
  camp3ConfirmStore.publish({
    rows: Object.freeze(
      (draft.rows || []).filter((row) => row && row.enabled).map(map),
    ),
    outRows: Object.freeze(
      (draft.outRows || []).filter((row) => row && row.enabled).map(map),
    ),
  });
}
function setCamp3ConfirmOpen(open) {
  camp3ConfirmStore.publish({ open });
}

function publishPlayerPhotoView() {
  const model = playerPhotoEditorState;
  playerPhotoStore.publish({
    source: model.sourceUrl,
    zoom: model.zoom,
    allowRemove: model.allowRemove,
    transform: model.image
      ? `translate(calc(-50% + ${model.offsetX}px), calc(-50% + ${model.offsetY}px)) scale(${model.baseScale * model.zoom})`
      : "",
  });
}
function setReactPlayerPhotoOpen(open, options = {}) {
  publishPlayerPhotoView();
  playerPhotoStore.publish({ open, maxZoom: options.maxZoom || 3 });
}

function openReactVideoEdit(kind) {
  let rows;
  if (kind === "offset")
    rows = [
      ...SKILLS.map((skill) => ({
        id: skill.id,
        label: skill.label,
        value: "0",
      })),
      { id: "__manual_error__", label: "Errori (manuale)", value: "0" },
    ];
  if (kind === "duration")
    rows = SKILLS.map((skill) => {
      const value = state.skillDurationLastApplied?.[skill.id];
      return {
        id: skill.id,
        label: skill.label,
        value: String(
          typeof value === "number" && isFinite(value) && value > 0
            ? value
            : getDefaultSkillDurationMs(),
        ),
      };
    });
  if (kind === "unify")
    rows = LINK_TIME_OPTIONS.map((option) => ({
      id: option.type,
      label: option.label,
      enabled: true,
      value: option.source.id,
      options: Object.freeze([option.source, option.target]),
    }));
  videoEditStore.publish(kind, {
    open: true,
    rows: Object.freeze(rows.map((row) => Object.freeze(row))),
  });
  setGlobalModalState(true);
}
function closeReactVideoEdit(kind) {
  videoEditStore.publish(kind, { open: false });
  setGlobalModalState(false);
}
function readVideoEditInputs(kind) {
  return videoEditStore.getSnapshot()[kind].rows.map((row) => ({
    dataset: { skillId: row.id, linkType: row.id },
    value: row.value,
    checked: row.enabled,
  }));
}

function publishReactSettings() {
  const values = {};
  [
    "autoRotate",
    "autoRolePositioning",
    "autoRoleP1American",
    "attackTrajectoryEnabled",
    "attackTrajectorySimplified",
    "predictiveSkillFlow",
    "autoLiberoRole",
  ].forEach((field) => {
    values[field] = state[field];
  });
  values.autoLiberoRole = getTeamAutoLiberoRole("our");
  settingsStore.publish({ values: Object.freeze(values) });
}
function setReactSettingsOpen(open) {
  publishReactSettings();
  settingsStore.publish({ open });
}
function changeReactSetting(field, value) {
  if (field === "autoRotate") setAutoRotateEnabled(!!value);
  else if (field === "autoRolePositioning") {
    setAutoRolePositioning(!!value);
    if (value) applyAutoRolePositioning();
  } else if (field === "autoRoleP1American") setAutoRoleP1American(!!value);
  else if (field === "autoLiberoRole") setAutoLiberoRole(value, "our");
  else if (
    [
      "attackTrajectoryEnabled",
      "attackTrajectorySimplified",
      "predictiveSkillFlow",
    ].includes(field)
  ) {
    state[field] = !!value;
    if (field === "predictiveSkillFlow" && !value)
      state.skillFlowOverride = null;
    saveState();
    if (field === "predictiveSkillFlow") renderPlayers();
  } else return;
  publishReactSettings();
  const inlineIds = {
    autoRotate: "auto-rotate-toggle",
    autoRolePositioning: "auto-role-toggle",
    autoRoleP1American: "auto-role-p1american-toggle",
    attackTrajectoryEnabled: "attack-trajectory-toggle",
    attackTrajectorySimplified: "attack-trajectory-simple-toggle",
    predictiveSkillFlow: "predictive-skill-toggle",
  };
  const control = document.getElementById(inlineIds[field]);
  if (control && control.dataset.reactManaged !== "true")
    control.checked = !!state[field];
}

function buildReactBulkControl(ev, key, context) {
  const empty = { value: "", label: "—" };
  const options = (list) => [
    empty,
    ...list.map((item) =>
      typeof item === "string"
        ? { value: item, label: item }
        : {
            value: String(item.value),
            label: item.label || String(item.value),
          },
    ),
  ];
  const select = (value, list, change) => ({
    type: "select",
    value: String(value ?? ""),
    options: list,
    onChange: change,
  });
  const simple = (field) => (value) => {
    ev[field] = value || null;
  };
  const numericFields = {
    set: [1, 5],
    rotation: [1, 6],
    zone: [1, 6],
    setterPosition: [1, 6],
    opponentSetterPosition: [1, 6],
    receivePosition: [1, 6],
  };
  if (numericFields[key]) {
    const [min, max] = numericFields[key];
    return select(
      ev[key],
      options(
        Array.from({ length: max - min + 1 }, (_, index) =>
          String(min + index),
        ),
      ),
      (value) => {
        const n = parseInt(value, 10);
        if (!isNaN(n) && n >= min && n <= max) ev[key] = n;
      },
    );
  }
  if (["player", "setter", "playerIn", "playerOut"].includes(key)) {
    const scope = getTeamScopeFromEvent(ev),
      players = getPlayersForScope(scope),
      numbers = getPlayerNumbersForScope(scope);
    const names = ["playerIn", "playerOut"].includes(key),
      setter = key === "setter";
    const index = setter
      ? typeof ev.setterIdx === "number"
        ? ev.setterIdx
        : typeof ev.setterName === "string"
          ? players.indexOf(ev.setterName)
          : -1
      : resolvePlayerIdx(ev);
    return select(
      names ? ev[key] : index >= 0 ? index : "",
      [
        empty,
        ...players.map((name, index) => ({
          value: names ? name : String(index),
          label:
            scope === "opponent" || names
              ? formatNameWithNumberFor(name, numbers)
              : formatNameWithNumber(name),
        })),
      ],
      (value) => {
        if (names) {
          ev[key] = value || null;
          return;
        }
        const index = parseInt(value, 10);
        if (!value) {
          if (setter) {
            ev.setterIdx = null;
            ev.setterName = null;
          } else {
            ev.playerIdx = null;
            ev.playerName = null;
            ev.playerId = null;
          }
          return;
        }
        if (!isNaN(index) && players[index]) {
          if (setter) {
            ev.setterIdx = index;
            ev.setterName = players[index];
          } else {
            ev.playerIdx = index;
            ev.playerName = players[index];
            ev.playerId = getPlayerIdForScope(scope, index, players[index]);
          }
        }
      },
    );
  }
  if (key === "skill")
    return select(
      ev.skillId || SKILLS[0]?.id || "",
      SKILLS.concat([{ id: "manual", label: "Manuale" }]).map((skill) => ({
        value: skill.id,
        label: skill.label,
      })),
      (value) => {
        if (value) {
          ev.skillId = value;
          if (value !== "manual") ev.pointDirection = null;
        }
      },
    );
  if (key === "code") {
    const codes =
      ev.skillId === "manual"
        ? [
            "for",
            "against",
            "error",
            "team-error",
            "opp-point",
            "opp-error",
            "freeball",
          ]
        : RESULT_CODES;
    return select(
      ev.code || codes[0],
      codes.map((code) => ({ value: code, label: code })),
      (value) => {
        ev.code = value;
        syncManualEventPointDirection(ev);
      },
    );
  }
  if (key === "base")
    return select(ev.base, options(DEFAULT_BASE_OPTIONS), simple("base"));
  if (key === "setType") {
    const list = DEFAULT_SET_TYPE_OPTIONS.some(
      (option) => String(option.value).toLowerCase() === "damp",
    )
      ? DEFAULT_SET_TYPE_OPTIONS
      : DEFAULT_SET_TYPE_OPTIONS.concat([{ value: "Damp", label: "Damp" }]);
    return select(ev.setType, options(list), simple("setType"));
  }
  if (key === "serveType")
    return select(ev.serveType, options(["F", "JF", "S"]), simple("serveType"));
  if (["receiveEvaluation", "attackEvaluation"].includes(key))
    return select(
      ev[key],
      options(
        key === "receiveEvaluation"
          ? RESULT_CODES.concat(["FB"])
          : RESULT_CODES,
      ),
      simple(key),
    );
  if (key === "attackBp")
    return select(
      normalizePhaseValue(ev.attackBp) || "bp",
      DEFAULT_PHASE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label || option.value,
      })),
      (value) => {
        ev.attackBp = value === "bp";
      },
    );
  if (key === "videoTime") {
    const time = Math.max(
      0,
      ev.t
        ? computeEventVideoTime(
            ev,
            typeof context.baseMs === "number" ? context.baseMs : null,
          )
        : 0,
    );
    return {
      type: "time",
      value: [
        String(Math.floor(time / 3600)),
        String(Math.floor((time % 3600) / 60)),
        String(Math.floor(time % 60)),
      ],
      onChange: (parts) => {
        ev.videoTime = parts.reduce(
          (total, value, index) =>
            total +
            Math.max(0, parseInt(value || "0", 10) || 0) * [3600, 60, 1][index],
          0,
        );
      },
    };
  }
  if (["blockNumber", "durationMs"].includes(key))
    return {
      type: "number",
      min: 0,
      value: String(ev[key] ?? ""),
      onChange: (value) => {
        const n = parseFloat(value);
        if (Number.isFinite(n) && n >= 0) ev[key] = n;
      },
    };
  return {
    type: "text",
    value: valueToString(ev[key]),
    onChange: (value) => {
      ev[key] = parseInputValue(value);
    },
  };
}
function openReactBulkEditor(config, proxy, events, context, key) {
  bulkEditStore.publish({
    open: true,
    title: "Modifica multipla: " + config.label,
    hint: "Applica a " + events.length + " skill selezionate.",
    control: Object.freeze(buildReactBulkControl(proxy, key, context)),
  });
  setModalOpenState(true);
}
function closeReactBulkEditor() {
  bulkEditStore.publish({ open: false, control: null, hint: "" });
}

function openReactVideoScore(home, away) {
  videoScoreStore.publish({
    open: true,
    home: String(home),
    away: String(away),
  });
  setModalOpenState(true);
}
function closeReactVideoScore() {
  videoScoreStore.publish({ open: false });
}

function chooseReactFfmpegEncoder() {
  return new Promise((resolve) => {
    let settled = false;
    ffmpegEncoderStore.publish({
      open: true,
      choose: (choice) => {
        if (settled) return;
        settled = true;
        ffmpegEncoderStore.publish({ open: false, choose: null });
        setModalOpenState(false);
        resolve(choice);
      },
    });
    setModalOpenState(true);
  });
}
function loadReactMobileYoutube() {
  const url = mobileVideoSourceStore.getSnapshot().url,
    id = parseYoutubeId(url);
  if (!id) {
    alert("Inserisci un link YouTube valido.");
    return;
  }
  handleYoutubeUrlLoad(url);
}
function openReactLocalVideoPicker() {
  return openLocalVideoPicker(elVideoFileInput);
}

function publishReactAggregatedScore(summary, scope, options = {}) {
  const score =
    summary ||
    computePointsSummary(null, { teamScope: scope, events: options.events });
  updateSetScoreDisplays();
  const data = computeSetScores(scope, { events: options.events });
  aggregatedScoreStore.publish({
    label: score.totalFor + " - " + score.totalAgainst,
    sets: (data.sets || []).map((set) => ({
      key: set.set,
      label: `S${set.set}: ${set.for}-${set.against}`,
    })),
  });
}
function toggleReactTopbar() {
  state.uiTopBarHidden = !state.uiTopBarHidden;
  applyTopBarVisibility();
  saveState({ persistLocal: true });
}
function syncReactDebugLog() {
  forceSyncDataFromLog();
  alert("Dati riallineati dal log.");
}
function backfillReactPlayerIds() {
  if (confirm("Scrivere gli ID giocatrici in tutti i match salvati?"))
    backfillPlayerIdsInSavedMatches();
}
