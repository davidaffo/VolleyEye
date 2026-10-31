import { buildPlayersDbUsage } from "../players/database-model.js";
import { session } from "../state/live-team-management.js";
import { ensureMatchDefaults } from "../teams/match-details.js";
import { PLAYER_PREFIX, STORAGE_KEY, session as matchState, logError } from "../../../js/globals.js";
import { saveState } from "../storage/save-state.js";
import { buildCompactLocalStateSnapshot } from "../storage/state-snapshot.js";
import { buildLocalUiSnapshot } from "../storage/ui-preferences.js";
import { getTeamScopeFromEvent, getPlayersForScope } from "../teams/selectors.js";
import { setGlobalModalState } from "../layout/modals.js";
import { normalizeDataVolleyEventMeta, invalidateRosterIdMapsCache } from "../teams/player-identity.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { relocateVideoScoutContainer } from "./workspace-layout.js";
import { setAttackShortcutOpen, getAttackShortcutOpen, publishAttackSetterOptions } from "../scout/attack-shortcut-view.js";
import { publishTeamsManagerView, setTeamsManagerOpen } from "../teams/manager-view.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { loadMatchesMapFromStorage, getMatchStorageKey } from "../storage/match-repository.js";
import { normalizeTeamPayload, listTeamsFromStorage, extractRosterFromTeam, saveTeamToStorage, syncTeamsFromStorage, loadTeamsMapFromStorage, savePlayersDbToStorage, loadPlayersDbFromStorage, buildPlayersDbEntry, compactTeamPayload, getTeamStorageKey } from "../teams/storage/team-repository.js";
import { publishPlayersDbView, setPlayersDbOpen } from "../players/database-view.js";
import { debugStore } from "../../state/roster-import-store.mjs";
import { syncCourtSideLayout, renderPlayers } from "./team-rendering.js";
import { getCurrentMatchPayload } from "../teams/current-payload.js";
import { renderPlayerAnalysis } from "../analysis/skill-tables.js";
import { session as persistentStorageState } from "../state/storage-persistent-storage.js";
import { getSelectedVideoAttackEvents } from "../events/selection-model.js";
import { applyAttackFieldToEvents } from "../video/event-editor.js";

const teamManagementState = session;


export function getAttackShortcutTargetEvents() {
  const videoEvents = getSelectedVideoAttackEvents();
  if (videoEvents.length) return videoEvents;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  if (activeTab === "scout") {
    const ev = getLastAttackEventForScope();
    return ev ? [ev] : [];
  }
  return [];
}


export function getSetterShortcutScope(events) {
  const scopes = new Set((events || []).map(ev => getTeamScopeFromEvent(ev)));
  if (scopes.size !== 1) return null;
  return Array.from(scopes)[0] || null;
}

export function resetAttackShortcutModals() {
  workspaceLayoutState.baseModalTargetEvents = [];
  workspaceLayoutState.setterModalTargetEvents = [];
  workspaceLayoutState.attackTypeModalTargetEvents = [];
  workspaceLayoutState.blockNumberModalTargetEvents = [];
  if (teamManagementState.elBaseModal) {
    setAttackShortcutOpen("base",false);
  }
  if (teamManagementState.elAttackSetterModal) {
    setAttackShortcutOpen("setter",false);
  }
  if (teamManagementState.elAttackTypeModal) {
    setAttackShortcutOpen("type",false);
  }
  if (teamManagementState.elBlockNumberModal) {
    setAttackShortcutOpen("block",false);
  }
  setGlobalModalState(false);
}

export function isAttackShortcutModalOpen(modal) {

return getAttackShortcutOpen(modal.id);
}

export function toggleBaseModal() {
  if (isAttackShortcutModalOpen(teamManagementState.elBaseModal)) closeBaseModal();
  else openBaseModal();
}

export function toggleAttackSetterModal() {
  if (isAttackShortcutModalOpen(teamManagementState.elAttackSetterModal)) closeAttackSetterModal();
  else openAttackSetterModal();
}

export function toggleAttackTypeModal() {
  if (isAttackShortcutModalOpen(teamManagementState.elAttackTypeModal)) closeAttackTypeModal();
  else openAttackTypeModal();
}

export function toggleBlockNumberModal() {
  if (isAttackShortcutModalOpen(teamManagementState.elBlockNumberModal)) closeBlockNumberModal();
  else openBlockNumberModal();
}

export function getLastAttackEventForScope(scope) {
  const events = matchState.state.events || [];
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (!ev || ev.skillId !== "attack") continue;
    if (scope && getTeamScopeFromEvent(ev) !== scope) continue;
    return ev;
  }
  return null;
}

export function applyBaseToTarget(baseValue) {
  const targetEvents = workspaceLayoutState.baseModalTargetEvents || [];
  if (!targetEvents.length) {
    closeBaseModal();
    return;
  }
  try {
    applyAttackFieldToEvents(targetEvents, ev => {
      ev.base = baseValue || null;
    });
  } finally {
    closeBaseModal();
  }
}

export function openBaseModal() {
  if (!teamManagementState.elBaseModal) return;
  const targetEvents = getAttackShortcutTargetEvents();
  if (!targetEvents.length) {
    alert("Seleziona uno o più attacchi per assegnare la base.");
    return;
  }
  workspaceLayoutState.baseModalTargetEvents = targetEvents;
  setAttackShortcutOpen("base",true);
  setGlobalModalState(true, { forcePopup: true });
}

export function closeBaseModal() {
  resetAttackShortcutModals();
}

export function renderSetterModalOptions(scope, setterIdx) {
  if (!teamManagementState.elAttackSetterModalGrid) return;

 publishAttackSetterOptions(scope,setterIdx);return;
}

export function applySetterToTarget(setterIdx) {
  const targetEvents = workspaceLayoutState.setterModalTargetEvents || [];
  if (!targetEvents.length) {
    closeAttackSetterModal();
    return;
  }
  const scope = getSetterShortcutScope(targetEvents);
  if (!scope) {
    closeAttackSetterModal();
    return;
  }
  const players = getPlayersForScope(scope) || [];
  try {
    applyAttackFieldToEvents(targetEvents, ev => {
      if (setterIdx === null || typeof setterIdx !== "number" || !players[setterIdx]) {
        ev.setterIdx = null;
        ev.setterName = null;
      } else {
        ev.setterIdx = setterIdx;
        ev.setterName = players[setterIdx];
      }
    });
  } finally {
    closeAttackSetterModal();
  }
}

export function openAttackSetterModal() {
  if (!teamManagementState.elAttackSetterModal) return;
  const targetEvents = getAttackShortcutTargetEvents();
  if (!targetEvents.length) {
    alert("Seleziona uno o più attacchi per assegnare l'alzatrice.");
    return;
  }
  const scope = getSetterShortcutScope(targetEvents);
  if (!scope) {
    alert("Per assegnare l'alzatrice seleziona attacchi della stessa squadra.");
    return;
  }
  workspaceLayoutState.setterModalTargetEvents = targetEvents;
  const seed = targetEvents[0];
  const setterIdx = typeof seed.setterIdx === "number" ? seed.setterIdx : null;
  renderSetterModalOptions(scope, setterIdx);
  setAttackShortcutOpen("setter",true);
  setGlobalModalState(true, { forcePopup: true });
}

export function closeAttackSetterModal() {
  resetAttackShortcutModals();
}

export function applyAttackTypeToTarget(value) {
  const targetEvents = workspaceLayoutState.attackTypeModalTargetEvents || [];
  if (!targetEvents.length) {
    closeAttackTypeModal();
    return;
  }
  try {
    applyAttackFieldToEvents(targetEvents, ev => {
      ev.attackType = value || null;
    }, { shouldRecalc: false });
  } finally {
    closeAttackTypeModal();
  }
}

export function openAttackTypeModal() {
  if (!teamManagementState.elAttackTypeModal) return;
  const targetEvents = getAttackShortcutTargetEvents();
  if (!targetEvents.length) {
    alert("Seleziona uno o più attacchi per assegnare il tipo.");
    return;
  }
  workspaceLayoutState.attackTypeModalTargetEvents = targetEvents;

  setAttackShortcutOpen("type",true);
  setGlobalModalState(true, { forcePopup: true });
}

export function closeAttackTypeModal() {
  resetAttackShortcutModals();
}

export function applyBlockNumberToTarget(value) {
  const targetEvents = workspaceLayoutState.blockNumberModalTargetEvents || [];
  if (!targetEvents.length) {
    closeBlockNumberModal();
    return;
  }
  try {
    applyAttackFieldToEvents(targetEvents, ev => {
      ev.blockNumber = typeof value === "number" ? value : null;
      ev.dv = normalizeDataVolleyEventMeta(ev.dv);
      ev.dv.numPlayersNumeric = typeof value === "number" ? value : null;
    }, { shouldRecalc: false });
  } finally {
    closeBlockNumberModal();
  }
}

export function openBlockNumberModal() {
  if (!teamManagementState.elBlockNumberModal) return;
  const targetEvents = getAttackShortcutTargetEvents();
  if (!targetEvents.length) {
    alert("Seleziona uno o più attacchi per assegnare il muro.");
    return;
  }
  workspaceLayoutState.blockNumberModalTargetEvents = targetEvents;
  setAttackShortcutOpen("block",true);
  setGlobalModalState(true, { forcePopup: true });
}

export function closeBlockNumberModal() {
  resetAttackShortcutModals();
}

export function renderPlayersDbList() {
  if (!scoutUiState.elPlayersDbBody || !scoutUiState.elPlayersDbCount) return;

 publishPlayersDbView();return;
}

export function openPlayersDbModal() {
  if (!scoutUiState.elPlayersDbModal) return;
  renderPlayersDbList();
  setPlayersDbOpen(true);
  setGlobalModalState(true);
}

export function closePlayersDbModal() {
  if (!scoutUiState.elPlayersDbModal) return;
  setPlayersDbOpen(false);
  setGlobalModalState(false);
}

export function openDebugModal() {
  if (!scoutUiState.elDebugModal) return;
  debugStore.publish({open:true});
  setGlobalModalState(true);
}

export function closeDebugModal() {
  if (!scoutUiState.elDebugModal) return;
  debugStore.publish({open:false});
  setGlobalModalState(false);
}

export function syncOpponentSettingsUI() {
  const enabled = !!matchState.state.useOpponentTeam;
  const wasEnabled = scoutUiState.lastUseOpponentTeamState;
  if (scoutUiState.elUseOpponentTeamToggle) scoutUiState.elUseOpponentTeamToggle.checked = enabled;
  if (scoutUiState.elOpponentTeamSettings) {
    scoutUiState.elOpponentTeamSettings.classList.toggle("hidden", !enabled);
  }
  const opponentPanel = document.querySelector('[data-team-panel="opponent"]');
  if (opponentPanel) {
    opponentPanel.classList.toggle("hidden", !enabled);
  }
  const opponentSettingsPanel = document.querySelector('[data-team-panel="opponent-settings"]');
  if (opponentSettingsPanel) {
    opponentSettingsPanel.classList.toggle("hidden", !enabled);
  }
  if (enabled) {
    if (matchState.state.match && typeof matchState.state.match.opponentManual === "undefined") {
      matchState.state.match.opponentManual = matchState.state.match.opponent || "";
    }
    if (matchState.state.selectedOpponentTeam) {
      matchState.state.match.opponent = matchState.state.selectedOpponentTeam;
    }
    saveState();
  }
  if (!enabled) {
    if (matchState.state.match && typeof matchState.state.match.opponentManual === "string") {
      matchState.state.match.opponent = matchState.state.match.opponentManual;
    }
    if (wasEnabled === true) {
      matchState.state.courtSideSwapped = false;
      matchState.state.courtViewMirrored = false;
      matchState.state.opponentCourtViewMirrored = false;
    }
    saveState();
  }
  scoutUiState.lastUseOpponentTeamState = enabled;
  syncCourtSideLayout();
  relocateVideoScoutContainer();
  renderPlayers();
  ensureMatchDefaults();

}

export function renderTeamsManagerList() {
  if (!scoutUiState.elTeamsManagerList) return;
  const names = (listTeamsFromStorage());
  if (!names.includes(scoutUiState.teamsManagerSelectedName)) {
    scoutUiState.teamsManagerSelectedName = "";
  }

    publishTeamsManagerView();
    return;

}

export function openTeamsManagerModal() {
  if (!scoutUiState.elTeamsManagerModal) return;
  scoutUiState.teamsManagerSelectedName = matchState.state.selectedTeam || "";
  renderTeamsManagerList();
  setTeamsManagerOpen(true);
  setGlobalModalState(true);
}

export function closeTeamsManagerModal() {
  if (!scoutUiState.elTeamsManagerModal) return;
  setTeamsManagerOpen(false);
  setGlobalModalState(false);
}

export function importTeamToStorageOnly(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const raw = evt && evt.target ? String(evt.target.result || "") : "";
      const data = JSON.parse(raw);
      const normalized =
        (normalizeTeamPayload(data));
      const name = normalized && normalized.name ? normalized.name.trim() : "";
      if (!name) {
        alert("Il file non contiene un nome squadra valido.");
        return;
      }
      const roster =
        (extractRosterFromTeam(normalized));
      if (!roster || !Array.isArray(roster.players) || roster.players.length === 0) {
        alert("Il file non contiene giocatrici valide.");
        return;
      }
      if (!saveTeamToStorage(name, normalized)) {
        alert("Impossibile archiviare la squadra. Controlla lo spazio disponibile nel browser.");
        return;
      }
      syncTeamsFromStorage();
      publishTeamsManagerView();
      scoutUiState.teamsManagerSelectedName = name;
      renderTeamsManagerList();
      alert("Squadra importata: " + name);
    } catch (err) {
      logError("Errore importazione squadra (manager)", err);
      alert("File squadra non valido.");
    }
  };
  reader.readAsText(file);
}

export function removeOrphanPlayersFromDb() {
  const teamsMap = (loadTeamsMapFromStorage());
  const usage = buildPlayersDbUsage(teamsMap);
  const db = Object.assign({}, matchState.state.playersDb || {});
  const ids = Object.keys(db);
  const orphans = ids.filter(id => !usage[id] || usage[id].length === 0);
  if (orphans.length === 0) {
    alert("Non ci sono giocatrici senza squadra.");
    return;
  }
  const ok = confirm("Rimuovere " + orphans.length + " giocatrici senza squadra dall'archivio?");
  if (!ok) return;
  orphans.forEach(id => {
    delete db[id];
  });
  matchState.state.playersDb = db;
  savePlayersDbToStorage(db);
  renderPlayersDbList();
}

export function buildPlayersMergePlan(idMap, rosterPlayers = []) {
  const db = { ...loadPlayersDbFromStorage(), ...matchState.state.playersDb };
  rosterPlayers.forEach(player => {
    db[player.id] = buildPlayersDbEntry(player, db[player.id] || {});
  });
  idMap.forEach((primaryId, secondaryId) => {
    const primary = db[primaryId];
    const secondary = db[secondaryId];
    if (!primary || !secondary || primaryId === secondaryId || idMap.has(primaryId)) {
      throw new Error("Abbinamento giocatrice non valido.");
    }
    db[primaryId] = {
      ...secondary,
      ...primary,
      id: primaryId,
      firstName: primary.firstName || secondary.firstName || "",
      lastName: primary.lastName || secondary.lastName || "",
      photo: primary.photo || secondary.photo || "",
      name: primary.name || secondary.name || ""
    };
    delete db[secondaryId];
  });
  function rewrite(value, field = "") {
    if (typeof value === "string") {
      return ["id", "playerId", "setterId", "attackerId"].includes(field) && idMap.has(value)
        ? idMap.get(value) : value;
    }
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(item => rewrite(item));
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item, key)]));
  }
  const teams = rewrite(loadTeamsMapFromStorage());
  const matches = rewrite(loadMatchesMapFromStorage());
  const currentName = matchState.state.loadedMatchName || matchState.state.selectedMatch || "";
  if (currentName && matches[currentName]) {
    matches[currentName] = rewrite(getCurrentMatchPayload(currentName));
  }
  const nextState = rewrite(matchState.state);
  Object.assign(nextState, { playersDb: db, savedTeams: teams, savedOpponentTeams: teams, savedMatches: matches, lastSavedAt: Date.now() });
  return { teams, matches, db, nextState };
}

export async function mergePlayersDbEntries(primaryId, secondaryId) {
  if (!primaryId || !secondaryId || primaryId === secondaryId) return false;
  try {
    await commitArchiveMerge(buildPlayersMergePlan(new Map([[secondaryId, primaryId]])));
    return true;
  } catch (error) {
    logError("Errore unione giocatrici", error);
    return false;
  }
}

export function updatePlayerPhotoInDbAndTeams(playerId, photoDataUrl = "") {
  if (!playerId) return false;
  const db = Object.assign({}, matchState.state.playersDb || {});
  const current = db[playerId];
  if (!current) return false;
  db[playerId] = Object.assign({}, current, {
    photo: typeof photoDataUrl === "string" ? photoDataUrl : ""
  });
  matchState.state.playersDb = db;
  savePlayersDbToStorage(db);
  const teamsMap = (loadTeamsMapFromStorage());
  Object.entries(teamsMap || {}).forEach(([teamName, team]) => {
    const normalized = (normalizeTeamPayload(team, teamName));
    if (!normalized || !Array.isArray(normalized.playersDetailed)) return;
    let changed = false;
    normalized.playersDetailed = normalized.playersDetailed.map(player => {
      const id = player && (player.id || player.playerId);
      if (id !== playerId) return player;
      changed = true;
      return Object.assign({}, player, { photo: typeof photoDataUrl === "string" ? photoDataUrl : "" });
    });
    if (changed) {
      saveTeamToStorage(teamName, normalized);
    }
  });
  invalidateRosterIdMapsCache();
  renderPlayersDbList();
  renderPlayers();
  renderPlayerAnalysis();
  return true;
}

export function buildTeamMerge(primaryName, secondaryName, choices) {
  if (!primaryName || primaryName === secondaryName) throw new Error("Scegli due squadre diverse.");
  const teams = loadTeamsMapFromStorage();
  const primary = normalizeTeamPayload(teams[primaryName], primaryName);
  const secondary = normalizeTeamPayload(teams[secondaryName], secondaryName);
  if (!primary || !secondary) throw new Error("Squadra non trovata o non valida.");
  const idMap = new Map();
  const players = primary.playersDetailed.map(p => ({ ...p }));
  const used = new Set();
  secondary.playersDetailed.forEach(player => {
    const targetId = choices[player.id] || (players.some(p => p.id === player.id) ? player.id : "");
    const target = primary.playersDetailed.find(p => p.id === targetId);
    if (targetId && !target) throw new Error("Abbinamento giocatrice non valido.");
    if (target) {
      if (used.has(targetId)) throw new Error("Abbina ogni giocatrice a una sola giocatrice della squadra mantenuta.");
      used.add(targetId);
      if (player.id !== targetId) idMap.set(player.id, targetId);
      const kept = players.find(p => p.id === targetId);
      ["codeOfficial", "number"].forEach(key => { if (!kept[key]) kept[key] = player[key]; });
    } else {
      if (players.some(p => p.name.toLowerCase() === player.name.toLowerCase())) {
        throw new Error("Due giocatrici hanno lo stesso nome: abbinale oppure distingui i nomi prima dell'unione.");
      }
      players.push({ ...player, isCaptain: primary.captains.length ? false : player.isCaptain });
    }
  });
  // Avoid chained identity substitutions involving players already in the retained roster.
  if ([...idMap.keys()].some(id => primary.playersDetailed.some(p => p.id === id))) {
    throw new Error("Una giocatrice è già condivisa dalle due squadre: mantieni il suo abbinamento originale.");
  }
  const merged = compactTeamPayload({ ...primary, playersDetailed: players }, primaryName);
  merged.staff = { ...secondary.staff, ...Object.fromEntries(Object.entries(primary.staff).filter(([, v]) => v)) };
  merged.officialCode ||= secondary.officialCode;
  merged.officialId ||= secondary.officialId;
  function rewrite(value, field = "") {
    if (typeof value === "string") {
      if (["selectedTeam", "selectedOpponentTeam", "teamName", "opponent", "opponentManual"].includes(field) && value === secondaryName) return primaryName;
      return value;
    }
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(item => rewrite(item));
    const result = {};
    Object.entries(value).forEach(([key, item]) => { result[key] = rewrite(item, key); });
    if (field === "savedTeams" || field === "savedOpponentTeams") {
      if (result[secondaryName]) {
        result[primaryName] = { ...result[secondaryName], name: primaryName };
        delete result[secondaryName];
      }
    }
    return result;
  }
  const plan = buildPlayersMergePlan(idMap, [...primary.playersDetailed, ...secondary.playersDetailed]);
  const { db } = plan;
  merged.playersDetailed.forEach(p => {
    // Identity data (including fallback photos) comes from the shared player merge.
    p.photo = db[p.id].photo || p.photo;
    db[p.id] = buildPlayersDbEntry(p, db[p.id] || {});
  });
  const rewrittenTeams = rewrite(plan.teams);
  delete rewrittenTeams[secondaryName];
  rewrittenTeams[primaryName] = merged;
  const matches = rewrite(plan.matches);
  const nextState = rewrite(plan.nextState);
  Object.assign(teams, rewrittenTeams);
  delete teams[secondaryName];
  Object.assign(nextState, { playersDb: db, savedTeams: teams, savedOpponentTeams: teams, savedMatches: matches, lastSavedAt: Date.now() });
  return { teams, matches, db, nextState };
}

export function commitTeamMerge(primaryName, secondaryName, choices) {
  return commitArchiveMerge(buildTeamMerge(primaryName, secondaryName, choices), [getTeamStorageKey(secondaryName)]);
}

export async function commitArchiveMerge(plan, removedKeys = []) {
  const writes = new Map();
  Object.entries(plan.teams).forEach(([name, team]) => writes.set(getTeamStorageKey(name), JSON.stringify(team)));
  Object.entries(plan.matches).forEach(([name, match]) => writes.set(getMatchStorageKey(name), JSON.stringify(match)));
  writes.set(PLAYER_PREFIX, JSON.stringify(plan.db));
  const snapshot = buildCompactLocalStateSnapshot(plan.nextState);
  // The snapshot helper reads the current global state for the selected match.
  // Replace that part with the already rewritten payload before committing.
  snapshot.savedMatches = plan.nextState.selectedMatch && plan.matches[plan.nextState.selectedMatch]
    ? { [plan.nextState.selectedMatch]: plan.matches[plan.nextState.selectedMatch] }
    : {};
  writes.set(STORAGE_KEY, JSON.stringify(snapshot));
  removedKeys.forEach(key => writes.set(key, null));
  try {
    await persistentStorageState.archiveStorage.commit(writes);
  } catch (error) {
    throw new Error("Salvataggio non riuscito. Unione annullata: " + error.message);
  }
  Object.assign(matchState.state, plan.nextState);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildLocalUiSnapshot(snapshot)));
  } catch (error) {
    logError("Error saving UI preferences", error);
  }
}
