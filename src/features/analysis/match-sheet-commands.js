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
    if (!filters.sideoutExcludedPlayers) filters.sideoutExcludedPlayers = {};
    const current =
        kind === "sets"
          ? filters.sideoutSets || []
          : filters.sideoutPlayers[scope] || [],
      selected = new Set(current);
    const excluded = new Set(kind === 'sets' ? filters.sideoutExcludedSets || [] : filters.sideoutExcludedPlayers[scope] || []);
    const key = String(value);
    if (selected.has(key)) { selected.delete(key); excluded.add(key); }
    else if (excluded.has(key)) excluded.delete(key);
    else selected.add(key);
    const options =
        kind === "sets"
          ? matchSheetStore.getSnapshot().sets
          : matchSheetStore.getSnapshot().roster.map((player) => player.index),
      next = options.map(String).filter((option) => selected.has(option)),
      nextExcluded = options.map(String).filter((option) => excluded.has(option));
    if (kind === "sets") { filters.sideoutSets = next; filters.sideoutExcludedSets = nextExcluded; }
    else { filters.sideoutPlayers[scope] = next; filters.sideoutExcludedPlayers[scope] = nextExcluded; }
  }
  saveState({ persistLocal: true });
  renderMatchSheetAnalysis();
}

export function changeReactMatchSheetNote(key, value) {
  ensureMatchSheetNotesState()[key] = value || "";
  matchSheetStore.publish({ notes: { ...ensureMatchSheetNotesState() } });
  saveState({ persistLocal: true });
}
