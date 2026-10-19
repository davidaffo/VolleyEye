import { createViewStore as createStore } from "./view-store.mjs";
export const pastePlayersStore = createStore({ open: false, text: "" });
export const liberoBenchStore = createStore({ our: [], opponent: [] });
export const exportProgressStore = createStore({ open: false });
export const demoWelcomeStore = createStore({ open: false, choose: null });
export const camp3ConfirmStore = createStore({
  open: false,
  rows: Object.freeze([]),
  outRows: Object.freeze([]),
});

export const playerPhotoStore = createStore({
  open: false,
  source: "",
  transform: "",
  zoom: 1,
  maxZoom: 3,
  allowRemove: false,
});

export const settingsStore = createStore({
  open: false,
  values: Object.freeze({ autoLiberoRole: "C" }),
});

export const bulkEditStore = createStore({
  open: false,
  title: "Modifica multipla",
  hint: "",
  control: null,
});

export const videoScoreStore = createStore({ open: false, home: "", away: "" });

export const videoPresetsStore = createStore({
  name: "",
  entries: Object.freeze([]),
});

export const multiscoutStore = createStore({
  open: false,
  scope: "our",
  teams: Object.freeze([]),
  subtitle: "",
  count: 0,
});

export const matchSheetStore = createStore({
  scope: "our",
  matchLabel: "",
  teamLabel: "",
  eventCount: 0,
  players: [],
  defense: [],
  sideout: [],
  filters: {},
  sets: [],
  roster: [],
  notes: {},
});

export const metricsStore = createStore({ skills: [] });

export const playByPlayStore = createStore({
  sets: [],
  selectedSet: "",
  count: 0,
  won: 0,
  lost: 0,
  avgTouches: "0.0",
  rows: [],
});

export const setTrendStore = createStore({
  cards: [],
  selection: "",
  detail: null,
});

export const aggregatedTableStore = createStore({
  headers: [],
  rows: [],
  extraRows: [],
  charts: [],
  tableClass: "agg-table",
  hiddenSkills: [],
});

export const playerAnalysisStore = createStore({
  primary: null,
  compare: null,
  entries: [],
  compareEntries: [],
  preferences: { showAttack: true, showServe: true },
  playerIdx: "",
  compareIdx: "",
  scope: "our",
});

export const ffmpegEncoderStore = createStore({ open: false, choose: null });
export const mobileVideoSourceStore = createStore({ open: false, url: "" });

export const trajectoryModalStore = createStore({
  open: false,
  className: "skill-modal hidden",
  source: "",
  showNet: false,
  netPoint: null,
  showServe: false,
  serveType: "JF",
  instructions: "",
});

export const debugStore = createStore({ open: false });
export const aggregatedScoreStore = createStore({ label: "0 - 0", sets: [] });
export const updateBannerStore = createStore({
  visible: false,
  message: "Aggiornamento disponibile.",
  refresh: null,
  dismiss: null,
});

export const dvwEntryStore = createStore({
  text: "",
  tokens: [],
  status: "Pronto.",
  tone: "",
  lastCode: "Ultimo codice: —",
  breakdown: null,
});

export const setTypeShortcutsStore = createStore({ choices: [], selected: "" });
export const courtPlacementStore = createStore({
  useCourt: false,
  popupIds: [],
});

export const floatingServeErrorStore = createStore({
  visible: false,
  scope: "",
  playerIdx: null,
  playerName: "",
});

export const demoActionStore = createStore({ visible: false });

export const databaseImportStore = createStore({ url: "" });
