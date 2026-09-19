import { readFileSync } from "node:fs";

export const STYLE_SOURCE_FILES = [
  "style.css",
  "styles/match-and-lineups.css",
  "styles/analysis-base.css",
  "styles/metrics-and-tables.css",
  "styles/video-filters.css",
  "styles/skill-charts.css",
  "styles/video.css",
  "styles/modals-and-trajectories.css",
  "styles/team-management.css",
  "styles/responsive.css",
  "styles/scout-live.css",
  "styles/print.css"
];

export function readStyleSource() {
  return STYLE_SOURCE_FILES
    .map(path => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"))
    .join("");
}
