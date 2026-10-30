import { getCurrentTeamPayload } from "../current-payload.js";
import { session } from "../../state/teams-storage-archive-actions.js";
import { stripCourtReplacements, normalizePlayers, buildFullName, normalizePlayerNameCase } from "../../../domain/player-names.js";
import { ensureMatchDefaults, getTodayIso } from "../match-details.js";
import { session as matchState, downloadBlob } from "../../../../js/globals.js";
import { listTeamsFromStorage, compactTeamPayload, saveTeamToStorage, deleteTeamFromStorage, syncTeamsFromStorage, loadTeamFromStorage, loadOpponentTeamFromStorage, getSelectedTeamDefaultSettings, getSelectedOpponentTeamDefaultSettings } from "./team-repository.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";

import { applyDefaultLineup, applyOpponentDefaultLineup } from "../core/player-model.js";
import { saveState } from "../../storage/save-state.js";
import { cloneIsolationData } from "../../../domain/snapshots.js";

import { renderTeamsSelect, renderOpponentTeamsSelect, renderMatchesSelect, renderMatchSummary } from "./match-repository.js";
import { getSelectedArchivedMatch, loadMatchFromStorage, saveMatchToStorage, deleteMatchFromStorage, syncMatchesFromStorage, loadMatchesMapFromStorage } from "../../storage/match-repository.js";

import { enforceAutoLiberoForState, initStats } from "../court-state-model.js";
import { refreshTeamManagerFromSelection } from "../editor/team-editor.js";

import { persistCurrentMatch, generateMatchName } from "../../storage/match-persistence.js";
import { applyImportedMatch } from "../../io/match-io.js";
import { setCurrentSet, updateRotationDisplay } from "../court/court-ui-bootstrap.js";
import { syncMatchInfoInputs } from "../../live/scout-shortcuts.js";
import { snapshotSkillClock, snapshotVideoClock, restoreSkillClock, restoreVideoClock, updateMatchStatusUI } from "../../live/live-score-and-set.js";
import { pauseSkillClock, pauseVideoClock } from "../../live/live-entry.js";
import { openReactMatchDialog, closeReactMatchDialog } from "../match-dialog-view.js";
import { handleTeamSelectChange, handleOpponentTeamSelectChange } from "../imports/camp3-import.js";
import { syncOpponentSettingsUI } from "../../live/team-management.js";
import { resetSetTypeState } from "../../live/game-flow.js";
import { clearEventSelection, renderEventsLog } from "../../video/video-events.js";
import { clearCachedLocalVideo } from "../../video/video-sources.js";
import { session as workspaceLayoutState } from "../../state/live-workspace-layout.js";
import { recalcAllStatsAndUpdateUI } from "../../analysis/stats-update.js";
import { renderPlayers } from "../../live/team-rendering.js";



const archiveActionsState = session;





export function saveCurrentTeam() {
  if (!matchState.state.players || matchState.state.players.length === 0) {
    alert("Aggiungi almeno una giocatrice prima di salvare.");
    return;
  }
  let name = prompt(
    "Nome della squadra da salvare:",
    matchState.state.selectedTeam || (matchState.state.match && matchState.state.match.teamName) || ""
  );
  if (!name) return;
  name = name.trim();
  if (!name) return;
  const names = listTeamsFromStorage();
  const exists = names.includes(name);
  if (exists) {
    const ok = confirm("Esiste già una squadra con questo nome. Sovrascrivere?");
    if (!ok) return;
  }
  const payload = getCurrentTeamPayload(name);
  const compact = compactTeamPayload(payload, name);
  if (!saveTeamToStorage(name, compact)) {
    alert("Impossibile salvare la squadra. Controlla lo spazio disponibile nel browser.");
    return;
  }
  matchState.state.savedTeams = matchState.state.savedTeams || {};
  matchState.state.savedTeams[name] = compact;
  matchState.state.selectedTeam = name;
  saveState();
  renderTeamsSelect();
  renderOpponentTeamsSelect();
  alert("Squadra salvata: " + name);
}



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

export function resetMatchState(options = {}) {
  const { skipMatchesRender = false } = options || {};
  const preservedCourt = matchState.state.court ? stripCourtReplacements(matchState.state.court) : Array.from({ length: 6 }, () => ({ main: "" }));
  const preservedRotation = matchState.state.rotation || 1;
  const preservedServing = !!matchState.state.isServing;
  const preservedAutoRoleCourt = Array.isArray(matchState.state.autoRoleBaseCourt)
    ? stripCourtReplacements(matchState.state.autoRoleBaseCourt)
    : [];
  const preservedPreferredLibero = matchState.state.preferredLibero || "";
  const preservedOpponentCourt = Array.isArray(matchState.state.opponentCourt)
    ? stripCourtReplacements(matchState.state.opponentCourt)
    : Array.from({ length: 6 }, () => ({ main: "" }));
  const preservedOpponentRotation = matchState.state.opponentRotation || 1;
  resetSetTypeState();
  const preservedTeamName = matchState.state.selectedTeam || (matchState.state.match && matchState.state.match.teamName) || "";
  matchState.state.match = {
    teamName: preservedTeamName,
    opponent: "",
    category: "",
    date: getTodayIso(),
    leg: "",
    matchType: "amichevole"
  };
  matchState.state.events = [];
  matchState.state.stats = {};
  const defaults = getSelectedTeamDefaultSettings();
  if (defaults && defaults.defaultLineup && defaults.defaultLineup.length > 0) {
    applyDefaultLineup(defaults.defaultLineup, defaults.defaultRotation || 1);
  } else {
    matchState.state.court = preservedCourt;
    rosterLineupState.autoRoleBaseCourt = preservedAutoRoleCourt.length ? [...preservedAutoRoleCourt] : null;
    matchState.state.autoRoleBaseCourt = preservedAutoRoleCourt;
    matchState.state.rotation = preservedRotation;
  }
  const opponentDefaults = getSelectedOpponentTeamDefaultSettings();
  if (matchState.state.useOpponentTeam && opponentDefaults && opponentDefaults.defaultLineup && opponentDefaults.defaultLineup.length > 0) {
    applyOpponentDefaultLineup(opponentDefaults.defaultLineup, opponentDefaults.defaultRotation || 1);
  } else {
    matchState.state.opponentCourt = preservedOpponentCourt;
    matchState.state.opponentRotation = preservedOpponentRotation;
  }
  matchState.state.isServing = preservedServing;
  matchState.state.currentSet = 1;
  matchState.state.setResults = {};
  matchState.state.setStarts = {};
  matchState.state.matchFinished = false;

  matchState.state.scoreOverrides = {};
  matchState.state.autoRotatePending = false;
  matchState.state.opponentAutoRotatePending = false;
  matchState.state.skillFlowOverride = null;
  matchState.state.opponentSkillFlowOverride = null;
  matchState.state.freeballPending = false;
  matchState.state.freeballPendingScope = "our";
  matchState.state.flowTeamScope = preservedServing ? "our" : "opponent";
  matchState.state.pendingServe = null;
  matchState.state.forceSkillActive = false;
  matchState.state.forceSkillScope = null;
  matchState.state.matchEndSetSnapshot = null;
  matchState.state.matchEndSetRecorded = null;
  matchState.state.liberoAutoMap = {};
  matchState.state.preferredLibero = preservedPreferredLibero;
  matchState.state.courtViewMirrored = false;
  matchState.state.skillClock = { paused: true, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: 0 };
  matchState.state.video = {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  };
  matchState.state.videoFilterPresets = [];
  matchState.state.videoClock = {
    paused: true,
    pausedAtMs: null,
    pausedAccumMs: 0,
    startMs: Date.now(),
    currentSeconds: 0
  };
  clearEventSelection({ clearContexts: true });
  clearCachedLocalVideo();
  if (typeof workspaceLayoutState.ytPlayer !== "undefined" && workspaceLayoutState.ytPlayer && workspaceLayoutState.ytPlayer.stopVideo) {
    workspaceLayoutState.ytPlayer.stopVideo();
  }
  if (typeof matchState.elAnalysisVideo !== "undefined" && matchState.elAnalysisVideo) {
    matchState.elAnalysisVideo.pause();
    matchState.elAnalysisVideo.currentTime = 0;
  }
  if (typeof matchState.elYoutubeFrame !== "undefined" && matchState.elYoutubeFrame) {
    matchState.elYoutubeFrame.src = "";
    matchState.elYoutubeFrame.style.display = "none";
  }
  enforceAutoLiberoForState({ skipServerOnServe: true });
  initStats();
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  updateRotationDisplay();
  ensureMatchDefaults();
  if (!skipMatchesRender) {
    renderMatchesSelect();
  }
}

export function renameSelectedTeam() {
  if (!matchState.elTeamsSelect) return;
  const oldName = matchState.elTeamsSelect.value;
  if (!oldName) {
    alert("Seleziona una squadra da rinominare.");
    return;
  }
  const currentData = loadTeamFromStorage(oldName);
  if (!currentData) {
    alert("Squadra non trovata o corrotta.");
    return;
  }
  let newName = prompt("Nuovo nome per la squadra:", oldName) || "";
  newName = newName.trim();
  if (!newName) return;
  if (newName === oldName) return;
  const names = listTeamsFromStorage();
  const exists = names.includes(newName);
  if (exists) {
    const overwrite = confirm(
      "Esiste già una squadra con questo nome. Sovrascrivere con la squadra corrente?"
    );
    if (!overwrite) return;
  }
  if (!saveTeamToStorage(newName, currentData)) {
    alert("Impossibile rinominare la squadra: la nuova copia non è stata salvata.");
    return;
  }
  deleteTeamFromStorage(oldName);
  renameTeamReferencesAcrossSavedMatches(oldName, newName, "our");
  syncTeamsFromStorage();
  matchState.state.selectedTeam = newName;
  renderTeamsSelect();
  renderOpponentTeamsSelect();
  refreshTeamManagerFromSelection();
  alert("Squadra rinominata in \"" + newName + "\".");
}

export function renameTeamReferencesInNode(node, oldName, newName, scope = "our") {
  if (!node || typeof node !== "object") return 0;
  const keyNames =
    scope === "opponent"
      ? new Set(["selectedOpponentTeam", "opponent"])
      : new Set(["selectedTeam", "teamName"]);
  let changes = 0;
  const walk = value => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    Object.keys(value).forEach(key => {
      const current = value[key];
      if (typeof current === "string" && keyNames.has(key) && current.trim() === oldName) {
        value[key] = newName;
        changes += 1;
        return;
      }
      if (current && typeof current === "object") {
        walk(current);
      }
    });
  };
  walk(node);
  return changes;
}

export function renameTeamReferencesAcrossSavedMatches(oldName, newName, scope = "our") {
  if (!oldName || !newName || oldName === newName) return { matchesUpdated: 0, refsUpdated: 0 };
  const sourceMatches =
    (loadMatchesMapFromStorage());
  const matches = sourceMatches && typeof sourceMatches === "object" ? sourceMatches : {};
  let matchesUpdated = 0;
  let refsUpdated = 0;
  Object.entries(matches).forEach(([matchName, payload]) => {
    if (!payload || typeof payload !== "object") return;
    const cloned = JSON.parse(JSON.stringify(payload));
    const changed = renameTeamReferencesInNode(cloned, oldName, newName, scope);
    if (!changed) return;
    refsUpdated += changed;
    matchesUpdated += 1;
    matches[matchName] = cloned;
    saveMatchToStorage(matchName, cloned);
  });
  matchState.state.savedMatches = matches;
  if (scope === "our") {
    if ((matchState.state.selectedTeam || "").trim() === oldName) matchState.state.selectedTeam = newName;
    if (matchState.state.match && (matchState.state.match.teamName || "").trim() === oldName) {
      matchState.state.match.teamName = newName;
    }
  } else {
    if ((matchState.state.selectedOpponentTeam || "").trim() === oldName) matchState.state.selectedOpponentTeam = newName;
    if (matchState.state.match && (matchState.state.match.opponent || "").trim() === oldName) {
      matchState.state.match.opponent = newName;
    }
  }
  return { matchesUpdated, refsUpdated };
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

export function parseDelimitedTeamText(text) {
  if (!text || typeof text !== "string") return null;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const players = [];
  const playersDetailed = [];
  const numbers = {};
  const liberos = [];
  lines.forEach(rawLine => {
    let name = "";
    let number = "";
    let liberoFlag = "";
    let lastName = "";
    let firstName = "";
    const parts = rawLine.split(/[\t;,]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const isNumberFirst = /^[0-9]{1,3}$/.test(parts[0]);
      const isNumberSecond = /^[0-9]{1,3}$/.test(parts[1]);
      if (isNumberFirst && !isNumberSecond) {
        number = parts[0];
        let tail = parts.slice(1);
        const lastPart = tail[tail.length - 1] || "";
        if (lastPart && lastPart.toLowerCase() === "l") {
          liberoFlag = lastPart;
          tail = tail.slice(0, -1);
        }
        lastName = tail[0] || "";
        firstName = tail.slice(1).join(" ").trim();
        name = buildFullName(lastName, firstName);
      } else if (isNumberSecond) {
        name = parts[0];
        lastName = name;
        number = parts[1];
        liberoFlag = parts[2] || "";
      } else {
        name = parts.join(" ").trim();
        lastName = name;
      }
    } else {
      let match = rawLine.match(/^([0-9]{1,3})\s+(.+?)(?:\s+([Ll]))?$/);
      if (match) {
        number = match[1].trim();
        name = match[2].trim();
        lastName = name;
        liberoFlag = (match[3] || "").trim();
      } else {
        match = rawLine.match(/^(.+?)\s+([0-9]{1,3})(?:\s+([Ll]))?$/);
        if (match) {
          name = match[1].trim();
          lastName = name;
          number = match[2].trim();
          liberoFlag = (match[3] || "").trim();
        }
      }
    }
    const cleanName = normalizePlayers([normalizePlayerNameCase(name)])[0];
    if (!cleanName) return;
    const cleanLastName = normalizePlayerNameCase(lastName || cleanName);
    const cleanFirstName = normalizePlayerNameCase(firstName);
    players.push(cleanName);
    playersDetailed.push({ name: cleanName, lastName: cleanLastName, firstName: cleanFirstName });
    if (number && /^[0-9]{1,3}$/.test(number)) {
      numbers[cleanName] = number;
    }
    if (liberoFlag && liberoFlag.toLowerCase() === "l") {
      liberos.push(cleanName);
    }
  });
  if (players.length === 0) return null;
  return { players, playersDetailed, numbers, liberos };
}

export function readCamp3FileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("File non leggibile."));
    reader.readAsArrayBuffer(file);
  });
}
