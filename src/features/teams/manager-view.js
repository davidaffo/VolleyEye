import { listTeamsFromStorage, loadTeamNormalized } from "./storage/team-repository.js";
import { teamsManagerStore } from "../../state/teams-manager-store.mjs";
import { session as scoutUiState } from "../state/scout-ui.js";

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
