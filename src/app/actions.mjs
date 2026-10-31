import { updateNextSetOption } from "../features/live/next-set-model.js";
import { saveCurrentVideoFrame } from "../features/video/playback.js";
import { downloadVideoFromSelection } from "../features/video/clip-commands.js";
import { deleteEventByKey, undoLastEvent } from "../features/events/history-commands.js";
import { runAnalysisFilterAction } from "../features/analysis/analysis-filters.js";
import { runScoutSkillAction } from "../features/scout/skill-actions.js";
import { openReactAggregatedSkill, openReactAggregatedPlayer, showAggregatedSummary, openAggregatedSetStart } from "../features/analysis/summary-commands.js";
import { publishApplicationViews } from "./view-publication.js";
import { openPlayerPhotoEditor, closePlayerPhotoEditor, renderPlayerPhotoEditor, exportPlayerPhotoDataUrl, handlePlayerPhotoPointerDown, handlePlayerPhotoPointerMove, handlePlayerPhotoPointerUp } from "../features/players/photo-editor.js";
import { session as photoState } from "../features/state/players-photo-editor.js";
import { createCommands, createReadyEvents } from "./commands.mjs";
import { PLAYER_PHOTO_REMOVE_RESULT, session as matchState, logError } from "../../js/globals.js";
import { submitReactMatchDialog } from "../features/teams/match-dialog-commands.js";
import { mergeManagedTeams } from "../features/teams/manager-commands.js";
import { publishNextSetView, renderNextSetLineups } from "../features/live/next-set-view.js";
import { setNextSetPreferredLibero } from "../features/live/next-set-commands.js";
import { selectAttributionErrorType, applyAttribution } from "../features/scout/attribution-commands.js";
import { closeManagedPlayersPaste, applyManagedPlayersPaste } from "../features/teams/paste-commands.js";
import { changeReactSetting } from "../features/settings/commands.js";
import { loadReactMobileYoutube, openReactLocalVideoPicker } from "../features/video/source-commands.js";
import { toggleReactTopbar, syncReactDebugLog, backfillReactPlayerIds, runReactAppAction, openReactMatchFilePicker, changeReactScoutDrawer } from "./app-actions.js";
import { recordReactFloatingServeError, changeReactSetType, changeReactOpponentSkill, resizeReactPanel } from "../features/archive/database-controls.js";
import { handleImportDatabaseFile, handleImportMatchFile } from "../features/io/file-and-url-import.js";
import { applyDvwScoutInput, queueCurrentDvwScoutToken, openDvwScoutHelp } from "../features/io/datavolley-live-entry.js";
import { clearReactDvwEntry, removeReactDvwToken, changeReactDvwText } from "../features/scout/code-entry.js";
import { rotateCourt, rotateOpponentCourt, setRotation, setOpponentRotation, openSettingsModal, closeSettingsModal, setCurrentSet, handleCourtDragStart, handleBenchDragStart, handleBenchDragEnd, handleBenchPointerDown, handleBenchTouchStart, handleCourtDragEnd, handlePositionDragOver, handlePositionDragLeave, handlePositionDrop } from "../features/teams/court/court-ui-bootstrap.js";
import { animateFlip } from "../features/layout/animation.js";
import { setAutoLiberoRole, swapPreferredLiberoForScope, swapPreferredLibero } from "../features/teams/court/court-engine.js";
import { publishReactSettings } from "../features/settings/view.js";
import { forceNextSkill } from "../features/live/trajectories.js";
import { openAttackTrajectoryModal, closeAttackTrajectoryModal, chooseReactTrajectoryNetPoint, handleReactTrajectoryPointer, setServeTypeSelection } from "../features/scout/trajectory-dialog.js";
import { resizeTrajectoryCanvas } from "../features/scout/trajectory-canvas.js";
import { triggerFreeballFlow } from "../features/live/event-recording.js";
import { handleOpponentFreeballSingle, handleManualScore, endMatch } from "../features/live/live-score-and-set.js";
import { saveState } from "../features/storage/save-state.js";
import { applyTheme } from "../features/teams/core/state-store.js";
import { syncCourtSideLayout, renderPlayers } from "../features/live/team-rendering.js";
import { handleVideoFileChange, syncFirstSkillToVideo, openVideoMobileFilters, closeVideoMobileFilters, selectVideoMobileEvent, closeVideoMobileSourceModal, openVideoMobileSourceModal } from "../features/video/playback.js";
import { handleYoutubeUrlLoad, clearLoadedVideo, undoLastVideoEdit } from "../features/video/video-sources.js";
import { addEmptyVideoEventAfterSelection, openVideoScoreModal, closeVideoScoreModal, correctVideoScoresFromSelection, openOffsetModal, closeOffsetModal, applyOffsetsToSelectedSkills, openSkillDurationModal, closeSkillDurationModal, applySkillDurationDefaults, openUnifyTimesModal, closeUnifyTimesModal, applyUnifyTimes, recordTimeoutEvent, recordOpponentTimeoutEvent, recordSubstitutionEvent } from "../features/video/video-events.js";
import { stepActiveVideoByFrame } from "../features/live/scout-shortcuts.js";
import { applyReactVideoMobileFilters, changeReactVideoPlayByPlay, openReactVideoPicker } from "../features/video/view-commands.js";
import { openDebugModal, closeDebugModal, closePlayersDbModal, removeOrphanPlayersFromDb, openBaseModal, openAttackSetterModal, openAttackTypeModal, openBlockNumberModal, resetAttackShortcutModals, applyBaseToTarget, applySetterToTarget, applyAttackTypeToTarget, applyBlockNumberToTarget, openTeamsManagerModal, closeTeamsManagerModal, openPlayersDbModal, importTeamToStorageOnly, renderTeamsManagerList } from "../features/live/team-management.js";
import { forceRefreshAppAssets, setActiveTab, navigateToTab, setActiveAggTab } from "../features/core/app-lifecycle.js";
import { enterSelectedMatch, exitCurrentMatch, exportCurrentTeamToFile, deleteSelectedMatch, createNewMatchFromPrompt, openNewMatchModal, closeNewMatchModal, createNewMatchFromSetup, loadSelectedMatch } from "../features/teams/storage/archive-actions.js";
import { applyDefaultLineupToModal, changeLineupPreferredLibero, applyNumberToLineupSlot, exitLineupNumberMode, openMobileLineupModal, closeLineupModal, saveLineupModal, renderLineupModal, assignPlayerToLineup, clearLineupSlot, swapLineupSlots, openSetStartEditor, closeSetStartModal, applySetStartDraft, updateSetStartSelection, renderSetStartModal, handleLineupTouchStart } from "../features/live/lineup-editor.js";
import { refreshReactCompareSections } from "../features/analysis/player-view.js";
import { changeReactPlayerAnalysis } from "../features/analysis/player-commands.js";
import { selectReactSetTrendPoint, changeReactPlayByPlaySet } from "../features/analysis/timeline-commands.js";
import { toggleMetricAssignment, togglePointRule, toggleActiveCode, toggleSkillEnabled } from "../features/teams/settings/metrics-editor.js";
import { changeReactMatchSheetFilter, changeReactMatchSheetNote } from "../features/analysis/match-sheet-commands.js";
import { openReactMultiscout, closeReactMultiscout, changeReactMultiscoutScope, resetReactMultiscout } from "../features/analysis/multiscout-commands.js";
import { applyReactVideoPreset, renameReactVideoPreset, removeReactVideoPreset, reorderReactVideoPresets, saveCurrentVideoFilterPreset } from "../features/analysis/video-preset-commands.js";
import { openAggSkillModal, closeAggSkillModal } from "../features/analysis/skill-tables.js";
import { changeReactChartMetric } from "../features/analysis/chart-commands.js";
import { closeBulkEditModal, openBulkEditModal, applyBulkEditSession } from "../features/video/event-editor.js";
import { showCamp3ImportConfirm, closeCamp3ConfirmModal, importCamp3IntoTeamManager } from "../features/teams/imports/camp3-import.js";
import { mergeManagedPlayersDb, editPlayersDbPhoto } from "../features/players/database-commands.js";
import { addManagedTeamPlayer, duplicateManagedTeamPlayers, generateManagedTeamTemplate, openManagedPlayersPaste, openSelectedManagedTeam, deleteSelectedManagedTeam, duplicateSelectedManagedTeam, exportSelectedManagedTeam, createManagedTeam } from "../features/core/bindings-roster.js";
import { openTeamManagerModal, openNewTeamManager, closeTeamManagerModal, saveTeamManagerPayload, handleDefaultLineupTouchStart, finalizeDefaultLineupTouch } from "../features/teams/editor/team-editor.js";
import { openSkillModal, openSkillCodesModal, cancelSkillModalFlow, openErrorModal, openPointModal, closeErrorModal, closePointModal } from "../features/live/live-entry.js";
import { closeSkillModal } from "../features/scout/skill-modal-state.js";
import { updateVideoPlaybackSnapshot } from "../features/video/media-state.js";
import { openNextSetLineupModal, closeNextSetModal, applyNextSetDraft, setNextSetRotation, rotateNextSetCourt, openNextSetModal } from "../features/live/next-set-lineups.js";
import { setNextSetPlayer, clearNextSetSlot, swapNextSetSlots, updateNextSetEntry } from "../features/live/next-set-model.js";
import { getRawDefaultStartForScope } from "../features/teams/set-start-model.js";
import { getCourtShape } from "../features/teams/court-model.js";
import { session as scoutUiState } from "../features/state/scout-ui.js";
import { listTeamsFromStorage } from "../features/teams/storage/team-repository.js";
import { selectArchivedMatch } from "../features/core/runtime-view.js";
import { applyImportedMatch } from "../features/io/match-io.js";
import { exportMatchToFile } from "../features/io/exports.js";
import { exportDataVolleyToFile } from "../features/io/datavolley-export.js";
import { exportAnalysisHtml } from "../features/analysis/reports.js";
import { session as persistentStorageState } from "../features/state/storage-persistent-storage.js";
import { editEventTrajectory, editEventCell, finishEventCellEdit, seekEventTableRow, toggleEventTableRow, selectEventTableRow, selectAllEventTableRows, handleEventTableHeader, bindReactEventTable, registerReactEventEdit } from "../features/events/table-commands.js";
import { copySkillChartImageToClipboard } from "../features/analysis/skill-analysis.js";
import { handleScoutWidgetPointerDown, moveScoutWidgetWithKeyboard } from "../features/live/workspace-layout.js";
import { session as application } from "./lifecycle.js";

export const actions = createCommands({
  openReactAggregatedSkill, openReactAggregatedPlayer, showAggregatedSummary, openAggregatedSetStart,
  recordReactFloatingServeError,
  changeReactSetType,
  changeReactOpponentSkill,
  handleImportDatabaseFile,
  applyDvwScoutInput,
  clearReactDvwEntry,
  removeReactDvwToken,
  handleImportMatchFile,
  rotateCourt,
  rotateOpponentCourt,
  setRotation,
  setOpponentRotation,
  setAutoLiberoRole,
  swapPreferredLiberoForScope,
  forceNextSkill,
  triggerFreeballFlow,
  handleOpponentFreeballSingle,
  toggleReactCourtSide: () => {
    matchState.state.courtSideSwapped = !matchState.state.courtSideSwapped;
    matchState.state.courtViewMirrored = !!matchState.state.courtSideSwapped;
    matchState.state.opponentCourtViewMirrored = !matchState.state.courtSideSwapped;
    saveState({ persistLocal: true });
    syncCourtSideLayout();
    renderPlayers();
  },
  handleVideoFileChange,
  handleYoutubeUrlLoad,
  clearLoadedVideo,
  syncFirstSkillToVideo,
  downloadVideoFromSelection,
  saveCurrentVideoFrame,
  stepActiveVideoByFrame,
  addEmptyVideoEventAfterSelection,
  openVideoMobileFilters,
  closeVideoMobileFilters,
  applyReactVideoMobileFilters,
  selectVideoMobileEvent,
  changeReactVideoPlayByPlay,
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
    publishReactSettings();
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
    photoState.playerPhotoEditorState.zoom = Number.isFinite(zoom) ? Math.max(1, zoom) : 1;
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
    scoutUiState.lineupNumberMode = !scoutUiState.lineupNumberMode;
    renderLineupModal();
  },
  changeLineupNumber: (index, value, exit = false) => {
    applyNumberToLineupSlot(index, value);
    if (exit) exitLineupNumberMode();
    else renderLineupModal();
  },
  selectLineupSlot: (index) => {
    if (scoutUiState.lineupNumberMode) return;
    if (scoutUiState.lineupSelectedName) {
      assignPlayerToLineup(scoutUiState.lineupSelectedName, index);
      scoutUiState.lineupSelectedName = "";
    } else if (getCourtShape(scoutUiState.lineupModalCourt)[index]?.main)
      clearLineupSlot(index);
    renderLineupModal();
  },
  clearManagedLineupSlot: (index) => {
    clearLineupSlot(index);
    renderLineupModal();
  },
  placeManagedLineupPlayer: (name, index) => {
    assignPlayerToLineup(name, index);
    scoutUiState.lineupSelectedName = "";
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
    if (!scoutUiState.setStartDraft) return;
    updateSetStartSelection(
      scoutUiState.setStartDraft.setNum,
      scoutUiState.setStartDraft.scope,
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
  changeNextSetOption: (key, value, relative = false) => {
    if (updateNextSetOption(key, value, relative)) publishNextSetView();
  },
  restoreNextSetDefaults: (scope) => {
    const defaults = getRawDefaultStartForScope(scope);
    if (!scoutUiState.nextSetDraft || !defaults) return;
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
    scoutUiState.teamsManagerSelectedName = listTeamsFromStorage().includes(name)
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
  prepareNextSet: () => openNextSetModal((matchState.state.currentSet || 1) + 1),
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
  exportMatchFromNavigation: () => {
    const navigation = document.getElementById("mobile-navigation");
    if (navigation) navigation.open = false;
    exportMatchToFile();
  },
  exportDataVolleyToFile,
  exportAnalysisHtml,
  flushStorage: () => persistentStorageState.archiveStorage.flush(),
}, publishApplicationViews);
export const events = createReadyEvents({
  deleteEventByKey,
  editEventTrajectory, editEventCell, finishEventCellEdit, seekEventTableRow, toggleEventTableRow, selectEventTableRow, selectAllEventTableRows, handleEventTableHeader,
  editPlayersDbPhoto,
  runAnalysisFilterAction,
  runScoutSkillAction,
  resizeReactPanel,
  changeReactDvwText,
  queueCurrentDvwScoutToken,
  openDvwScoutHelp,
  runReactAppAction,
  openReactMatchFilePicker,
  changeReactScoutDrawer,
  openReactVideoPicker,
  updateVideoPlaybackSnapshot,
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
  handleScoutWidgetPointerDown,
  moveScoutWidgetWithKeyboard,
  handleCourtDragStart,
  handleBenchDragStart,
  handleBenchDragEnd,
  handleBenchPointerDown,
  handleBenchTouchStart,
  handleCourtDragEnd,
  handlePositionDragOver,
  handlePositionDragLeave,
  handlePositionDrop,
  animateFlip,
}, () => application.ready);
