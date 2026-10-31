import { getSortedPlayerEntriesForScope, getSortedPlayerEntries } from "../teams/lineup-selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { buildSetStartInfoList, makePlayerNameKey } from "../analysis/player-model.js";

export function buildSetStartDraft(setNum, scope) {
  const startInfo = buildSetStartInfoList([setNum], scope)[0];
  const entries =
    scope === "opponent" ? getSortedPlayerEntriesForScope(scope) : getSortedPlayerEntries();
  const selections = new Map();
  entries.forEach(({ name }) => {
    const key = makePlayerNameKey(name);
    const pos = startInfo && startInfo.positions ? startInfo.positions.get(key) : null;
    const isSub = startInfo && startInfo.subsIn ? startInfo.subsIn.has(key) : false;
    selections.set(key, { name, value: pos ? String(pos) : isSub ? "in" : "" });
  });
  return { setNum, scope, selections };
}

export function ensureSetStartDraft(setNum, scope) {
  if (scoutUiState.setStartDraft && scoutUiState.setStartDraft.setNum === setNum && scoutUiState.setStartDraft.scope === scope) {
    return scoutUiState.setStartDraft;
  }
  scoutUiState.setStartDraft = buildSetStartDraft(setNum, scope);
  return scoutUiState.setStartDraft;
}
