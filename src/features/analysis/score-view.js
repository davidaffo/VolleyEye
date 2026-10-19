import { computePointsSummary, computeSetScores } from "./scores.js";
import { updateSetScoreDisplays } from "../live/next-set-lineups.js";
import { aggregatedScoreStore } from "../../state/roster-import-store.mjs";

export function publishReactAggregatedScore(summary, scope, options = {}) {
  const score =
    summary ||
    computePointsSummary(null, { teamScope: scope, events: options.events });
  updateSetScoreDisplays();
  const data = computeSetScores(scope, { events: options.events });
  aggregatedScoreStore.publish({
    label: score.totalFor + " - " + score.totalAgainst,
    sets: (data.sets || []).map((set) => ({
      key: set.set,
      label: `S${set.set}: ${set.for}-${set.against}`,
    })),
  });
}
