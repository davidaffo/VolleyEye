import { readSourceFixture as readFileSync } from "./source-fixture.mjs";

export const ROSTER_SOURCE_FILES = [
  "src/features/teams/set-start-model.js",
  "src/features/analysis/player-model.js",
  "src/domain/events.js",
  "src/features/storage/ui-preferences.js",
  "src/features/storage/match-payload.js",
  "src/features/teams/current-payload.js",
  "src/features/storage/state-snapshot.js",
  "src/features/storage/state-db.js",
  "src/features/storage/match-repository.js",
  "src/features/storage/match-persistence.js",
  "src/features/storage/save-state.js",
  "src/features/teams/roles.js",
  "src/features/teams/libero-model.js",
  "src/domain/isolation.js",
  "src/domain/player-names.js",
  "src/domain/snapshots.js",
  "src/features/teams/roster-data.js",
  "src/domain/counts.js",
  "src/features/settings/rule-state.js",
  "src/features/settings/rules.js",

  "src/features/state/roster-lineup.js",
  "src/domain/lineup.js",
  "src/features/teams/court-model.js",
  "src/features/teams/match-details.js",
  "src/features/teams/archive-labels.js",
  "src/features/teams/preferences.js",
  "src/features/teams/auto-libero-selectors.js",
  "src/features/teams/core/state-store.js",
  "src/features/teams/core/player-model.js",
  "src/features/teams/court/court-engine.js",
  "src/features/teams/storage/team-repository.js",
  "src/features/teams/storage/match-repository.js",
  "src/features/teams/storage/archive-actions.js",
  "src/features/teams/imports/camp3-import.js",
  "src/features/teams/settings/scouting-config.js",
  "src/features/teams/editor/team-editor.js",
  "src/features/teams/settings/metrics-editor.js",
  "src/features/teams/court/court-ui-bootstrap.js"
];

export function readRosterSource() {
  return ROSTER_SOURCE_FILES
    .map(path => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"))
    .join("");
}
