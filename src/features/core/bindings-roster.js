import { TEMPLATE_TEAM } from "../../../js/globals.js";
import { applyTheme } from "../teams/core/state-store.js";
import { session as matchState, downloadBlob } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { setGlobalModalState } from "../layout/modals.js";
import { loadTeamFromStorage, deleteTeamFromStorage, syncTeamsFromStorage, listTeamsFromStorage, saveTeamToStorage, compactTeamPayload, generatePlayerId, buildTemplatePlayersDetailed } from "../teams/storage/team-repository.js";
import { openTeamManagerModal, openNewTeamManager, renderTeamManagerTable, buildRoleBasedDefaultLineup } from "../teams/editor/team-editor.js";
import { closeTeamsManagerModal, renderTeamsManagerList } from "../live/team-management.js";
import { renderTeamsSelect, renderOpponentTeamsSelect } from "../teams/storage/match-repository.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { buildFullName } from "../../domain/player-names.js";
import { pastePlayersStore } from "../../state/roster-import-store.mjs";

export function bindRosterAndArchiveControls() { applyTheme(matchState.state.theme || "dark"); }

export function openSelectedManagedTeam() {
      const name = scoutUiState.teamsManagerSelectedName;
      if (!name) return;
      const team = (loadTeamFromStorage(name));
      if (!team) {
        alert("Squadra non trovata o corrotta.");
        return;
      }
      closeTeamsManagerModal();
      openTeamManagerModal({ scope: "our", storageOnly: true, source: team });
      return;
      matchState.state.selectedTeam = name;
      renderTeamsSelect();
      closeTeamsManagerModal();
      openTeamManagerModal("our");
}

export function deleteSelectedManagedTeam() {
      const name = scoutUiState.teamsManagerSelectedName;
      if (!name) return;
      const ok = confirm("Eliminare la squadra \"" + name + "\"?");
      if (!ok) return;
      deleteTeamFromStorage(name);
      syncTeamsFromStorage();
      renderTeamsSelect();
      renderOpponentTeamsSelect();
      renderTeamsManagerList();
}

export function duplicateSelectedManagedTeam() {
      const name = scoutUiState.teamsManagerSelectedName;
      if (!name) return;
      const team = (loadTeamFromStorage(name));
      if (!team) {
        alert("Squadra non trovata o corrotta.");
        return;
      }
      let newName = prompt("Nome della nuova squadra:", name + " (copia)") || "";
      newName = newName.trim();
      if (!newName) return;
      if (newName === name) {
        alert("Scegli un nome diverso per la copia.");
        return;
      }
      const names = (listTeamsFromStorage());
      if (names.includes(newName)) {
        const ok = confirm("Esiste già una squadra con questo nome. Sovrascrivere?");
        if (!ok) return;
      }
      if (!saveTeamToStorage(newName, team)) {
        alert("Impossibile creare la copia. Controlla lo spazio disponibile nel browser.");
        return;
      }
      syncTeamsFromStorage();
      renderTeamsSelect();
      renderOpponentTeamsSelect();
      scoutUiState.teamsManagerSelectedName = newName;
      renderTeamsManagerList();
}

export function exportSelectedManagedTeam() {
      const name = scoutUiState.teamsManagerSelectedName;
      if (!name) return;
      const team = (loadTeamFromStorage(name));
      if (!team) {
        alert("Squadra non trovata o corrotta.");
        return;
      }
      const payload = (compactTeamPayload(team, name));
      const slug = (name || "squadra").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
      downloadBlob(blob, "squadra_" + (slug || "export") + ".json");
}

export function createManagedTeam() {
      openNewTeamManager();
      return;
      openTeamManagerModal("our");
}

export function addManagedTeamPlayer() {
      if (!rosterLineupState.teamManagerState) {
        openTeamManagerModal(rosterLineupState.teamManagerScope || "our");
        return;
      }
      const nextPlayer = {
        id: (generatePlayerId()),
        name: "",
        firstName: "",
        lastName: "",
        number: "",
        role: "",
        isCaptain: false,
        out: false
      };
      if (typeof rosterLineupState.teamManagerLiveEditMode !== "undefined" && rosterLineupState.teamManagerLiveEditMode) {
        rosterLineupState.teamManagerState.players.push(nextPlayer);
      } else {
        rosterLineupState.teamManagerState.players.unshift(nextPlayer);
      }
      renderTeamManagerTable();
}

export function duplicateManagedTeamPlayers() {
      if (!rosterLineupState.teamManagerState) {
        openTeamManagerModal(rosterLineupState.teamManagerScope || "our");
        return;
      }
      const clone = JSON.parse(JSON.stringify(rosterLineupState.teamManagerState.players || []));
      rosterLineupState.teamManagerState.players = clone.map(p =>
        (() => {
          const firstName = String(p.firstName || "").trim();
          const lastName = (String(p.lastName || "").trim() || (!firstName ? String(p.name || "").trim() : "")) + " (dup)";
          return Object.assign({}, p, {
            id: (generatePlayerId()),
            name: buildFullName(lastName, firstName),
            firstName,
            lastName
          });
        })()
      );
      renderTeamManagerTable();
}

export function generateManagedTeamTemplate() {
      const playersDetailed =
        (buildTemplatePlayersDetailed());
      rosterLineupState.teamManagerState = {
        name: rosterLineupState.teamManagerScope === "opponent" ? matchState.state.selectedOpponentTeam || "Avversaria" : matchState.state.selectedTeam || "Squadra",
        staff: Object.assign({}, rosterLineupState.DEFAULT_STAFF),
        players: playersDetailed,
        defaultRotation: 1,
        defaultLineup:
          (buildRoleBasedDefaultLineup(TEMPLATE_TEAM.players))
      };
      renderTeamManagerTable();
}

export function openManagedPlayersPaste() {
  const elPastePlayersModal=document.getElementById("paste-players-modal");
  
    pastePlayersStore.publish({open:true,text:""});setGlobalModalState(true);return;
  
      
}
