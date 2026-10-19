import { session as applicationState } from "../../app/lifecycle.js";


import { session as matchState, MAX_TIMEOUTS_PER_SET, MAX_SUBSTITUTIONS_PER_SET } from "../../../js/globals.js";
import { buildMatchDisplayName } from "../teams/match-details.js";
import { getMatchArchiveLabel } from "../teams/archive-labels.js";
import { computePointsSummary } from "../analysis/scores.js";
import { computeSetWinScore } from "../analysis/set-results.js";
import { runtimeStore } from "../../state/runtime-store.mjs";
import { getTimeoutCountForSet, getTimeoutOppCountForSet, getSubstitutionCountForSet } from "../analysis/counters.js";

export function publishScoutControlState(disabled) {
  applicationState.scoutControlsDisabled = !!disabled;
  publishRuntimeView();
}

export function publishRuntimeView() {
  const names = Object.keys(matchState.state.savedMatches || {});
  // Avoid resolving duplicate archive labels on every point/counter update.
  const signature = JSON.stringify(
    names.map((name) => {
      const payload = matchState.state.savedMatches[name];
      return [
        name,
        payload && payload.state && payload.state.match
          ? buildMatchDisplayName(payload.state.match)
          : name,
      ];
    }),
  );
  if (signature !== applicationState.archiveSignature) {
    applicationState.archiveSignature = signature;
    applicationState.archiveRows = Object.freeze(
      names.map((name) =>
        Object.freeze({
          name,
          label:
            getMatchArchiveLabel(name, matchState.state.savedMatches[name], names) || name,
        }),
      ),
    );
  }
  const set = matchState.state.currentSet || 1;
  const score = computePointsSummary(set);
  const setScore = computeSetWinScore();
  runtimeStore.publish({
    ready: true,
    currentSet: set,
    theme: matchState.state.theme,
    activeTab: matchState.state.uiActiveTab,
    activeAggTab: matchState.state.uiAggTab,
    topbarHidden: !!matchState.state.uiTopBarHidden,
    selectedMatch: matchState.state.selectedMatch,
    archivedMatches: applicationState.archiveRows,
    matchLabel:
      buildMatchDisplayName(matchState.state.match || {}) ||
      matchState.state.loadedMatchName ||
      matchState.state.selectedMatch ||
      "Partita",
    scoreLabel: score.totalFor + " - " + score.totalAgainst,
    setWinLabel: setScore.for + " - " + setScore.against,
    matchFinished: !!matchState.state.matchFinished,
    scoutControlsDisabled: applicationState.scoutControlsDisabled,
    timeoutsOur: Math.max(0, MAX_TIMEOUTS_PER_SET - getTimeoutCountForSet(set)),
    timeoutsOpponent: Math.max(
      0,
      MAX_TIMEOUTS_PER_SET - getTimeoutOppCountForSet(set),
    ),
    substitutionsOur: Math.max(
      0,
      MAX_SUBSTITUTIONS_PER_SET - getSubstitutionCountForSet(set, "our"),
    ),
    substitutionsOpponent: Math.max(
      0,
      MAX_SUBSTITUTIONS_PER_SET - getSubstitutionCountForSet(set, "opponent"),
    ),
  });
}
