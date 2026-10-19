import { matchDialogStore } from "../../state/match-dialog-store.mjs";
import { listTeamsFromStorage } from "./storage/team-repository.js";
import { getTodayIso } from "./match-details.js";
import { session as matchState } from "../../../js/globals.js";
import { setGlobalModalState } from "../layout/modals.js";

export function openReactMatchDialog(dialogMode, details, archiveName) {
  matchDialogStore.open({
    mode: dialogMode,
    archiveName,
    details: {
      match: { ...details.match },
      selectedTeam: details.selectedTeam,
      selectedOpponentTeam: details.selectedOpponentTeam,
      useOpponentTeam: details.useOpponentTeam,
    },
    teamNames: listTeamsFromStorage(),
    today: getTodayIso(),
    currentCategory: (matchState.state.match && matchState.state.match.category) || "",
  });
  setGlobalModalState(true);
  return true;
}

export function closeReactMatchDialog() {
  matchDialogStore.close();
  setGlobalModalState(false);
}
