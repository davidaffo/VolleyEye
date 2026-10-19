import { session as scoutUiState } from "../state/scout-ui.js";
import { getPlayersForScope, getPlayerNumbersForScope } from "../teams/selectors.js";
import { isDesktopCourtModalLayout } from "../layout/modals.js";
import { getSortedPlayerEntriesForScope, getSortedPlayerEntries } from "../teams/lineup-selectors.js";
import { attributionStore } from "../../state/attribution-store.mjs";
import { formatNameWithNumber, formatNameWithNumberFor } from "../teams/roster-data.js";

export function publishAttributionView(kind) {
  const prefill = kind === "error" ? scoutUiState.errorModalPrefillPlayer : null;
  const scope = prefill?.scope || "our";
  const prefilled = typeof prefill?.playerIdx === "number";
  const pickedName = prefilled
    ? prefill.playerName ||
      getPlayersForScope(scope)[prefill.playerIdx] ||
      "Giocatrice"
    : "";
  const entries =
    scope === "opponent"
      ? getSortedPlayerEntriesForScope(scope)
      : getSortedPlayerEntries();
  attributionStore.publish(kind, {
    courtModal: isDesktopCourtModalLayout(),
    scope,
    prefilled,
    fromPicker: !!prefill?.fromPicker,
    teamFromPicker: !!prefill?.teamFromPicker,
    pickedName,
    pickedLabel: pickedName ? formatNameWithNumber(pickedName) : "",
    pickedIndex: prefill?.playerIdx,
    selectedType: scoutUiState.selectedErrorType || "Generic",
    types: Object.freeze(scoutUiState.ERROR_TYPES.map((type) => Object.freeze({ ...type }))),
    players: Object.freeze(
      entries.map(({ name, idx }) =>
        Object.freeze({
          name,
          idx,
          label:
            scope === "opponent"
              ? formatNameWithNumberFor(name, getPlayerNumbersForScope(scope))
              : formatNameWithNumber(name),
        }),
      ),
    ),
  });
}

export function setAttributionOpen(kind, open) {
  attributionStore.publish(kind, {
    open,
    courtModal: isDesktopCourtModalLayout(),
  });
}
