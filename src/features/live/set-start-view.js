import { session as scoutUiState } from "../state/scout-ui.js";
import { getPlayerNumbersForScope } from "../teams/selectors.js";
import { session as matchState } from "../../../js/globals.js";
import { ensureSetStartSnapshot, buildSetStartInfoList, makePlayerNameKey } from "../analysis/player-model.js";
import { ensureSetStartDraft } from "./lineup-editor.js";
import { getSortedPlayerEntriesForScope, getSortedPlayerEntries } from "../teams/lineup-selectors.js";
import { formatNameWithNumberFor, formatNameWithNumber } from "../teams/roster-data.js";
import { setStartStore } from "../../state/set-start-store.mjs";

export function publishSetStartView() {
  const setNum = scoutUiState.setStartModalSetNum || matchState.state.currentSet || 1;
  const scope = scoutUiState.setStartModalScope || "our";
  ensureSetStartSnapshot(setNum);
  const draft = ensureSetStartDraft(setNum, scope);
  const startInfo = buildSetStartInfoList([setNum], scope)[0];
  const entries =
    scope === "opponent"
      ? getSortedPlayerEntriesForScope(scope)
      : getSortedPlayerEntries();
  const rows = entries.map(({ name }) => {
    const key = makePlayerNameKey(name);
    const entry = draft?.selections?.get(key);
    const pos = startInfo?.positions?.get(key);
    const isSub = startInfo?.subsIn?.has(key);
    return Object.freeze({
      name,
      label:
        scope === "opponent"
          ? formatNameWithNumberFor(name, getPlayerNumbersForScope(scope))
          : formatNameWithNumber(name),
      value: entry ? entry.value || "" : pos ? String(pos) : isSub ? "in" : "",
    });
  });
  setStartStore.publish({
    title:
      "Formazione di partenza S" +
      setNum +
      (scope === "opponent" ? " avversaria" : ""),
    rows: Object.freeze(rows),
  });
}

export function setSetStartOpen(open) {
  setStartStore.publish({ open });
}
