import { session as scoutUiState } from "../state/scout-ui.js";
import { getPlayerNumbersForScope, getLiberosForScope, getTeamNameForScope, getPlayersForScope } from "../teams/selectors.js";
import { nextSetStore } from "../../state/next-set-store.mjs";
import { getNextSetEntry } from "./next-set-lineups.js";
import { getRawDefaultStartForScope } from "../teams/set-start-model.js";
import { getCourtShape } from "../teams/court-model.js";
import { formatLineupModalName, getBenchForLineupWithRoster } from "../teams/lineup-selectors.js";
import { sortNamesByNumber, getTeamPreferredLibero, formatNameWithNumberFor, formatNameWithNumber } from "../teams/roster-data.js";
import { session as matchState } from "../../../js/globals.js";

export function publishNextSetView() {
  if (!scoutUiState.nextSetDraft) {
    nextSetStore.publish({ open: false });
    return;
  }
  const teams = {};
  for (const scope of ["our", "opponent"]) {
    const entry = getNextSetEntry(scope);
    const court = getCourtShape(entry?.court || []);
    const numbers = getPlayerNumbersForScope(scope);
    const label = (name) =>
      formatLineupModalName(name, { compactCourt: true, scope });
    const liberos = getLiberosForScope(scope);
    const ordered =
      (sortNamesByNumber(liberos, numbers));
    const preferred = getTeamPreferredLibero(scope);
    teams[scope] = Object.freeze({
      name: getTeamNameForScope(scope),
      rotation: entry?.rotation || 1,
      hasDefaults: !!getRawDefaultStartForScope(scope),
      court: Object.freeze(
        court.map((slot) =>
          Object.freeze({
            ...slot,
            label: slot.main ? label(slot.main) : "Trascina qui",
          }),
        ),
      ),
      bench: Object.freeze(
        getBenchForLineupWithRoster(
          court,
          getPlayersForScope(scope),
          liberos,
          numbers,
        ).map((name) => Object.freeze({ name, label: label(name) })),
      ),
      liberos: Object.freeze(
        ordered.map((name) =>
          Object.freeze({
            name,
            label:
              scope === "opponent"
                ? formatNameWithNumberFor(name, numbers)
                : formatNameWithNumber(name),
          }),
        ),
      ),
      preferredLibero: ordered.includes(preferred) ? preferred : "",
    });
  }
  nextSetStore.publish({
    open: scoutUiState.nextSetModalOpen,
    setNum: scoutUiState.nextSetDraft.setNum,
    double: !!matchState.state.useOpponentTeam,
    swapCourt: !!scoutUiState.nextSetDraft.swapCourt,
    isServing: !!scoutUiState.nextSetDraft.isServing,
    teams: Object.freeze(teams),
  });
}
