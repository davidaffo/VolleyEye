import { readFileSync } from "node:fs";

export const SCOUT_SOURCE_FILES = [
  "scout-ui.js",
  "scout/live/next-set-lineups.js",
  "scout/live/skill-selection.js",
  "scout/live/lineup-editor.js",
  "scout/live/game-flow.js",
  "scout/live/trajectories.js",
  "scout/live/workspace-layout.js",
  "scout/live/team-management.js",
  "scout/live/live-entry.js",
  "scout/live/roster-entry.js",
  "scout/live/court-rendering.js",
  "scout/live/team-rendering.js",
  "scout/live/event-recording.js",
  "scout/analysis/skill-analysis.js",
  "scout/analysis/skill-tables.js",
  "scout/analysis/stats-update.js",
  "scout/video/video-events.js",
  "scout/video/video-sources.js",
  "scout/video/event-editor.js",
  "scout/video/playback.js",
  "scout/live/score-analysis.js",
  "scout/live/live-score-and-set.js",
  "scout/live/scout-shortcuts.js",
  "scout/analysis/analysis-filters.js",
  "scout/analysis/trajectory-filters.js",
  "scout/analysis/player-trajectories.js",
  "scout/analysis/player-second-distribution.js",
  "scout/analysis/video-filters.js",
  "scout/analysis/trajectory-rendering.js",
  "scout/analysis/match-sheet.js",
  "scout/analysis/aggregated-table.js",
  "scout/analysis/second-distribution.js",
  "scout/io/exports.js",
  "scout/io/datavolley-export.js",
  "scout/io/match-io.js",
  "scout/io/datavolley-codec.js",
  "scout/io/datavolley-live-entry.js",
  "scout/io/datavolley-match-import.js",
  "scout/io/file-and-url-import.js",
  "scout/analysis/reports.js",
  "scout/core/app-lifecycle.js",
  "scout/core/bootstrap-state.js",
  "scout/core/bindings-roster.js",
  "scout/core/bindings-scout-settings.js",
  "scout/core/bindings-data.js",
  "scout/core/bindings-video.js",
  "scout/core/bindings-score.js",
  "scout/core/bindings-modals.js",
  "scout/core/bootstrap.js"
];

export function readScoutSource() {
  return SCOUT_SOURCE_FILES
    .map(path => readFileSync(new URL(`../../js/${path}`, import.meta.url), "utf8"))
    .join("");
}
