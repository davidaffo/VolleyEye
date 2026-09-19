import { readFileSync } from "node:fs";

export const ROSTER_SOURCE_FILES = [
  "roster-lineup.js",
  "roster/core/state-store.js",
  "roster/core/player-model.js",
  "roster/court/court-engine.js",
  "roster/storage/team-repository.js",
  "roster/storage/match-repository.js",
  "roster/storage/archive-actions.js",
  "roster/imports/camp3-import.js",
  "roster/settings/scouting-config.js",
  "roster/editor/team-editor.js",
  "roster/settings/metrics-editor.js",
  "roster/court/court-ui-bootstrap.js"
];

export function readRosterSource() {
  return ROSTER_SOURCE_FILES
    .map(path => readFileSync(new URL(`../../js/${path}`, import.meta.url), "utf8"))
    .join("");
}
