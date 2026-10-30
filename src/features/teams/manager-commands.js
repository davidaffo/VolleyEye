import { session as scoutUiState } from "../state/scout-ui.js";
import { buildTeamMerge, commitTeamMerge, renderTeamsManagerList } from "../live/team-management.js";
import { publishTeamsManagerView } from "./manager-view.js";
import { ensureMatchDefaults } from "./match-details.js";

export async function mergeManagedTeams(secondaryName, choices) {
  const primaryName = scoutUiState.teamsManagerSelectedName;
  try {
    buildTeamMerge(primaryName, secondaryName, choices);
    if (
      !confirm(
        "Unire “" +
          secondaryName +
          "” in “" +
          primaryName +
          "”? Le partite saranno ricollegate e “" +
          secondaryName +
          "” sarà eliminata. Gli ID delle giocatrici abbinate saranno unificati anche nelle altre squadre e partite.",
      )
    )
      return;
    await commitTeamMerge(primaryName, secondaryName, choices);
  } catch (error) {
    alert(error.message);
    return;
  }
  renderTeamsManagerList();
  publishTeamsManagerView();

  ensureMatchDefaults();
  alert("Squadre unite e partite aggiornate.");
}
