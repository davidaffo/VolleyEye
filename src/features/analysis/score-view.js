import { computePointsSummary, computeSetScores } from "./scores.js";
import { publishRuntimeView } from "../core/runtime-view.js";
import { aggregatedScoreStore } from "../../state/roster-import-store.mjs";

export function renderScoreAndRotations(summary, scope = "our", options = {}) {
  const score =
    summary ||
    computePointsSummary(null, { teamScope: scope, events: options.events });
  publishRuntimeView();
  const data = computeSetScores(scope, { events: options.events });
  aggregatedScoreStore.publish({
    label: score.totalFor + " - " + score.totalAgainst,
    sets: (data.sets || []).map((set) => ({
      key: set.set,
      label: `S${set.set}: ${set.for}-${set.against}`,
    })),
  });
}
