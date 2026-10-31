import { syncMatchSessionUI, setActiveTab } from "../../core/app-lifecycle.js";
import { getCurrentTeamPayload } from "../current-payload.js";
import { session } from "../../state/teams-storage-archive-actions.js";
import { getTodayIso } from "../match-details.js";
import { session as matchState, downloadBlob } from "../../../../js/globals.js";
import { compactTeamPayload, loadTeamFromStorage, loadOpponentTeamFromStorage } from "./team-repository.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { saveState } from "../../storage/save-state.js";
import { cloneIsolationData } from "../../../domain/snapshots.js";
import { renderMatchesSelect } from "../../core/app-lifecycle.js";
import { renderMatchSummary, updateMatchStatusUI } from "../../core/runtime-view.js";
import { getSelectedArchivedMatch, loadMatchFromStorage, saveMatchToStorage, deleteMatchFromStorage, syncMatchesFromStorage, hasUsableMatch } from "../../storage/match-repository.js";
import { persistCurrentMatch, generateMatchName } from "../../storage/match-persistence.js";
import { applyImportedMatch } from "../../io/match-io.js";
import { setCurrentSet } from "../court/court-ui-bootstrap.js";
import { syncMatchInfoInputs } from "../../live/scout-shortcuts.js";
import { snapshotSkillClock, snapshotVideoClock, restoreSkillClock, restoreVideoClock, pauseSkillClock, pauseVideoClock } from "../../live/clocks.js";
import { openReactMatchDialog, closeReactMatchDialog } from "../match-dialog-view.js";
import { handleTeamSelectChange, handleOpponentTeamSelectChange } from "../imports/camp3-import.js";
import { syncOpponentSettingsUI } from "../../live/team-management.js";
import { resetMatchState } from "../../core/match-reset.js";

const archiveActionsState = session;

export function applyMatchPayload(payload, opts = {}) {
  if (!payload || !payload.state) return;
  applyImportedMatch(payload.state, { silent: opts.silent });
  matchState.state.selectedMatch = opts.selectedName || payload.name || "";
  matchState.state.loadedMatchName = matchState.state.selectedMatch;
  saveState();
  renderMatchesSelect();
}

export function loadSelectedMatch() {
  if (!rosterLineupState.elSavedMatchesSelect) return;
  const name = getSelectedArchivedMatch();
  if (!rosterLineupState.isLoadingMatch && (matchState.state.loadedMatchName || "").trim()) {
    persistCurrentMatch({ allowCreate: false });
  }
  if (!name) {
    matchState.state.selectedMatch = "";
    matchState.state.loadedMatchName = "";
    resetMatchState({ skipMatchesRender: true });
    // Hard reset del set per evitare trascinamenti da match precedenti.
    matchState.state.setResults = {};
    matchState.state.setStarts = {};
    setCurrentSet(1, { save: false });
    matchState.state.selectedMatch = generateMatchName();
    matchState.state.loadedMatchName = matchState.state.selectedMatch;
    persistCurrentMatch({ allowCreate: true });
    syncMatchInfoInputs(matchState.state.match);
    return;
  }
  const data =
    loadMatchFromStorage(name) ||
    (matchState.state.savedMatches && matchState.state.savedMatches[name]) ||
    null;
  if (!data) {
    alert("Match non trovato o corrotto.");
    return;
  }
  rosterLineupState.isLoadingMatch = true;
  if (typeof window !== "undefined") {
    window.isLoadingMatch = true;
  }
  try {
    applyMatchPayload(data, { selectedName: name, silent: true });
    syncMatchInfoInputs(matchState.state.match);
  } finally {
    rosterLineupState.isLoadingMatch = false;
    if (typeof window !== "undefined") {
      window.isLoadingMatch = false;
    }
  }
}

export function pauseAndPersistCurrentMatch() {
  const currentName = (matchState.state.loadedMatchName || matchState.state.selectedMatch || "").trim();
  const hasCurrentMatch = !!currentName || (Array.isArray(matchState.state.events) && matchState.state.events.length > 0);
  if (!hasCurrentMatch) return true;
  const previousLoadedMatchName = matchState.state.loadedMatchName || "";
  const previousSelectedMatch = matchState.state.selectedMatch || "";
  const previousSavedMatches = cloneIsolationData(matchState.state.savedMatches || {});
  const previousFinished = !!matchState.state.matchFinished;
  const previousSkillClock =
    (snapshotSkillClock());
  const previousVideoClock =
    (snapshotVideoClock());
  pauseSkillClock();
  pauseVideoClock();
  matchState.state.matchFinished = true;
  const stored = persistCurrentMatch({ allowCreate: true });
  if (stored) return true;
  matchState.state.loadedMatchName = previousLoadedMatchName;
  matchState.state.selectedMatch = previousSelectedMatch;
  matchState.state.savedMatches = previousSavedMatches;
  matchState.state.matchFinished = previousFinished;
  if (previousSkillClock) {
    restoreSkillClock(previousSkillClock);
  }
  if (previousVideoClock) {
    restoreVideoClock(previousVideoClock);
  }
  updateMatchStatusUI();
  return false;
}

export function openNewMatchModal(dialogMode = "create") {
  const modal = document.getElementById("new-match-modal");
  if (!modal) return false;
  const editing = dialogMode === "edit";
  archiveActionsState.matchDetailsArchiveName = editing && !matchState.state.uiMatchSessionActive
    ? getSelectedArchivedMatch() : "";
  const archived = archiveActionsState.matchDetailsArchiveName ? loadMatchFromStorage(archiveActionsState.matchDetailsArchiveName) : null;
  const details = archived && archived.state ? archived.state : matchState.state;
  if (editing && !matchState.state.loadedMatchName && !matchState.state.selectedMatch) {
    alert("Seleziona prima una partita.");
    return false;
  }

    return openReactMatchDialog(dialogMode, details, archiveActionsState.matchDetailsArchiveName);

}

export function closeNewMatchModal() {
  const modal = document.getElementById("new-match-modal");

    closeReactMatchDialog();
    return;

}

export function createNewMatchFromPrompt() {
  return openNewMatchModal();
}

export function saveMatchDetailsFromSetup(setup) {
  if (typeof archiveActionsState.matchDetailsArchiveName !== "undefined" && archiveActionsState.matchDetailsArchiveName) {
    const payload = loadMatchFromStorage(archiveActionsState.matchDetailsArchiveName);
    if (!payload || !payload.state) return false;
    const details = payload.state;
    const opponentManual = String(setup.opponentManual || "").trim();
    if (!details.useOpponentTeam && !opponentManual) {
      alert("Inserisci il nome dell'avversario.");
      return false;
    }
    details.match = { ...details.match, category: String(setup.category || "").trim(),
      date: setup.date || getTodayIso(), matchType: setup.matchType || "", leg: setup.leg || "" };
    if (!details.useOpponentTeam) Object.assign(details.match, { opponent: opponentManual, opponentManual });
    if (!saveMatchToStorage(archiveActionsState.matchDetailsArchiveName, payload)) {
      alert("Impossibile salvare i dati partita. Riprova.");
      return false;
    }
    if (matchState.state.loadedMatchName === archiveActionsState.matchDetailsArchiveName) matchState.state.match = { ...details.match };
    matchState.state.savedMatches[archiveActionsState.matchDetailsArchiveName] = payload;
    renderMatchesSelect();
    saveState({ persistLocal: true, skipMatchPersist: true });
    return true;
  }
  if (!matchState.state.loadedMatchName && !matchState.state.selectedMatch) return false;
  if (!matchState.state.useOpponentTeam && !String(setup.opponentManual || "").trim()) {
    alert("Inserisci il nome dell'avversario.");
    return false;
  }
  const previousMatch = { ...matchState.state.match };
  Object.assign(matchState.state.match, {
    category: String(setup.category || "").trim(),
    date: setup.date || getTodayIso(),
    matchType: setup.matchType || "",
    leg: setup.leg || ""
  });
  if (!matchState.state.useOpponentTeam) {
    matchState.state.match.opponent = String(setup.opponentManual).trim();
    matchState.state.match.opponentManual = matchState.state.match.opponent;
  }
  const saved = persistCurrentMatch({ allowCreate: true });
  if (!saved) {
    matchState.state.match = previousMatch;
    alert("Impossibile salvare i dati partita. Riprova.");
    return false;
  }
  renderMatchesSelect();
  renderMatchSummary();
  saveState();
  return true;
}

export function createNewMatchFromSetup(setup = {}) {
  const teamName = String(setup.teamName || "").trim();
  const useOpponentTeam = setup.mode === "double";
  const opponentTeam = String(setup.opponentTeam || "").trim();
  const opponentManual = String(setup.opponentManual || "").trim();
  if (!teamName) {
    alert("Seleziona la squadra principale.");
    return false;
  }
  if (!loadTeamFromStorage(teamName)) {
    alert("La squadra principale non è più disponibile nell'archivio.");
    return false;
  }
  if (useOpponentTeam && (!opponentTeam || opponentTeam === teamName)) {
    alert("Seleziona una squadra avversaria diversa dalla squadra principale.");
    return false;
  }
  if (useOpponentTeam && typeof loadOpponentTeamFromStorage === "function" && !loadOpponentTeamFromStorage(opponentTeam)) {
    alert("La squadra avversaria non è più disponibile nell'archivio.");
    return false;
  }
  if (!useOpponentTeam && !opponentManual) {
    alert("Inserisci il nome dell'avversario.");
    return false;
  }
  const opponent = useOpponentTeam ? opponentTeam : opponentManual;
  const ok =
    !matchState.state.events || matchState.state.events.length === 0
      ? true
      : confirm("Il match attuale verrà messo in pausa e salvato in archivio. Creare il nuovo match?");
  if (!ok) return false;
  if (!rosterLineupState.isLoadingMatch && !pauseAndPersistCurrentMatch()) {
    alert("Impossibile salvare il match attuale. Il nuovo match non è stato creato.");
    return false;
  }
  matchState.state.selectedMatch = "";
  matchState.state.loadedMatchName = "";
  resetMatchState({ skipMatchesRender: true });
  matchState.state.opponentPlayers = [];
  matchState.state.opponentPlayerNumbers = {};
  matchState.state.opponentLiberos = [];
  matchState.state.opponentCaptains = [];
  matchState.state.opponentStats = {};
  matchState.state.opponentCourt = Array.from({ length: 6 }, () => ({ main: "", replaced: "" }));
  matchState.state.opponentAutoRoleBaseCourt = [];
  matchState.state.opponentLiberoAutoMap = {};
  matchState.state.opponentPreferredLibero = "";
  matchState.state.selectedOpponentTeam = "";
  matchState.state.useOpponentTeam = useOpponentTeam;
  handleTeamSelectChange(teamName);
  if (useOpponentTeam) {
    handleOpponentTeamSelectChange(opponentTeam);
  }
  matchState.state.setResults = {};
  matchState.state.setStarts = {};
  setCurrentSet(1, { save: false });
  matchState.state.match = Object.assign({}, matchState.state.match || {}, {
    opponent,
    opponentManual: useOpponentTeam ? "" : opponentManual,
    category: String(setup.category || "").trim(),
    date: setup.date || getTodayIso(),
    matchType: setup.matchType ?? "amichevole",
    leg: setup.leg || "",
    teamName
  });
  matchState.state.selectedMatch = generateMatchName();
  matchState.state.loadedMatchName = matchState.state.selectedMatch;
  persistCurrentMatch({ allowCreate: true });
  syncMatchInfoInputs(matchState.state.match);
  renderMatchSummary();
  syncOpponentSettingsUI();
  return true;
}

export function deleteSelectedMatch() {
  if (!rosterLineupState.elSavedMatchesSelect && !rosterLineupState.elSavedMatchesList) return;
  const name = getSelectedArchivedMatch();
  if (!name) return;
  const ok = confirm('Eliminare il match "' + name + '"?');
  if (!ok) return;
  const wasCurrent = (matchState.state.loadedMatchName || matchState.state.selectedMatch || "") === name;
  deleteMatchFromStorage(name);
  if (matchState.state.savedMatches && Object.prototype.hasOwnProperty.call(matchState.state.savedMatches, name)) {
    delete matchState.state.savedMatches[name];
  }
  syncMatchesFromStorage();
  matchState.state.selectedMatch = "";
  matchState.state.loadedMatchName = "";
  if (rosterLineupState.elSavedMatchesSelect) {
    rosterLineupState.elSavedMatchesSelect.value = "";
  }
  if (wasCurrent) {
    resetMatchState();
    return;
  }
  saveState({ persistLocal: true, skipMatchPersist: true });
  renderMatchesSelect();
}




export async function exportCurrentTeamToFile() {
  if (!matchState.state.players || matchState.state.players.length === 0) {
    alert("Aggiungi almeno una giocatrice prima di esportare.");
    return;
  }
  const payload = compactTeamPayload(getCurrentTeamPayload());
  const opponentSlug = (payload.name || "squadra").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8;"
  });
  downloadBlob(blob, "squadra_" + (opponentSlug || "export") + ".json");
}



export function enterSelectedMatch() {
  if (!getSelectedArchivedMatch()) return false;
  loadSelectedMatch();
  if (!hasUsableMatch()) return false;
  matchState.state.uiMatchSessionActive = true;
  syncMatchSessionUI();
  setActiveTab("scout");
  saveState({ persistLocal: true });
  return true;
}

export function exitCurrentMatch() {
  if (!matchState.state || !matchState.state.uiMatchSessionActive) return;
  pauseSkillClock();
  pauseVideoClock();
  persistCurrentMatch({ allowCreate: false });
  matchState.state.uiMatchSessionActive = false;
  document.body.classList.remove("drawer-menu-open", "drawer-log-open");
  syncMatchSessionUI();
  setActiveTab("match");
  renderMatchesSelect();
  saveState({ persistLocal: true, skipMatchPersist: true });
}
