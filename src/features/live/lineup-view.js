import { getCourtShape } from "../teams/court-model.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { isDesktopCourtModalLayout } from "../layout/modals.js";
import { getLineupModalNumbers, getLineupModalLiberos, getLineupModalPreferredLibero, formatLineupModalName, getBenchForLineupWithRoster, getLineupModalPlayers } from "../teams/lineup-selectors.js";
import { sortNamesByNumber, formatNameWithNumberFor, formatNameWithNumber } from "../teams/roster-data.js";
import { lineupStore } from "../../state/lineup-store.mjs";

export function publishLineupView() {
  const court = getCourtShape(scoutUiState.lineupModalCourt);
  const numbers = getLineupModalNumbers();
  const liberos = getLineupModalLiberos();
  const ordered = sortNamesByNumber(liberos, numbers);
  const preferred = getLineupModalPreferredLibero();
  const label = (name) => formatLineupModalName(name, { compactCourt: true });
  lineupStore.publish({
    scope: scoutUiState.lineupModalScope,
    context: scoutUiState.lineupModalContext,
    numberMode: scoutUiState.lineupNumberMode,
    selectedName: scoutUiState.lineupSelectedName,
    court: Object.freeze(
      court.map((slot) =>
        Object.freeze({
          ...slot,
          label: slot.main ? label(slot.main) : "Trascina qui",
          number: (numbers[slot.main] || "").trim(),
        }),
      ),
    ),
    bench: Object.freeze(
      getBenchForLineupWithRoster(
        court,
        getLineupModalPlayers(),
        liberos,
        numbers,
      ).map((name) => Object.freeze({
        name, label: label(name),
        replacedIndex: court.findIndex(slot => slot.replaced === name && liberos.includes(slot.main)),
      })),
    ),
    liberos: Object.freeze(
      ordered.map((name) =>
        Object.freeze({
          name,
          label:
            scoutUiState.lineupModalScope === "opponent"
              ? formatNameWithNumberFor(name, numbers)
              : formatNameWithNumber(name),
        }),
      ),
    ),
    preferredLibero: ordered.includes(preferred) ? preferred : "",
  });
}

export function setLineupOpen(open) {
  lineupStore.publish({ open, courtModal: isDesktopCourtModalLayout() });
}
