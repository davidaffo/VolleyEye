export const STORAGE_KEY = "volleyScoutV1";
export const MAX_TIMEOUTS_PER_SET = 2;
export const MAX_SUBSTITUTIONS_PER_SET = 8;
export const SKILLS = [
  { id: "serve", label: "Battuta", badgeClass: "badge-serve" },
  { id: "pass", label: "Ricezione", badgeClass: "badge-pass" },
  { id: "freeball", label: "Freeball", badgeClass: "badge-freeball" },
  { id: "second", label: "Alzata", badgeClass: "badge-second" },
  { id: "attack", label: "Attacco", badgeClass: "badge-attack" },
  { id: "defense", label: "Difesa", badgeClass: "badge-defense" },
  { id: "block", label: "Muro", badgeClass: "badge-block" }
];
export const SKILL_COLORS = {
  serve: { bg: "#1b5e20", text: "#d1fae5", soft: "rgba(27, 94, 32, 0.18)" },
  pass: { bg: "#f9a825", text: "#ffffff", soft: "rgba(249, 168, 37, 0.18)" },
  freeball: { bg: "#c026d3", text: "#fdf4ff", soft: "rgba(192, 38, 211, 0.18)" },
  second: { bg: "#00838f", text: "#ccfbf1", soft: "rgba(0, 131, 143, 0.18)" },
  attack: { bg: "#b71c1c", text: "#ffe4e6", soft: "rgba(183, 28, 28, 0.18)" },
  defense: { bg: "#546e7a", text: "#e2e8f0", soft: "rgba(84, 110, 122, 0.18)" },
  block: { bg: "#4a148c", text: "#ede9fe", soft: "rgba(74, 20, 140, 0.18)" }
};
export const THEME_TEXT = {
  dark: "#ffffff",
  light: "#0f172a"
};
export const RESULT_CODES = ["#", "+", "!", "-", "=", "/"];
export const PASS_LIKE_POINT_RULE_DEFAULT = { for: [], against: ["="] };
export const PASS_LIKE_METRIC_DEFAULT = {
  positive: ["#", "+"],
  negative: ["/", "="],
  activeCodes: RESULT_CODES,
  enabled: true
};
export const POINT_RULE_DEFAULTS = {
  serve: { for: ["#"], against: ["="] },
  pass: PASS_LIKE_POINT_RULE_DEFAULT,
  freeball: PASS_LIKE_POINT_RULE_DEFAULT,
  defense: { for: [], against: ["="] },
  attack: { for: ["#"], against: ["=", "/"] },
  block: { for: ["#"], against: ["/", "="] },
  second: { for: [], against: ["=", "/"] },
  manual: { for: ["for"], against: ["against", "error"] }
};
export const METRIC_DEFAULTS = {
  serve: { positive: ["#", "+", "!", "/"], negative: ["="], activeCodes: RESULT_CODES, enabled: true },
  pass: PASS_LIKE_METRIC_DEFAULT,
  freeball: PASS_LIKE_METRIC_DEFAULT,
  defense: { positive: ["#", "+", "!"], negative: ["="], activeCodes: RESULT_CODES, enabled: true },
  attack: { positive: ["#"], negative: ["/", "="], activeCodes: RESULT_CODES, enabled: true },
  block: {
    positive: ["#", "+"],
    negative: ["/", "="],
    activeCodes: RESULT_CODES.filter(code => code !== "!"),
    enabled: true
  },
  second: { positive: ["#"], negative: ["/", "-", "="], activeCodes: RESULT_CODES, enabled: true }
};
export const PERSISTENT_DB_NAME = "Data";
export const TEAM_STORE_NAME = "Teams";
export const TEAM_PREFIX = PERSISTENT_DB_NAME + "/" + TEAM_STORE_NAME + "/";
export const OPPONENT_TEAM_STORE_NAME = "OpponentTeams";
export const OPPONENT_TEAM_PREFIX = PERSISTENT_DB_NAME + "/" + OPPONENT_TEAM_STORE_NAME + "/";
export const PLAYER_STORE_NAME = "Players";
export const PLAYER_PREFIX = PERSISTENT_DB_NAME + "/" + PLAYER_STORE_NAME;
export const MATCH_STORE_NAME = "Matches";
export const MATCH_PREFIX = PERSISTENT_DB_NAME + "/" + MATCH_STORE_NAME + "/";
export const AUTO_LIBERO_ROLE_DEFAULT_VERSION = 1;
export const TEMPLATE_TEAM = {
  players: [
    "Palleggiatore 1",
    "Palleggiatore 2",
    "Schiacciatore 1",
    "Schiacciatore 2",
    "Schiacciatore 3",
    "Schiacciatore 4",
    "Opposto 1",
    "Opposto 2",
    "Centrale 1",
    "Centrale 2",
    "Centrale 3",
    "Centrale 4",
    "Libero 1",
    "Libero 2"
  ],
  liberos: ["Libero 1", "Libero 2"]
};
export const POSITIONS_META = [
  { id: 1, label: "Posizione 1 · P", gridArea: "pos1" },
  { id: 2, label: "Posizione 2 · S1", gridArea: "pos2" },
  { id: 3, label: "Posizione 3 · C2", gridArea: "pos3" },
  { id: 4, label: "Posizione 4 · O", gridArea: "pos4" },
  { id: 5, label: "Posizione 5 · S2", gridArea: "pos5" },
  { id: 6, label: "Posizione 6 · C1", gridArea: "pos6" }
];
export const PLAYER_PHOTO_REMOVE_RESULT = "__REMOVE_PLAYER_PHOTO__";
export const PLAYER_PHOTO_EXPORT_SIZE = 320;
import { createDomainState } from "../src/app/domain-state.mjs";

export const session = createDomainState({
"state": () => ({
  match: {
    opponent: "",
    category: "",
    date: "",
    notes: "",
    leg: "",
    matchType: ""
  },
  theme: "dark",
  currentSet: 1,
  players: [],
  isServing: false,
  autoRolePositioning: true,
  captains: [],
  playerNumbers: {},
  events: [],
  stats: {},
  court: [{ main: "" }, { main: "" }, { main: "" }, { main: "" }, { main: "" }, { main: "" }],
  rotation: 1,
  liberos: [],
  liberoAutoMap: {},
  autoLiberoRole: "C",
  autoLiberoRoleDefaultVersion: AUTO_LIBERO_ROLE_DEFAULT_VERSION,
  preferredLibero: "",
  playersDb: {},
  savedTeams: {},
  savedOpponentTeams: {},
  savedMatches: {},
  selectedTeam: "",
  selectedOpponentTeam: "",
  selectedMatch: "",
  opponentPlayers: [],
  opponentPlayerNumbers: {},
  opponentLiberos: [],
  opponentCaptains: [],
  opponentCourt: [],
  opponentRotation: 1,
  opponentCourtViewMirrored: false,
  opponentAutoRoleP1American: false,
  opponentAttackTrajectoryEnabled: true,
  opponentServeTrajectoryEnabled: true,
  opponentSetTypePromptEnabled: true,
  opponentAutoLiberoBackline: true,
  opponentAutoLiberoRole: "C",
  opponentLiberoAutoMap: {},
  opponentPreferredLibero: "",
  opponentSkillFlowOverride: null,
  opponentStats: {},
  showServeTrajectoryLogOur: true,
  showServeTrajectoryLogOpp: true,
  metricsConfig: {},
  pointRules: {},
  autoRotate: true,
  autoRotatePending: false,
  opponentAutoRotatePending: false,
  autoLiberoBackline: true,
  predictiveSkillFlow: true,
  autoRoleP1American: false,
  attackTrajectoryEnabled: true,
  attackTrajectorySimplified: true,
  serveTrajectoryEnabled: true,
  videoScoutMode: false,
  useOpponentTeam: false,
  opponentSkillConfig: {
    serve: true,
    pass: true,
    freeball: true,
    attack: true,
    defense: true,
    block: true,
    second: true
  },
  videoPlayByPlay: false,
  defaultSetType: "",
  setTypePromptEnabled: true,
  nextSetType: "",
  freeballPending: false,
  freeballPendingScope: "our",
  flowTeamScope: "our",
  forceSkillActive: false,
  forceSkillScope: null,
  pendingServe: null,
  matchFinished: false,
  forceMobileLayout: false,
  courtViewMirrored: false,
  courtSideSwapped: false,
  skillClock: { paused: false, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: null },
  scoreOverrides: {},
  autoRoleBaseCourt: [],
  video: {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  },
  videoFilterPresets: [],
  uiPlayerAnalysis: {
    playerIdx: null,
    showAttack: true,
    showServe: true,
    showSecond: false
  },
  uiVideoLayout: {
    analysisHeight: 320,
    scoutHeight: 320
  },
  uiScoutColumns: {
    left: 280,
    right: 380
  },
  uiScoutWidgetLayout: null,
  uiVideoAnalysisSort: {
    key: "",
    dir: ""
  },
  uiMatchSessionActive: false,
  uiActiveTab: "match",
  uiTopBarHidden: false
}),
"modalMode": () => ("skill")
}, {
"elTeamsSelect": () => (document.getElementById("saved-teams")),
"elBtnDeleteTeam": () => (document.getElementById("btn-delete-team")),
"elBtnDuplicateTeam": () => (document.getElementById("btn-duplicate-team")),
"elRotationIndicator": () => (document.getElementById("rotation-indicator")),
"elRotationSelect": () => (document.getElementById("rotation-select")),
"elRotationSelectOpp": () => (document.getElementById("rotation-select-opp")),
"elSkillModal": () => (document.getElementById("skill-modal")),
"elSkillModalBody": () => (document.getElementById("skill-modal-body")),
"elSkillModalCancel": () => (document.getElementById("skill-modal-cancel")),
"elAggSkillModal": () => (document.getElementById("agg-skill-modal")),
"elAggSkillModalBody": () => (document.getElementById("agg-skill-modal-body")),
"elAnalysisSkillChartGrid": () => (document.getElementById("analysis-skill-chart-grid")),
"elBulkEditModal": () => (document.getElementById("bulk-edit-modal")),
"elBulkEditBody": () => (document.getElementById("bulk-edit-body")),
"elErrorModal": () => (document.getElementById("error-modal")),
"elErrorModalBody": () => (document.getElementById("error-modal-body")),
"elPointModal": () => (document.getElementById("point-modal")),
"elPointModalBody": () => (document.getElementById("point-modal-body")),
"elVideoFileInput": () => (document.getElementById("video-file-input")),
"elAnalysisVideo": () => (document.getElementById("analysis-video")),
"elVideoFileLabel": () => (document.getElementById("video-file-label")),
"elVideoSyncLabel": () => (document.getElementById("video-sync-label")),
"elVideoSelectionCount": () => (document.getElementById("video-selection-count")),
"elYoutubeFrame": () => (document.getElementById("youtube-frame")),
"elVideoScoutContainer": () => (document.getElementById("video-scout-container")),
"elVideoScoutControls": () => (document.getElementById("video-scout-controls")),
"elVideoMobileSourceModal": () => (document.getElementById("video-mobile-source-modal")),
"elVideoMobileSourceOpen": () => (document.getElementById("video-mobile-source-open")),
"elVideoFileInputScout": () => (document.getElementById("video-file-input-scout")),
"elAnalysisVideoScout": () => (document.getElementById("analysis-video-scout")),
"elYoutubeFrameScout": () => (document.getElementById("youtube-frame-scout")),
"elPlayerAnalysisSkillChartGrid": () => (document.getElementById("player-analysis-skill-chart-grid")),
});
const matchState = session;

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(blob);
  });
}

export function logError(context, err) {
  console.error(context, err);
}

export function pickImageFile(accept = "image/*") {
  return new Promise(resolve => {
    const input = document.createElement("input");
    let settled = false;
    const finish = file => {
      if (settled) return;
      settled = true;
      resolve(file || null);
    };
    input.type = "file";
    input.accept = accept;
    input.addEventListener(
      "change",
      () => {
        finish((input.files && input.files[0]) || null);
      },
      { once: true }
    );
    input.addEventListener("cancel", () => finish(null), { once: true });
    input.click();
  });
}

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

export function applySkillThemeVars() {
  const root = document.documentElement;
  Object.entries(SKILL_COLORS).forEach(([id, colors]) => {
    root.style.setProperty(`--skill-${id}-bg`, colors.bg);
    root.style.setProperty(`--skill-${id}-text`, colors.text);
    root.style.setProperty(`--skill-${id}-soft`, colors.soft || colors.bg);
  });
}
