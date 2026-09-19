function renderChipList(container, names, lockedMap, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  const {
    isLiberoColumn = false,
    highlightLibero = false,
    emptyText = "Nessuna riserva disponibile.",
    replacedSet = new Set()
  } = options;
  if (!names || names.length === 0) {
    const span = document.createElement("span");
    span.className = "bench-empty";
    span.textContent = emptyText;
    container.appendChild(span);
    return;
  }
  const libSet = new Set(state.liberos || []);
  names.forEach(name => {
    const chip = document.createElement("div");
    const classes = ["bench-chip"];
    if (isLiberoColumn || (highlightLibero && libSet.has(name))) {
      classes.push("libero-flag");
    }
    if (replacedSet.has(name)) {
      classes.push("replaced-chip");
    }
    if (lockedMap[name] !== undefined) classes.push("bench-locked");
    chip.className = classes.join(" ");
    const isLiberoPlayer = libSet.has(name);
    const allowDirect = isLiberoColumn || isLiberoPlayer;
    chip.draggable = allowDirect;
    chip.dataset.playerName = name;
    const label = document.createElement("span");
    label.textContent =
      formatNameWithNumber(name) + (lockedMap[name] !== undefined ? " (sost. libero)" : "");
    chip.appendChild(label);
    if (allowDirect) {
      chip.addEventListener("dragstart", handleBenchDragStart);
      chip.addEventListener("dragend", handleBenchDragEnd);
      chip.addEventListener("click", () => handleBenchClick(name));
      chip.addEventListener("pointerdown", ev => handleBenchPointerDown(ev, name));
      chip.addEventListener("touchstart", ev => handleBenchTouchStart(ev, name), {
        passive: false
      });
      chip.addEventListener("touchmove", handleBenchTouchMove, { passive: false });
      chip.addEventListener("touchend", handleBenchTouchEnd, { passive: false });
      chip.addEventListener("touchcancel", handleBenchTouchCancel, { passive: false });
    } else {
      chip.title = "Usa Imposta formazione per cambiare le titolari.";
      chip.setAttribute("aria-disabled", "true");
    }
    container.appendChild(chip);
  });
}
const elMetricsConfig = document.getElementById("metrics-config");
const elBtnResetMetrics = document.getElementById("btn-reset-metrics");
const elBtnResetCodes = document.getElementById("btn-reset-codes");
const elBtnResetPoints = document.getElementById("btn-reset-points");
let activeDropChip = null;
let draggedPlayerName = "";
let draggedFromPos = null;
let dragSourceType = "";
let draggedScope = "our";
let benchDropZoneInitialized = false;
let touchBenchName = "";
let touchBenchScope = "our";
let touchBenchOverPos = -1;
let touchBenchGhost = null;
let touchBenchStart = { x: 0, y: 0 };
let benchTouchListenersAttached = false;
let touchBenchPointerId = null;
const BASE_ROLES = ["P", "S1", "C2", "O", "S2", "C1"];
const FRONT_ROW_INDEXES = new Set([1, 2, 3]); // pos2, pos3, pos4
const BACK_ROW_INDEXES = new Set([0, 4, 5]); // pos1, pos5, pos6
const AUTO_LIBERO_ROLE_OPTIONS = ["", "P", "S", "C", "O"];
let isLoadingMatch = false;
if (typeof window !== "undefined" && typeof window.isLoadingMatch !== "undefined") {
  isLoadingMatch = !!window.isLoadingMatch;
}
const lineupCore =
  (typeof window !== "undefined" && window.VolleyEye && window.VolleyEye.lineup) || null;
const autoRoleCore =
  (typeof window !== "undefined" &&
    window.VolleyEye &&
    window.VolleyEye.autoRole &&
    typeof window.VolleyEye.autoRole.createAutoRole === "function" &&
    window.VolleyEye.autoRole.createAutoRole({
      // Keep the dependency lazy: the court engine is loaded by the next
      // classic script; the auto-role engine calls it only after bootstrap.
      ensureCourtShapeFor: court => ensureCourtShapeFor(court),
      frontRowIndexes: FRONT_ROW_INDEXES,
      baseRoles: BASE_ROLES
    })) ||
  null;
const buildAutoRolePermutation =
  (autoRoleCore && autoRoleCore.buildAutoRolePermutation) || (() => []);
const applyPhasePermutation =
  (autoRoleCore && autoRoleCore.applyPhasePermutation) || (() => []);
const elEventsLog = document.getElementById("events-log");
const elEventsLogSummary = document.getElementById("events-log-summary");
const elBtnApplyPlayers = document.getElementById("btn-apply-players");
const elBtnApplyOpponentPlayers = document.getElementById("btn-apply-opponent-players");
const elOpponentPlayersInput = document.getElementById("opponent-players-input");
const elOpponentPlayersList = document.getElementById("opponent-players-list");
const elNewOpponentPlayerInput = document.getElementById("new-opponent-player-name");
const elBtnAddOpponentPlayer = document.getElementById("btn-add-opponent-player");
const elBtnClearOpponentPlayers = document.getElementById("btn-clear-opponent-players");
const elOpponentTeamsSelect = document.getElementById("saved-opponent-teams");
const elBtnSaveOpponentTeam = document.getElementById("btn-save-opponent-team");
const elBtnDeleteOpponentTeam = document.getElementById("btn-delete-opponent-team");
const elBtnRenameOpponentTeam = document.getElementById("btn-rename-opponent-team");
const elBtnExportOpponentTeam = document.getElementById("btn-export-opponent-team");
const elBtnImportOpponentTeam = document.getElementById("btn-import-opponent-team");
const elOpponentTeamFileInput = document.getElementById("opponent-team-file-input");
const elBtnOpenOpponentTeamManager = document.getElementById("btn-open-opponent-team-manager");
const elOpponentLiberoTags = document.getElementById("opponent-libero-tags");
const elBtnExportPdf = document.getElementById("btn-export-pdf");
const elBtnExportHtml = document.getElementById("btn-export-html");
const elBtnResetMatch = document.getElementById("btn-reset-match");
const elBtnDeleteDemoData = document.getElementById("btn-delete-demo-data");
const elBtnResetApp = document.getElementById("btn-reset-app");
const elBtnExportMatch = document.getElementById("btn-export-match");
const elBtnExportDvw = document.getElementById("btn-export-dvw");
const elBtnImportMatch = document.getElementById("btn-import-match");
const elMatchFileInput = document.getElementById("match-file-input");
const elSavedMatchesSelect = document.getElementById("saved-matches");
const elSavedMatchesList = document.getElementById("saved-matches-list");
const elBtnLoadMatch = document.getElementById("btn-load-match");
const elBtnDeleteMatch = document.getElementById("btn-delete-match");
const elBtnNewMatch = document.getElementById("btn-new-match");
const elBtnOpenMatchManager = document.getElementById("btn-open-match-manager");
const elMatchManagerModal = document.getElementById("match-manager-modal");
const elMatchManagerClose = document.getElementById("match-manager-close");
const elBtnSaveMatchInfo = document.getElementById("btn-save-match-info");
const elMatchSummary = document.getElementById("match-summary");
const elBtnOpenTeamManager = document.getElementById("btn-open-team-manager");
const elTeamManagerModal = document.getElementById("team-manager-modal");
const elTeamManagerClose = document.getElementById("team-manager-close");
const elTeamManagerBody = document.getElementById("team-manager-body");
const elDefaultLineupGrid = document.getElementById("default-lineup-grid");
const elDefaultLineupBench = document.getElementById("default-lineup-bench");
const elDefaultLineupRotation = document.getElementById("default-lineup-rotation");
const elDefaultLineupRotateCw = document.getElementById("default-lineup-rotate-cw");
const elDefaultLineupRotateCcw = document.getElementById("default-lineup-rotate-ccw");
const elDefaultLineupPreferredLibero = document.getElementById("default-lineup-preferred-libero");
let defaultLineupDragName = "";
let defaultLineupDragAt = 0;
let defaultLineupTouchName = "";
let defaultLineupTouchFromIdx = null;
let defaultLineupTouchOverIdx = -1;
let defaultLineupTouchStart = { x: 0, y: 0 };
let defaultLineupTouchListenersAttached = false;
let defaultLineupTouchGhost = null;
const elTeamManagerAdd = document.getElementById("team-manager-add");
const elTeamManagerSave = document.getElementById("team-manager-save");
const elTeamManagerCancel = document.getElementById("team-manager-cancel");
const elBtnImportCamp3 = document.getElementById("btn-import-camp3");
const elCamp3FileInput = document.getElementById("camp3-file-input");
const elCamp3ConfirmModal = document.getElementById("camp3-confirm-modal");
const elCamp3ConfirmSummary = document.getElementById("camp3-confirm-summary");
const elCamp3ConfirmClose = document.getElementById("camp3-confirm-close");
const elCamp3ConfirmCancel = document.getElementById("camp3-confirm-cancel");
const elCamp3ConfirmApply = document.getElementById("camp3-confirm-apply");
const elTeamMetaName = document.getElementById("team-meta-name");
const elTeamMetaHead = document.getElementById("team-meta-head");
const elTeamMetaAssistant = document.getElementById("team-meta-assistant");
const elTeamMetaManager = document.getElementById("team-meta-manager");
const elTeamManagerLiveNote = document.getElementById("team-manager-live-note");
const elTeamManagerDup = document.getElementById("team-manager-duplicate");
const elTeamManagerTemplate = document.getElementById("team-manager-template");
const elTeamManagerDialog = document.querySelector("#team-manager-modal .team-modal__dialog");
const DEFAULT_STAFF = { headCoach: "", assistantCoach: "", manager: "" };
let teamManagerState = null;
let teamManagerScope = "our";
let teamManagerLiveEditMode = false;
let teamManagerStorageOnly = false;
if (elDefaultLineupRotateCw) {
  elDefaultLineupRotateCw.addEventListener("click", () => rotateDefaultLineup("cw"));
}
if (elDefaultLineupRotateCcw) {
  elDefaultLineupRotateCcw.addEventListener("click", () => rotateDefaultLineup("ccw"));
}
const elBtnExportDb = document.getElementById("btn-export-db");
const elBtnImportDb = document.getElementById("btn-import-db");
const elDbFileInput = document.getElementById("db-file-input");
const elImportJsonUrl = document.getElementById("import-json-url");
const elBtnImportMatchUrl = document.getElementById("btn-import-match-url");
const elBtnImportDbUrl = document.getElementById("btn-import-db-url");
const elBtnUndo = document.getElementById("btn-undo");
const elBtnOpenSettings = document.getElementById("btn-open-settings");
const elSettingsModal = document.getElementById("settings-modal");
const elSettingsClose = document.getElementById("settings-close");
const elAutoRotateToggle = document.getElementById("auto-rotate-toggle");
const elAutoRoleToggle = document.getElementById("auto-role-toggle");
const elAutoRoleP1AmericanToggle = document.getElementById("auto-role-p1american-toggle");
const elAutoRoleP1AmericanToggleOpp = document.getElementById("auto-role-p1american-toggle-opp");
const elAttackTrajectoryToggle = document.getElementById("attack-trajectory-toggle");
const elAttackTrajectoryToggleOpp = document.getElementById("attack-trajectory-toggle-opp");
const elPredictiveSkillToggle = document.getElementById("predictive-skill-toggle");
const elSkillFlowButtons = document.getElementById("skill-flow-buttons");
const elSkillFlowButtonsOpp = document.getElementById("skill-flow-buttons-opp");
const elAggTableBody = document.getElementById("agg-table-body");
const elAggSecondBody = document.getElementById("agg-second-body");
const elTrajectoryGrid = document.getElementById("trajectory-grid");
const elServeTrajectoryGrid = document.getElementById("serve-trajectory-grid");
const elPlayerAnalysisSelect = document.getElementById("player-analysis-select");
const elPlayerAnalysisCourtSide = document.getElementById("player-analysis-court-side");
const elPlayerAnalysisShowAttack = document.getElementById("player-analysis-show-attack");
const elPlayerAnalysisShowServe = document.getElementById("player-analysis-show-serve");
const elPlayerAnalysisShowSecond = document.getElementById("player-analysis-show-second");
const elPlayerAnalysisBody = document.getElementById("player-analysis-body");
const elPlayerAnalysisAttack = document.getElementById("player-analysis-attack");
const elPlayerAnalysisServe = document.getElementById("player-analysis-serve");
const elPlayerAnalysisSecond = document.getElementById("player-analysis-second");
const elPlayerTrajectoryGrid = document.getElementById("player-trajectory-grid");
const elPlayerServeTrajectoryGrid = document.getElementById("player-serve-trajectory-grid");
const elPlayerSecondBody = document.getElementById("player-second-body");
const elPlayerSecondDistribution = document.getElementById("player-second-distribution");
const elPlayerTrajFilterSets = document.getElementById("player-traj-filter-sets");
const elPlayerTrajFilterCodes = document.getElementById("player-traj-filter-codes");
const elPlayerTrajFilterSetTypes = document.getElementById("player-traj-filter-set-types");
const elPlayerTrajFilterBases = document.getElementById("player-traj-filter-bases");
const elPlayerTrajFilterPhases = document.getElementById("player-traj-filter-phases");
const elPlayerTrajFilterReceiveEvals = document.getElementById("player-traj-filter-receive-evals");
const elPlayerTrajFilterReceiveZones = document.getElementById("player-traj-filter-receive-zones");
const elPlayerTrajFilterPrev = document.getElementById("player-traj-filter-prev");
const elPlayerTrajFilterZones = document.getElementById("player-traj-filter-zones");
const elPlayerTrajFilterReset = document.getElementById("player-traj-filter-reset");
const elPlayerServeTrajFilterSets = document.getElementById("player-serve-traj-filter-sets");
const elPlayerServeTrajFilterCodes = document.getElementById("player-serve-traj-filter-codes");
const elPlayerServeTrajFilterSetTypes = document.getElementById("player-serve-traj-filter-set-types");
const elPlayerServeTrajFilterBases = document.getElementById("player-serve-traj-filter-bases");
const elPlayerServeTrajFilterPhases = document.getElementById("player-serve-traj-filter-phases");
const elPlayerServeTrajFilterReceiveEvals = document.getElementById("player-serve-traj-filter-receive-evals");
const elPlayerServeTrajFilterReceiveZones = document.getElementById("player-serve-traj-filter-receive-zones");
const elPlayerServeTrajFilterZones = document.getElementById("player-serve-traj-filter-zones");
const elPlayerServeTrajFilterReset = document.getElementById("player-serve-traj-filter-reset");
const elPlayerSecondFilterSetTypes = document.getElementById("player-second-filter-set-types");
const elPlayerSecondFilterBases = document.getElementById("player-second-filter-bases");
const elPlayerSecondFilterPhases = document.getElementById("player-second-filter-phases");
const elPlayerSecondFilterReceiveEvals = document.getElementById("player-second-filter-receive-evals");
const elPlayerSecondFilterReceiveZones = document.getElementById("player-second-filter-receive-zones");
const elPlayerSecondFilterSets = document.getElementById("player-second-filter-sets");
const elPlayerSecondFilterPrev = document.getElementById("player-second-filter-prev");
const elPlayerSecondFilterReset = document.getElementById("player-second-filter-reset");
const elTrajFilterSetters = document.getElementById("traj-filter-setters");
const elTrajFilterPlayers = document.getElementById("traj-filter-players");
const elTrajFilterSets = document.getElementById("traj-filter-sets");
const elTrajFilterCodes = document.getElementById("traj-filter-codes");
const elTrajFilterSetTypes = document.getElementById("traj-filter-set-types");
const elTrajFilterBases = document.getElementById("traj-filter-bases");
const elTrajFilterPhases = document.getElementById("traj-filter-phases");
const elTrajFilterReceiveEvals = document.getElementById("traj-filter-receive-evals");
const elTrajFilterReceiveZones = document.getElementById("traj-filter-receive-zones");
const elTrajFilterPrev = document.getElementById("traj-filter-prev");
const elTrajCourtSide = document.getElementById("traj-court-side");
const elTrajFilterZones = document.getElementById("traj-filter-zones");
const elTrajFilterReset = document.getElementById("traj-filter-reset");
const elServeTrajFilterPlayers = document.getElementById("serve-traj-filter-players");
const elServeTrajFilterSets = document.getElementById("serve-traj-filter-sets");
const elServeTrajFilterCodes = document.getElementById("serve-traj-filter-codes");
const elServeTrajFilterSetTypes = document.getElementById("serve-traj-filter-set-types");
const elServeTrajFilterBases = document.getElementById("serve-traj-filter-bases");
const elServeTrajFilterPhases = document.getElementById("serve-traj-filter-phases");
const elServeTrajFilterReceiveEvals = document.getElementById("serve-traj-filter-receive-evals");
const elServeTrajFilterReceiveZones = document.getElementById("serve-traj-filter-receive-zones");
const elServeTrajFilterZones = document.getElementById("serve-traj-filter-zones");
const elServeTrajCourtSide = document.getElementById("serve-traj-court-side");
const elServeTrajFilterReset = document.getElementById("serve-traj-filter-reset");
const elSecondFilterSetters = document.getElementById("second-filter-setters");
const elSecondFilterPlayers = document.getElementById("second-filter-players");
const elSecondFilterSetTypes = document.getElementById("second-filter-set-types");
const elSecondFilterBases = document.getElementById("second-filter-bases");
const elSecondFilterPhases = document.getElementById("second-filter-phases");
const elSecondFilterReceiveEvals = document.getElementById("second-filter-receive-evals");
const elSecondFilterReceiveZones = document.getElementById("second-filter-receive-zones");
const elSecondFilterCodes = document.getElementById("second-filter-codes");
const elSecondFilterZones = document.getElementById("second-filter-zones");
const elSecondFilterSets = document.getElementById("second-filter-sets");
const elSecondFilterPrev = document.getElementById("second-filter-prev");
const elSecondFilterReset = document.getElementById("second-filter-reset");
const elVideoFilters = document.getElementById("video-filters");
const elVideoFilterPlayers = document.getElementById("video-filter-players");
const elVideoFilterSkills = document.getElementById("video-filter-skills");
const elVideoFilterCodes = document.getElementById("video-filter-codes");
const elVideoFilterSets = document.getElementById("video-filter-sets");
const elVideoFilterRotations = document.getElementById("video-filter-rotations");
const elVideoFilterZones = document.getElementById("video-filter-zones");
const elVideoFilterBases = document.getElementById("video-filter-bases");
const elVideoFilterSetTypes = document.getElementById("video-filter-set-types");
const elVideoFilterPhases = document.getElementById("video-filter-phases");
const elVideoFilterReceiveEvals = document.getElementById("video-filter-receive-evals");
const elVideoFilterReceiveZones = document.getElementById("video-filter-receive-zones");
const elVideoFilterServeTypes = document.getElementById("video-filter-serve-types");
const elVideoFilterReset = document.getElementById("video-filter-reset");
const elRotationTableBody = document.getElementById("rotation-table-body");
const elLiveScore = document.getElementById("live-score");
const elLiveScoreModal = document.getElementById("live-score-modal");
const elAggScore = document.getElementById("agg-score");
const elAggSetCards = document.getElementById("agg-set-cards");
const elBtnScoreForPlus = document.getElementById("btn-score-for-plus");
const elBtnScoreForMinus = document.getElementById("btn-score-for-minus");
const elBtnScoreAgainstPlus = document.getElementById("btn-score-against-plus");
const elBtnScoreAgainstMinus = document.getElementById("btn-score-against-minus");
const elBtnScoreTeamError = document.getElementById("btn-score-team-error");
const elBtnScoreTeamPoint = document.getElementById("btn-score-team-point");
const elBtnScoreOppError = document.getElementById("btn-score-opp-error");
const elBtnScoreOppPoint = document.getElementById("btn-score-opp-point");
const elSingleTeamScoreActions = document.getElementById("single-team-score-actions");
const elBtnScoreOppErrorSingle = document.getElementById("btn-score-opp-error-single");
const elBtnScoreOppPointSingle = document.getElementById("btn-score-opp-point-single");
const elBtnNextSet = document.getElementById("btn-next-set");
const elBtnEndMatch = document.getElementById("btn-end-match");
const elBtnScoreForPlusModal = document.getElementById("btn-score-for-plus-modal");
const elBtnScoreForMinusModal = document.getElementById("btn-score-for-minus-modal");
const elBtnScoreAgainstPlusModal = document.getElementById("btn-score-against-plus-modal");
const elBtnScoreAgainstMinusModal = document.getElementById("btn-score-against-minus-modal");
const elBtnScoreTeamErrorModal = document.getElementById("btn-score-team-error-modal");
const elBtnScoreTeamPointModal = document.getElementById("btn-score-team-point-modal");
const elBtnNextSetModal = document.getElementById("btn-next-set-modal");
const elBtnEndMatchModal = document.getElementById("btn-end-match-modal");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
const elLogSection = document.querySelector("[data-log-section]");
const elAggTabButtons = document.querySelectorAll("[data-agg-tab-target]");
const elAggSubPanels = document.querySelectorAll("[data-agg-tab]");
let autoRolePhaseApplied = "";
let autoRoleRotationApplied = null;
let autoRoleBaseCourt = null;
let autoRoleRenderedCourt = null;
let opponentAutoRoleBaseCourt = null;
let activeTab = "info";
let activeAggTab = "summary";
