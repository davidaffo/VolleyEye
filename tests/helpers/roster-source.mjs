import { sourceFunctions } from "./source-functions.mjs";
import { readSourceFixture as readFileSync } from "./source-fixture.mjs";

export const ROSTER_SOURCE_FILES = [
  "src/domain/roster-text.js",
  "src/features/io/file-readers.js",
  "src/features/teams/team-reference-model.js",
  "src/features/teams/court-view.js",
  "src/features/teams/lineup-commands.js",
  "src/features/core/match-reset.js",
  "src/features/video/reset-model.js",
  "src/features/video/reset-commands.js",
  "src/features/teams/player-reference-model.js",
  "src/features/scout/court-model.js",
  "src/features/teams/court-state-model.js",
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

  "src/features/teams/storage/archive-actions.js",
  "src/features/teams/imports/camp3-model.js",
  "src/features/teams/imports/camp3-import.js",

  "src/features/teams/editor/team-editor.js",
  "src/features/teams/settings/metrics-editor.js",
  "src/features/teams/court/court-ui-bootstrap.js"
];

export function readRosterSource() {
  return ROSTER_SOURCE_FILES
    .map(path => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"))
    .concat(sourceFunctions(readFileSync(new URL("../../src/features/teams/manager-view.js", import.meta.url), "utf8"), ["buildArchivedTeamOptions", "updateTeamButtonsState", "updateOpponentTeamButtonsState"]))
    .concat(sourceFunctions(readFileSync(new URL("../../src/features/core/runtime-view.js", import.meta.url), "utf8"), ["renderMatchSummary", "renderMatchesList", "selectArchivedMatch", "updateMatchButtonsState"]))
    .concat(sourceFunctions(readFileSync(new URL("../../src/features/teams/editor-view.js", import.meta.url), "utf8"), ["renderTeamManagerTable", "getDefaultLineupRoster", "formatDefaultLineupName", "normalizeDefaultLineup", "setDefaultLineupSlot", "rotateDefaultLineup", "clearDefaultLineupSlot", "renderDefaultLineupEditor"]))
    .join("");
}
