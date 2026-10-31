import { listTeamsFromStorage, loadTeamNormalized } from "./storage/team-repository.js";
import { teamsManagerStore } from "../../state/teams-manager-store.mjs";
import { session as scoutUiState } from "../state/scout-ui.js";
import { session as matchState } from "../../../js/globals.js";
import { updateMatchStatusUI } from "../core/runtime-view.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";

export function publishTeamsManagerView() {
  const teams = listTeamsFromStorage().map((name) => {
    const team = loadTeamNormalized(name);
    return Object.freeze({
      name,
      players: Object.freeze(
        (team?.playersDetailed || []).map((player) =>
          Object.freeze({ id: player.id, name: player.name }),
        ),
      ),
    });
  });
  teamsManagerStore.publish({ selectedName: scoutUiState.teamsManagerSelectedName, teams });
}

export function setTeamsManagerOpen(open) {
  teamsManagerStore.publish({ open });
}

export function updateTeamButtonsState() {
  if (!matchState.elTeamsSelect) return;
  const selected = matchState.elTeamsSelect.value || "";
  updateMatchStatusUI();
  if (matchState.elBtnDeleteTeam) {
    matchState.elBtnDeleteTeam.disabled = !selected;
  }
  if (matchState.elBtnDuplicateTeam) {
    matchState.elBtnDuplicateTeam.disabled = !selected;
  }

}

export function updateOpponentTeamButtonsState() {
  if (!rosterLineupState.elOpponentTeamsSelect) return;
  const selected = rosterLineupState.elOpponentTeamsSelect.value || "";
  if (rosterLineupState.elBtnSaveOpponentTeam) {
    rosterLineupState.elBtnSaveOpponentTeam.textContent = selected ? "Sovrascrivi" : "Salva avversaria";
  }
  if (rosterLineupState.elBtnDeleteOpponentTeam) {
    rosterLineupState.elBtnDeleteOpponentTeam.disabled = !selected;
  }
  if (rosterLineupState.elBtnRenameOpponentTeam) {
    rosterLineupState.elBtnRenameOpponentTeam.disabled = !selected;
  }
}

export function buildArchivedTeamOptions(names, unavailableName = "") {
  return names.map(name => ({
    value: name,
    label: name === unavailableName ? `${name} (squadra principale)` : name,
    disabled: name === unavailableName
  }));
}
