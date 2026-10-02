import { ROSTER_SOURCE_FILES } from "./roster-source.mjs";
import { SCOUT_SOURCE_FILES } from "./scout-source.mjs";

export const runtimeFiles = [
  "js/globals.js",
  "js/shared/namespace.js",
  "js/shared/state-isolation.js",
  "js/shared/persistent-storage.js",
  "js/shared/team-ui.js",
  "js/shared/lineup-core.js",
  "js/shared/auto-role.js",
  "js/shared/roster-manager.js",
  "js/match-settings.js",
  "js/opponent-settings.js",
  ...ROSTER_SOURCE_FILES.map(path => `js/${path}`),
  ...SCOUT_SOURCE_FILES.map(path => `js/${path}`)
];
