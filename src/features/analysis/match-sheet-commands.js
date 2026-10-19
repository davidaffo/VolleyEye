import { renderMatchSheetAnalysis } from "./match-sheet.js";
import {
  ensureMatchSheetFiltersState,
  ensureMatchSheetNotesState,
} from "./match-sheet-model.js";
import { getAnalysisTeamScope } from "./filter-model.js";
import { matchSheetStore } from "../../state/roster-import-store.mjs";
import { saveState } from "../storage/save-state.js";
export function changeReactMatchSheetFilter(kind, value, checked) {
  const filters = ensureMatchSheetFiltersState();
  if (kind === "includeAttackErrors") filters.includeAttackErrors = !!checked;
  else {
    const scope = getAnalysisTeamScope();
    if (!filters.sideoutPlayers) filters.sideoutPlayers = {};
    const current =
        kind === "sets"
          ? filters.sideoutSets || []
          : filters.sideoutPlayers[scope] || [],
      selected = new Set(current);
    if (checked) selected.add(String(value));
    else selected.delete(String(value));
    const options =
        kind === "sets"
          ? matchSheetStore.getSnapshot().sets
          : matchSheetStore.getSnapshot().roster.map((player) => player.index),
      next = options.map(String).filter((option) => selected.has(option));
    if (kind === "sets") filters.sideoutSets = next;
    else filters.sideoutPlayers[scope] = next;
  }
  saveState({ persistLocal: true });
  renderMatchSheetAnalysis();
}

export function changeReactMatchSheetNote(key, value) {
  ensureMatchSheetNotesState()[key] = value || "";
  matchSheetStore.publish({ notes: { ...ensureMatchSheetNotesState() } });
  saveState({ persistLocal: true });
}
