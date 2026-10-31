import { getRemovedLiveTeamPlayers } from "../player-reference-model.js";
import { ensureMatchDefaults } from "../match-details.js";
import { TEMPLATE_TEAM, session as matchState } from "../../../../js/globals.js";
import { normalizePlayers, buildFullName, enforceSingleCaptainFlag } from "../../../domain/player-names.js";
import { applyOpponentDefaultLineup } from "../lineup-commands.js";
import { applyLiveOpponentTeamManagerPayload, applyLiveTeamManagerPayload } from "../core/player-model.js";
import { publishTeamEditorMode, openReactTeamEditor, closeReactTeamEditor, getReactTeamEditorMetadata, renderTeamManagerTable, getDefaultLineupRoster, formatDefaultLineupName, normalizeDefaultLineup, setDefaultLineupSlot, clearDefaultLineupSlot } from "../editor-view.js";
import { updatePlayersList } from "../court/court-ui-bootstrap.js";
import { renderLiberoBench } from "../../scout/court-commands.js";
import { session as courtEngineState } from "../court/court-engine.js";
import { renderOpponentPlayers } from "../../live/team-rendering.js";
import { normalizeTeamPayload, findPlayersDbMatchByFullName, isValidPlayerId, generatePlayerId, isTemplatePlayerName, buildPlayersDbEntry, savePlayersDbToStorage, loadTeamFromStorage, loadOpponentTeamFromStorage, compactTeamPayload, saveOpponentTeamToStorage, deleteOpponentTeamFromStorage, syncOpponentTeamsFromStorage, saveTeamToStorage, deleteTeamFromStorage, syncTeamsFromStorage, extractRosterFromTeam } from "../storage/team-repository.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { listenRuntime } from "../../../app/browser-effects.js";
import { getCurrentOpponentPayload, getCurrentTeamPayload } from "../current-payload.js";
import { renameTeamReferencesAcrossSavedMatches } from "../team-reference-model.js";
import { setGlobalModalState } from "../../layout/modals.js";
import { invalidateRosterIdMapsCache } from "../player-identity.js";
import { session as scoutUiState } from "../../state/scout-ui.js";
import { hasMatchDataForReset } from "../../storage/match-repository.js";
import { publishTeamsManagerView } from "../manager-view.js";
import { cloneIsolationData } from "../../../domain/snapshots.js";
import { saveState } from "../../storage/save-state.js";
import { renderTeamsManagerList } from "../../live/team-management.js";

export function buildTemplateNumbers() {
  const numbers = {};
  TEMPLATE_TEAM.players.forEach((name, idx) => {
    numbers[name] = String(idx + 1);
  });
  return numbers;
}

export function buildRoleBasedDefaultLineup(names = []) {
  const normalized = normalizePlayers(names);
  const buckets = { P: [], O: [], S: [], C: [], other: [] };
  normalized.forEach(name => {
    const lower = name.toLowerCase();
    if (lower.includes("libero")) {
      return; // libero non in campo base
    } else if (lower.includes("palleggi")) {
      buckets.P.push(name);
    } else if (lower.includes("oppost")) {
      buckets.O.push(name);
    } else if (lower.includes("schiacci")) {
      buckets.S.push(name);
    } else if (lower.includes("centr")) {
      buckets.C.push(name);
    } else {
      buckets.other.push(name);
    }
  });
  const used = new Set();
  const pick = list => {
    const found = list.find(n => !used.has(n));
    if (found) used.add(found);
    return found || "";
  };
  const lineup = Array(6).fill("");
  lineup[0] = pick(buckets.P) || pick(buckets.S) || pick(buckets.other); // P
  lineup[3] = pick(buckets.O) || pick(buckets.S) || pick(buckets.other); // O
  lineup[1] = pick(buckets.S) || pick(buckets.other); // S1
  lineup[4] = pick(buckets.S) || pick(buckets.other); // S2
  lineup[5] = pick(buckets.C) || pick(buckets.other); // C1
  lineup[2] = pick(buckets.C) || pick(buckets.other); // C2
  const leftovers = normalized.filter(n => !used.has(n));
  lineup.forEach((name, idx) => {
    if (!name && leftovers.length > 0) {
      const next = leftovers.shift();
      used.add(next);
      lineup[idx] = next;
    }
  });
  return lineup;
}

export function applyTemplateTeam(options = {}) {
  const { askReset = true } = options;
  updatePlayersList(TEMPLATE_TEAM.players, {
    askReset,
    liberos: TEMPLATE_TEAM.liberos,
    playerNumbers: buildTemplateNumbers(),
    captains: [],
    setDefaultLineup: true,
    defaultLineupNames: buildRoleBasedDefaultLineup(TEMPLATE_TEAM.players),
    preferredLibero: TEMPLATE_TEAM.liberos[0] || ""
  });
}

export function buildTeamManagerStateFromSource(source, scope = "our") {
  const isOpponent = scope === "opponent";
  const normalized = source ? normalizeTeamPayload(source) : null;
  const basePlayers = isOpponent ? matchState.state.opponentPlayers || [] : matchState.state.players || [];
  const baseNumbers = isOpponent ? matchState.state.opponentPlayerNumbers || {} : matchState.state.playerNumbers || {};
  const baseLiberos = isOpponent ? matchState.state.opponentLiberos || [] : matchState.state.liberos || [];
  const sourceCaptains = normalized
    ? normalized.captains || []
    : isOpponent
      ? matchState.state.opponentCaptains || []
      : matchState.state.captains || [];
  const sourceLiberos = normalized ? normalized.liberos || [] : baseLiberos;
  const captainSet = new Set(sourceCaptains);
  const playersDetailed =
    normalized && normalized.playersDetailed && normalized.playersDetailed.length > 0
      ? normalized.playersDetailed.map(p => {
          const fullName = buildFullName(p.lastName, p.firstName);
          const isLib = sourceLiberos.includes(fullName) || p.role === "L";
          const fallbackNumber = baseNumbers[fullName] || (p.name && baseNumbers[p.name]) || "";
          const dbEntry =
            (matchState.state.playersDb && matchState.state.playersDb[p.id]) || findPlayersDbMatchByFullName(fullName, p.id) || null;
          return Object.assign(
            {},
            p,
            {
              id: isValidPlayerId(p.id) ? p.id : generatePlayerId(),
              firstName: String(p.firstName || "").trim(),
              lastName: String(p.lastName || "").trim(),
              name: fullName,
              role: isLib ? "L" : "",
              number: p.number || fallbackNumber,
              photo:
                typeof p.photo === "string"
                  ? p.photo
                  : dbEntry && typeof dbEntry.photo === "string"
                    ? dbEntry.photo
                    : ""
            }
          );
        })
      : (() => {
          const db = Object.assign({}, matchState.state.playersDb || {});
          let dbChanged = false;
          const list = basePlayers.map(name => {
            const match = findPlayersDbMatchByFullName(name);
            const id = match && match.id ? match.id : generatePlayerId();
            const firstName = String((match && match.firstName) || "").trim();
            const lastName = String((match && match.lastName) || "").trim() || (!firstName ? name : "");
            const player = {
              id,
              name: buildFullName(lastName, firstName) || name,
              firstName,
              lastName,
              photo: match && typeof match.photo === "string" ? match.photo : "",
              number: baseNumbers[name] || "",
              role: baseLiberos.includes(name) ? "L" : "",
              isCaptain: captainSet.has(name),
              out: false
            };
            if (!isTemplatePlayerName(name)) {
              const existing = db[id];
              const entry = buildPlayersDbEntry(player, existing || {});
              if (
                !existing ||
                existing.name !== entry.name ||
                existing.firstName !== entry.firstName ||
                existing.lastName !== entry.lastName
              ) {
                db[id] = entry;
                dbChanged = true;
              }
            }
            return player;
          });
          if (dbChanged) {
            matchState.state.playersDb = db;
            savePlayersDbToStorage(db);
          }
          return list;
        })();
  enforceSingleCaptainFlag(
    playersDetailed,
    sourceCaptains[0] || ""
  );
  const defaultLineup =
    normalized && Array.isArray(normalized.defaultLineup)
      ? normalized.defaultLineup.filter(name => playersDetailed.some(p => p.name === name && !p.out))
      : [];
  const basePreferred = normalized && typeof normalized.preferredLibero === "string" ? normalized.preferredLibero : "";
  const liberoNames = playersDetailed.filter(p => p.role === "L" && !p.out).map(p => p.name);
  const preferredLibero = liberoNames.includes(basePreferred) ? basePreferred : liberoNames[0] || "";
  return {
    name:
      (normalized && normalized.name) ||
      (isOpponent ? matchState.state.selectedOpponentTeam : matchState.state.selectedTeam) ||
      matchState.state.match.opponent ||
      (isOpponent ? "Avversaria" : "Squadra"),
    staff: (normalized && normalized.staff) || Object.assign({}, rosterLineupState.DEFAULT_STAFF),
    officialCode: (normalized && normalized.officialCode) || "",
    officialId: (normalized && normalized.officialId) || "",
    players: playersDetailed,
    defaultLineup,
    defaultRotation: (normalized && normalized.defaultRotation) || 1,
    preferredLibero
  };
}








export function ensureDefaultLineupTouchListeners() {
  if (rosterLineupState.defaultLineupTouchListenersAttached) return;
  listenRuntime(document, "touchmove", handleDefaultLineupTouchMove, { passive: false });
  listenRuntime(document, "touchend", handleDefaultLineupTouchEnd, { passive: false });
  listenRuntime(document, "touchcancel", handleDefaultLineupTouchCancel, { passive: false });
  rosterLineupState.defaultLineupTouchListenersAttached = true;
}

export function clearDefaultLineupTouch() {
  const prev = document.querySelector(".default-lineup-slot.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (rosterLineupState.defaultLineupTouchGhost && rosterLineupState.defaultLineupTouchGhost.parentNode) {
    rosterLineupState.defaultLineupTouchGhost.parentNode.removeChild(rosterLineupState.defaultLineupTouchGhost);
  }
  rosterLineupState.defaultLineupTouchGhost = null;
  rosterLineupState.defaultLineupTouchName = "";
  rosterLineupState.defaultLineupTouchFromIdx = null;
  rosterLineupState.defaultLineupTouchOverIdx = -1;
  document.body.style.overflow = "";
}

export function updateDefaultLineupTouchOver(x, y) {
  const elAt = document.elementFromPoint(x, y);
  const slot = elAt && elAt.closest(".default-lineup-slot");
  const prev = document.querySelector(".default-lineup-slot.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (!slot || !slot.dataset.slotIndex) {
    rosterLineupState.defaultLineupTouchOverIdx = -1;
    return;
  }
  const idx = parseInt(slot.dataset.slotIndex, 10);
  if (isNaN(idx)) {
    rosterLineupState.defaultLineupTouchOverIdx = -1;
    return;
  }
  rosterLineupState.defaultLineupTouchOverIdx = idx;
  slot.classList.add("drop-over");
}

export function handleDefaultLineupTouchStart(e, name, fromIdx = null) {
  const t = e.touches && e.touches[0];
  if (!t || !name) return;
  ensureDefaultLineupTouchListeners();
  rosterLineupState.defaultLineupTouchName = name;
  rosterLineupState.defaultLineupTouchFromIdx = typeof fromIdx === "number" ? fromIdx : null;
  rosterLineupState.defaultLineupTouchStart = { x: t.clientX, y: t.clientY };
  const label = formatDefaultLineupName(name, matchState.state.playerNumbers || {}, new Set(matchState.state.captains || []), {
    compactCourt: true
  }) || name;
  if (rosterLineupState.defaultLineupTouchGhost && rosterLineupState.defaultLineupTouchGhost.parentNode) {
    rosterLineupState.defaultLineupTouchGhost.parentNode.removeChild(rosterLineupState.defaultLineupTouchGhost);
  }
  const ghost = document.createElement("div");
  ghost.className = "touch-drag-ghost";
  ghost.textContent = label;
  ghost.style.left = t.clientX + "px";
  ghost.style.top = t.clientY + "px";
  document.body.appendChild(ghost);
  rosterLineupState.defaultLineupTouchGhost = ghost;
  updateDefaultLineupTouchOver(t.clientX, t.clientY);
  document.body.style.overflow = "hidden";
  e.stopPropagation();
  e.preventDefault();
}

export function handleDefaultLineupTouchMove(e) {
  if (!rosterLineupState.defaultLineupTouchName) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  if (rosterLineupState.defaultLineupTouchGhost) {
    rosterLineupState.defaultLineupTouchGhost.style.left = t.clientX + "px";
    rosterLineupState.defaultLineupTouchGhost.style.top = t.clientY + "px";
  }
  updateDefaultLineupTouchOver(t.clientX, t.clientY);
  e.stopPropagation();
  e.preventDefault();
}

export function finalizeDefaultLineupTouch(e, forcedIdx = null) {
  if (!rosterLineupState.defaultLineupTouchName) return;
  if (typeof forcedIdx === "number") {
    rosterLineupState.defaultLineupTouchOverIdx = forcedIdx;
  }
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  const endX = t ? t.clientX : rosterLineupState.defaultLineupTouchStart.x;
  const endY = t ? t.clientY : rosterLineupState.defaultLineupTouchStart.y;
  const dist = Math.hypot(endX - rosterLineupState.defaultLineupTouchStart.x, endY - rosterLineupState.defaultLineupTouchStart.y);
  if (rosterLineupState.defaultLineupTouchOverIdx >= 0) {
    setDefaultLineupSlot(rosterLineupState.defaultLineupTouchOverIdx, rosterLineupState.defaultLineupTouchName);
  } else if (dist < 8) {
    if (typeof rosterLineupState.defaultLineupTouchFromIdx === "number") {
      clearDefaultLineupSlot(rosterLineupState.defaultLineupTouchFromIdx);
    } else if (rosterLineupState.teamManagerState) {
      const rosterNames = getDefaultLineupRoster().map(p => p.name);
      const current = normalizeDefaultLineup(rosterLineupState.teamManagerState.defaultLineup || [], rosterNames);
      const firstEmpty = current.findIndex(n => !n);
      const targetIdx = firstEmpty !== -1 ? firstEmpty : 0;
      setDefaultLineupSlot(targetIdx, rosterLineupState.defaultLineupTouchName);
    }
  }
  clearDefaultLineupTouch();
  e.stopPropagation();
  e.preventDefault();
}

export function handleDefaultLineupTouchEnd(e) {
  if (!rosterLineupState.defaultLineupTouchName) return;
  finalizeDefaultLineupTouch(e);
}

export function handleDefaultLineupTouchCancel() {
  if (!rosterLineupState.defaultLineupTouchName) return;
  clearDefaultLineupTouch();
}


export function refreshTeamManagerPlayersFromState() {
  if (!rosterLineupState.elTeamManagerModal || rosterLineupState.elTeamManagerModal.classList.contains("hidden")) return;
  if (rosterLineupState.teamManagerScope !== "our") return;
  if (!rosterLineupState.teamManagerState) return;
  const captainSet = new Set(matchState.state.captains || []);
  const basePlayers = matchState.state.players || [];
  const baseNumbers = matchState.state.playerNumbers || {};
  const baseLiberos = matchState.state.liberos || [];
  const prevMap = new Map((rosterLineupState.teamManagerState.players || []).map(p => [p.name, p]));
  const playersDetailed = basePlayers.map(name => {
    const prev = prevMap.get(name);
    const firstName = String((prev && prev.firstName) || "").trim();
    const lastName = String((prev && prev.lastName) || "").trim() || (!firstName ? name : "");
    return {
      id: prev && isValidPlayerId(prev.id) ? prev.id : generatePlayerId(),
      name: buildFullName(lastName, firstName) || name,
      firstName,
      lastName,
      number: baseNumbers[name] || "",
      role: baseLiberos.includes(name) ? "L" : "",
      isCaptain: captainSet.has(name),
      out: false
    };
  });
  enforceSingleCaptainFlag(playersDetailed, (matchState.state.captains || [])[0] || "");
  rosterLineupState.teamManagerState.players = playersDetailed;
  rosterLineupState.teamManagerState.defaultLineup = normalizePlayers(rosterLineupState.teamManagerState.defaultLineup || []).filter(name =>
    basePlayers.includes(name)
  );
  renderTeamManagerTable();
}

export function refreshTeamManagerFromSelection() {
  if (!rosterLineupState.elTeamManagerModal || rosterLineupState.elTeamManagerModal.classList.contains("hidden")) return;
  if (rosterLineupState.teamManagerScope !== "our") return;
  rosterLineupState.teamManagerLiveEditMode = false;
  rosterLineupState.teamManagerStorageOnly = false;
  const selected = matchState.state.selectedTeam || (matchState.elTeamsSelect && matchState.elTeamsSelect.value) || "";
  const source = selected ? loadTeamFromStorage(selected) : null;
  rosterLineupState.teamManagerState = buildTeamManagerStateFromSource(source, "our");

 openReactTeamEditor({ isNew: false }); return;
}

export function openTeamManagerModal(scope = "our") {
  let options = {};
  if (scope && typeof scope === "object") {
    options = scope;
    scope = options.scope || "our";
  }
  const { liveEdit = false, storageOnly = false } = options;
  rosterLineupState.teamManagerScope = scope;
  rosterLineupState.teamManagerLiveEditMode = !!liveEdit;
  rosterLineupState.teamManagerStorageOnly = !!storageOnly;
  const isOpponent = scope === "opponent";
  const selected = isOpponent ? matchState.state.selectedOpponentTeam : matchState.state.selectedTeam;
  const source = options.source ||
    (liveEdit
      ? isOpponent
        ? getCurrentOpponentPayload()
        : getCurrentTeamPayload()
      : selected
        ? isOpponent
          ? loadOpponentTeamFromStorage(selected)
          : loadTeamFromStorage(selected)
        : null);
  rosterLineupState.teamManagerState = buildTeamManagerStateFromSource(source, scope);

 openReactTeamEditor({ isNew: false }); return;
}

export function openNewTeamManager() {
  rosterLineupState.teamManagerScope = "our";
  rosterLineupState.teamManagerLiveEditMode = false;
  rosterLineupState.teamManagerStorageOnly = true;
  rosterLineupState.teamManagerState = {
    name: "",
    staff: Object.assign({}, rosterLineupState.DEFAULT_STAFF),
    players: [],
    defaultLineup: [],
    defaultRotation: 1,
    preferredLibero: ""
  };

 openReactTeamEditor({ isNew: true }); return;
}

export function closeTeamManagerModal() {
  if (rosterLineupState.elTeamManagerModal) {
    closeReactTeamEditor();
  }
  rosterLineupState.teamManagerLiveEditMode = false;
  rosterLineupState.teamManagerStorageOnly = false;
  publishTeamEditorMode();
  setGlobalModalState(false);
}

export function collectTeamManagerPayload() {
  if (!rosterLineupState.teamManagerState) return null;
  const meta = getReactTeamEditorMetadata();
  const name = meta ? (meta.name ? meta.name.trim() : rosterLineupState.teamManagerState.name) : rosterLineupState.elTeamMetaName && rosterLineupState.elTeamMetaName.value ? rosterLineupState.elTeamMetaName.value.trim() : rosterLineupState.teamManagerState.name;
  const staff = meta ? { headCoach: meta.headCoach || "", assistantCoach: meta.assistantCoach || "", manager: meta.manager || "" } : {
    headCoach: (rosterLineupState.elTeamMetaHead && rosterLineupState.elTeamMetaHead.value) || "",
    assistantCoach: (rosterLineupState.elTeamMetaAssistant && rosterLineupState.elTeamMetaAssistant.value) || "",
    manager: (rosterLineupState.elTeamMetaManager && rosterLineupState.elTeamMetaManager.value) || ""
  };
  const playersDetailed = enforceSingleCaptainFlag(
    rosterLineupState.teamManagerState.players
      .filter(p => (p.name || "").trim() !== "")
      .map(p => ({
        id: isValidPlayerId(p.id) ? p.id : generatePlayerId(),
        name: buildFullName(p.lastName, p.firstName) || p.name.trim(),
        firstName: String(p.firstName || "").trim(),
        lastName: String(p.lastName || "").trim() || (!p.firstName ? String(p.name || "").trim() : ""),
        codeOfficial: typeof p.codeOfficial === "string" ? p.codeOfficial.trim() : "",
        photo: typeof p.photo === "string" ? p.photo : "",
        number: p.number || "",
        role: p.role === "L" ? "L" : "",
        isCaptain: !!p.isCaptain,
        out: !!p.out
      })),
    ((rosterLineupState.teamManagerState.players || []).find(player => player && player.isCaptain) || {}).name || ""
  );
  const defaultLineup = normalizePlayers(rosterLineupState.teamManagerState.defaultLineup || [])
    .filter(name => playersDetailed.some(p => p.name === name && !p.out))
    .slice(0, 6);
  const defaultRotation =
    rosterLineupState.teamManagerState.defaultRotation && rosterLineupState.teamManagerState.defaultRotation >= 1 && rosterLineupState.teamManagerState.defaultRotation <= 6
      ? rosterLineupState.teamManagerState.defaultRotation
      : 1;
  const liberos = playersDetailed.filter(p => p.role === "L" && !p.out).map(p => p.name);
  const preferredLibero =
    rosterLineupState.teamManagerState.preferredLibero && liberos.includes(rosterLineupState.teamManagerState.preferredLibero)
      ? rosterLineupState.teamManagerState.preferredLibero
      : liberos[0] || "";
  const numbers = {};
  playersDetailed.forEach(p => {
    if (p.number !== undefined && p.number !== null && p.number !== "") {
      numbers[p.name] = String(p.number);
    }
  });
  const players = playersDetailed.filter(p => !p.out).map(p => p.name);
  const captains = playersDetailed.filter(p => p.isCaptain && !p.out).map(p => p.name).slice(0, 1);
  return {
    version: 3,
    name,
    staff,
    officialCode: typeof rosterLineupState.teamManagerState.officialCode === "string" ? rosterLineupState.teamManagerState.officialCode.trim() : "",
    officialId: typeof rosterLineupState.teamManagerState.officialId === "string" ? rosterLineupState.teamManagerState.officialId.trim() : "",
    playersDetailed,
    players,
    liberos,
    numbers,
    captains,
    defaultLineup,
    defaultRotation,
    preferredLibero
  };
}

export function saveTeamManagerPayload(options = {}) {
  const {
    closeModal = true,
    openLineupAfter = false,
    saveToStorage = true,
    showAlert = true,
    preserveCourt = false
  } = options;
  const liveEditMode = !!rosterLineupState.teamManagerLiveEditMode;
  const storageOnly = !!rosterLineupState.teamManagerStorageOnly;
  const previousName = rosterLineupState.teamManagerState && rosterLineupState.teamManagerState.name ? rosterLineupState.teamManagerState.name.trim() : "";
  const payload = collectTeamManagerPayload();
  if (!payload || !payload.name) {
    alert("Inserisci un nome squadra valido.");
    return;
  }
  if (!Array.isArray(payload.players) || payload.players.length === 0) {
    alert("Aggiungi almeno una giocatrice prima di salvare la squadra.");
    return;
  }
  const isOpponent = rosterLineupState.teamManagerScope === "opponent";
  if (!liveEditMode && !storageOnly && hasMatchDataForReset() && !matchState.state.matchFinished) {
    alert(
      "Durante lo scout usa Modifica rapida. La gestione completa della squadra resta disponibile dall'archivio e non modifica il match."
    );
    return;
  }
  const liveCurrentPayload = liveEditMode
    ? cloneIsolationData(isOpponent ? getCurrentOpponentPayload() : getCurrentTeamPayload())
    : null;
  invalidateRosterIdMapsCache(isOpponent ? "opponent" : "our");
  if (liveEditMode) {
    const removed = getRemovedLiveTeamPlayers(
      payload,
      isOpponent ? "opponent" : "our",
      liveCurrentPayload
    );
    if (removed.length > 0 && !matchState.state.matchFinished) {
      alert("Durante la partita non puoi rimuovere giocatrici dal roster rapido.");
      return;
    }
  }
  let nextName = payload.name.trim();
  if (previousName && nextName && previousName !== nextName) {
    payload.name = previousName;
    nextName = previousName;
  }
  if (isOpponent && !storageOnly && nextName === matchState.state.selectedTeam) {
    alert("Non puoi selezionare la stessa squadra come avversaria.");
    return;
  }
  if (saveToStorage) {
    if (isOpponent) {
      const compact = compactTeamPayload(payload, payload.name);
      if (!saveOpponentTeamToStorage(nextName, compact)) {
        alert("Impossibile salvare l'avversaria. Controlla lo spazio disponibile nel browser.");
        return;
      }
      if (previousName && previousName !== nextName) {
        renameTeamReferencesAcrossSavedMatches(previousName, nextName, "opponent");
        deleteOpponentTeamFromStorage(previousName);
      }
      syncOpponentTeamsFromStorage();
      if (!storageOnly) {
        matchState.state.selectedOpponentTeam = nextName;
        if (matchState.state.useOpponentTeam || !matchState.state.match.opponent || matchState.state.match.opponent === previousName) {
          matchState.state.match.opponent = nextName;
          ensureMatchDefaults();
        }
      }
      publishTeamsManagerView();

    } else {
      const compact = compactTeamPayload(payload, payload.name);
      if (!saveTeamToStorage(nextName, compact)) {
        alert("Impossibile salvare la squadra. Controlla lo spazio disponibile nel browser.");
        return;
      }
      if (previousName && previousName !== nextName) {
        renameTeamReferencesAcrossSavedMatches(previousName, nextName, "our");
        deleteTeamFromStorage(previousName);
      }
      syncTeamsFromStorage();
      if (!storageOnly) {
        matchState.state.selectedTeam = nextName;
      }
      publishTeamsManagerView();

      scoutUiState.teamsManagerSelectedName = nextName;
      renderTeamsManagerList();
    }
  } else if (!storageOnly) {
    if (isOpponent) {
      matchState.state.selectedOpponentTeam = nextName;
    } else {
      matchState.state.selectedTeam = nextName;
    }
  }
  if (rosterLineupState.teamManagerState) {
    rosterLineupState.teamManagerState.name = nextName;
  }
  const roster = extractRosterFromTeam(payload);
  if (storageOnly) {
    // La gestione dell'archivio non deve modificare roster, formazione o liberi del match aperto.
  } else if (isOpponent) {
    if (liveEditMode) {
      const applied = applyLiveOpponentTeamManagerPayload(payload, liveCurrentPayload);
      if (!applied) return;
    } else {
      courtEngineState.updateOpponentPlayersList(roster.players, {
        liberos: roster.liberos,
        playerNumbers: roster.numbers,
        captains: roster.captains
      });
      matchState.state.opponentPreferredLibero = roster.preferredLibero || roster.liberos?.[0] || "";
      if (!preserveCourt) {
        applyOpponentDefaultLineup(
          roster.defaultLineup?.length ? roster.defaultLineup : roster.players.filter(name => !roster.liberos.includes(name)),
          roster.defaultRotation || 1
        );
      }
      renderLiberoBench();
      renderOpponentPlayers();
    }
  } else {
    if (liveEditMode) {
      const applied = applyLiveTeamManagerPayload(payload, liveCurrentPayload);
      if (!applied) return;
    } else {
    const defaultLineup =
      roster.defaultLineup && roster.defaultLineup.length > 0
        ? roster.defaultLineup
        : roster.playersDetailed && roster.playersDetailed.length > 0
          ? roster.playersDetailed.filter(p => !p.out && p.role !== "L").map(p => p.name)
          : roster.players;
    updatePlayersList(roster.players, {
      askReset: !preserveCourt,
      liberos: roster.liberos,
      playerNumbers: roster.numbers,
      captains: roster.captains,
      setDefaultLineup: !preserveCourt,
      defaultLineupNames: defaultLineup,
      preferredLibero: roster.preferredLibero || ""
    });
    }
  }
  saveState();
  if (closeModal) closeTeamManagerModal();
  if (showAlert) {
    alert(
      liveEditMode
        ? "Squadra aggiornata senza reset della partita."
        : (isOpponent ? "Avversaria salvata: " : "Squadra salvata: ") + nextName
    );
  }
}
