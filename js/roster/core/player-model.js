function normalizePlayers(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const names = [];
  list.forEach(name => {
    const clean = (name || "").trim().replace(/\s+/g, " ");
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      names.push(clean);
    }
  });
  return names;
}
function normalizeNumbersMap(map = {}) {
  const normalized = {};
  Object.entries(map || {}).forEach(([key, value]) => {
    const cleanKey = (key || "").trim().replace(/\s+/g, " ");
    if (!cleanKey) return;
    normalized[cleanKey] = value;
  });
  return normalized;
}
function normalizePlayerNameCase(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "";
  const capitalize = chunk => {
    if (!chunk) return "";
    const lower = chunk.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };
  return trimmed
    .split(/\s+/)
    .map(part =>
      part
        .split(/([-'’])/)
        .map(token => {
          if (token === "-" || token === "'" || token === "’") return token;
          return capitalize(token);
        })
        .join("")
    )
    .join(" ");
}
function buildFullName(lastName = "", firstName = "") {
  return [lastName, firstName].map(s => (s || "").trim()).filter(Boolean).join(" ").trim();
}
function getStructuredPlayerNameParts(fullName = "", scope = "") {
  const wanted = String(fullName || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!wanted) return null;
  const candidates = [];
  if (teamManagerState && Array.isArray(teamManagerState.players)) {
    candidates.push(...teamManagerState.players);
  }
  const scopes = scope ? [scope] : ["our", "opponent"];
  scopes.forEach(targetScope => {
    const teamName = targetScope === "opponent"
      ? (state.selectedOpponentTeam || "").trim()
      : ((state.selectedTeam || (state.match && state.match.teamName)) || "").trim();
    if (!teamName) return;
    const loader = targetScope === "opponent" ? loadOpponentTeamFromStorage : loadTeamFromStorage;
    if (typeof loader !== "function") return;
    const payload = loader(teamName);
    if (payload && Array.isArray(payload.playersDetailed)) {
      candidates.push(...payload.playersDetailed);
    }
  });
  if (state.playersDb && typeof state.playersDb === "object") {
    candidates.push(...Object.values(state.playersDb));
  }
  const player = candidates.find(entry => {
    if (!entry || typeof entry !== "object") return false;
    const canonical = buildFullName(entry.lastName, entry.firstName) || String(entry.name || "").trim();
    return canonical.replace(/\s+/g, " ").toLowerCase() === wanted;
  });
  if (!player) return null;
  const lastName = String(player.lastName || "").trim();
  const firstName = String(player.firstName || "").trim();
  if (!lastName && !firstName) return null;
  return { lastName, firstName };
}
function formatStructuredPlayerName(fullName = "", scope = "") {
  const raw = String(fullName || "").trim();
  if (!raw) return "";
  const parts = getStructuredPlayerNameParts(raw, scope);
  if (!parts) return raw;
  const initial = parts.firstName ? parts.firstName[0].toUpperCase() + "." : "";
  return [parts.lastName, initial].filter(Boolean).join(" ").trim() || raw;
}
function enforceSingleCaptainFlag(players, preferredName = "") {
  if (!Array.isArray(players)) return [];
  let chosenIdx = -1;
  const preferred = (preferredName || "").toLowerCase();
  if (preferred) {
    players.forEach((player, idx) => {
      if (!player || !player.name) return;
      if (player.name.toLowerCase() === preferred && chosenIdx === -1) {
        chosenIdx = idx;
      }
    });
  }
  if (chosenIdx === -1) {
    players.forEach((player, idx) => {
      if (player && player.isCaptain && chosenIdx === -1) {
        chosenIdx = idx;
      }
    });
  }
  players.forEach((player, idx) => {
    if (!player) return;
    player.isCaptain = idx === chosenIdx && chosenIdx !== -1;
  });
  return players;
}
function replacePlayerNameEverywhere(oldName, newName, idx) {
  ensureCourtShape();
  state.court = state.court.map(slot => {
    const updated = Object.assign({}, slot);
    if (updated.main === oldName) updated.main = newName;
    if (updated.replaced === oldName) updated.replaced = newName;
    return updated;
  });
  state.liberos = (state.liberos || []).map(n => (n === oldName ? newName : n));
  state.captains = (state.captains || []).map(n => (n === oldName ? newName : n));
  if (state.liberoAutoMap) {
    const updatedMap = {};
    Object.entries(state.liberoAutoMap).forEach(([replaced, libero]) => {
      const nextReplaced = replaced === oldName ? newName : replaced;
      const nextLibero = libero === oldName ? newName : libero;
      updatedMap[nextReplaced] = nextLibero;
    });
    state.liberoAutoMap = updatedMap;
  }
  (state.events || []).forEach(ev => {
    const scope =
      typeof getTeamScopeFromEvent === "function"
        ? getTeamScopeFromEvent(ev)
        : ev && ev.team === "opponent"
          ? "opponent"
          : "our";
    if (scope !== "our") return;
    if (ev.playerIdx === idx || ev.playerName === oldName) {
      ev.playerName = newName;
    }
    if (ev.playerIn === oldName) ev.playerIn = newName;
    if (ev.playerOut === oldName) ev.playerOut = newName;
  });
  Object.values(state.setStarts || {}).forEach(setStart => {
    if (setStart && setStart.our) {
      setStart.our.court = replacePlayerNameInLineup(setStart.our.court, oldName, newName);
    }
  });
}
function replacePlayerNameInLineup(lineup, oldName, newName) {
  if (!Array.isArray(lineup)) return lineup;
  return lineup.map(slot => ({
    main: slot && slot.main === oldName ? newName : (slot && slot.main) || "",
    replaced: slot && slot.replaced === oldName ? newName : (slot && slot.replaced) || ""
  }));
}
function renamePlayerAcrossCurrentMatchById(playerId, nextNameRaw, oldNameHint = "") {
  const normalized = normalizePlayers([nextNameRaw])[0];
  if (!normalized) return false;
  const currentPayload = getCurrentTeamPayload();
  const detailed = Array.isArray(currentPayload.playersDetailed) ? currentPayload.playersDetailed : [];
  const previous = detailed.find(player => player && player.id === playerId && !player.out);
  const oldName = (previous && previous.name) || oldNameHint;
  if (!oldName) return false;
  if (oldName === normalized) return false;
  const idx = (state.players || []).findIndex(name => name === oldName);
  if (idx === -1) return false;
  state.players[idx] = normalized;
  state.playerNumbers = state.playerNumbers || {};
  const oldNumber = state.playerNumbers[oldName];
  delete state.playerNumbers[oldName];
  if (oldNumber !== undefined) {
    state.playerNumbers[normalized] = oldNumber;
  }
  replacePlayerNameEverywhere(oldName, normalized, idx);
  state.autoRoleBaseCourt = replacePlayerNameInLineup(state.autoRoleBaseCourt, oldName, normalized);
  autoRoleBaseCourt = replacePlayerNameInLineup(autoRoleBaseCourt, oldName, normalized);
  if (
    state.pendingServe &&
    state.pendingServe.scope === "our" &&
    (state.pendingServe.playerId === playerId || state.pendingServe.playerName === oldName)
  ) {
    state.pendingServe.playerName = normalized;
  }
  return true;
}
function replaceOpponentPlayerNameEverywhere(oldName, newName, idx, playerId = "") {
  state.opponentCourt = ensureCourtShapeFor(state.opponentCourt).map(slot => {
    const updated = Object.assign({}, slot);
    if (updated.main === oldName) updated.main = newName;
    if (updated.replaced === oldName) updated.replaced = newName;
    return updated;
  });
  state.opponentLiberos = (state.opponentLiberos || []).map(name => (name === oldName ? newName : name));
  state.opponentCaptains = (state.opponentCaptains || []).map(name => (name === oldName ? newName : name));
  const nextMap = {};
  Object.entries(state.opponentLiberoAutoMap || {}).forEach(([replaced, libero]) => {
    nextMap[replaced === oldName ? newName : replaced] = libero === oldName ? newName : libero;
  });
  state.opponentLiberoAutoMap = nextMap;
  (state.events || []).forEach(event => {
    const scope = typeof getTeamScopeFromEvent === "function" ? getTeamScopeFromEvent(event) : event.scope;
    if (scope !== "opponent") return;
    if ((playerId && event.playerId === playerId) || event.playerIdx === idx || event.playerName === oldName) {
      event.playerName = newName;
    }
    if (event.playerIn === oldName) event.playerIn = newName;
    if (event.playerOut === oldName) event.playerOut = newName;
  });
  Object.values(state.setStarts || {}).forEach(setStart => {
    if (setStart && setStart.opponent) {
      setStart.opponent.court = replacePlayerNameInLineup(setStart.opponent.court, oldName, newName);
    }
  });
}
function renameOpponentPlayerAcrossCurrentMatchById(playerId, nextNameRaw, oldNameHint = "") {
  const normalized = normalizePlayers([nextNameRaw])[0];
  if (!normalized) return false;
  const currentPayload = getCurrentOpponentPayload();
  const detailed = Array.isArray(currentPayload.playersDetailed) ? currentPayload.playersDetailed : [];
  const previous = detailed.find(player => player && player.id === playerId && !player.out);
  const oldName = (previous && previous.name) || oldNameHint;
  if (!oldName || oldName === normalized) return false;
  const idx = (state.opponentPlayers || []).findIndex(name => name === oldName);
  if (idx === -1) return false;
  state.opponentPlayers[idx] = normalized;
  state.opponentPlayerNumbers = state.opponentPlayerNumbers || {};
  const oldNumber = state.opponentPlayerNumbers[oldName];
  delete state.opponentPlayerNumbers[oldName];
  if (oldNumber !== undefined) state.opponentPlayerNumbers[normalized] = oldNumber;
  replaceOpponentPlayerNameEverywhere(oldName, normalized, idx, playerId);
  state.opponentAutoRoleBaseCourt = replacePlayerNameInLineup(
    state.opponentAutoRoleBaseCourt,
    oldName,
    normalized
  );
  opponentAutoRoleBaseCourt = replacePlayerNameInLineup(opponentAutoRoleBaseCourt, oldName, normalized);
  return true;
}
function getRemovedLiveTeamPlayers(payload, scope = "our", currentPayloadOverride = null) {
  const currentPayload =
    currentPayloadOverride ||
    (scope === "opponent" ? getCurrentOpponentPayload() : getCurrentTeamPayload());
  const currentDetailed = Array.isArray(currentPayload.playersDetailed)
    ? currentPayload.playersDetailed.filter(player => player && !player.out)
    : [];
  const nextDetailed = Array.isArray(payload.playersDetailed)
    ? payload.playersDetailed.filter(player => player && !player.out)
    : [];
  const nextIds = new Set(nextDetailed.map(player => player.id).filter(Boolean));
  const hasStableIdOverlap = currentDetailed.some(player => player.id && nextIds.has(player.id));
  if (!hasStableIdOverlap) {
    return nextDetailed.length < currentDetailed.length
      ? currentDetailed.slice(nextDetailed.length)
      : [];
  }
  return currentDetailed.filter(player => player.id && !nextIds.has(player.id));
}
function applyLiveTeamManagerPayload(payload, currentPayloadOverride = null) {
  const currentPayload = currentPayloadOverride || getCurrentTeamPayload();
  const currentDetailed = Array.isArray(currentPayload.playersDetailed)
    ? currentPayload.playersDetailed.filter(player => player && !player.out)
    : [];
  const nextDetailed = Array.isArray(payload.playersDetailed)
    ? payload.playersDetailed.filter(player => player && !player.out)
    : [];
  const currentIds = new Set(currentDetailed.map(player => player.id).filter(Boolean));
  const nextIds = new Set(nextDetailed.map(player => player.id).filter(Boolean));
  const hasStableIdOverlap = currentDetailed.some(player => player.id && nextIds.has(player.id));
  const removed = currentDetailed.filter(player => player.id && !nextIds.has(player.id));
  if (
    !state.matchFinished &&
    ((hasStableIdOverlap && removed.length > 0) || (!hasStableIdOverlap && nextDetailed.length < currentDetailed.length))
  ) {
    alert("Durante la partita non puoi rimuovere giocatrici dal roster rapido.");
    return false;
  }
  currentDetailed.forEach((player, index) => {
    const next = hasStableIdOverlap
      ? nextDetailed.find(entry => entry.id === player.id)
      : nextDetailed[index];
    if (!next || !next.name || next.name === player.name) return;
    renamePlayerAcrossCurrentMatchById(player.id, next.name, player.name);
  });
  const orderedCurrentNames = currentDetailed.map((player, index) => {
    const renamed = hasStableIdOverlap
      ? nextDetailed.find(entry => entry.id === player.id)
      : nextDetailed[index];
    return renamed && renamed.name ? renamed.name : player.name;
  });
  const addedNames = (hasStableIdOverlap
    ? nextDetailed.filter(player => player.id && !currentIds.has(player.id))
    : nextDetailed.slice(currentDetailed.length))
    .map(player => player.name)
    .filter(Boolean);
  const nextNames = orderedCurrentNames.concat(addedNames);
  updatePlayersList(nextNames, {
    askReset: false,
    liberos: payload.liberos,
    playerNumbers: payload.numbers,
    captains: payload.captains,
    preserveCourt: true,
    preferredLibero: payload.preferredLibero || "",
    preserveFlowState: true
  });
  return true;
}
function applyLiveOpponentTeamManagerPayload(payload, currentPayloadOverride = null) {
  const currentPayload = currentPayloadOverride || getCurrentOpponentPayload();
  const currentDetailed = Array.isArray(currentPayload.playersDetailed)
    ? currentPayload.playersDetailed.filter(player => player && !player.out)
    : [];
  const nextDetailed = Array.isArray(payload.playersDetailed)
    ? payload.playersDetailed.filter(player => player && !player.out)
    : [];
  const currentIds = new Set(currentDetailed.map(player => player.id).filter(Boolean));
  const nextIds = new Set(nextDetailed.map(player => player.id).filter(Boolean));
  const hasStableIdOverlap = currentDetailed.some(player => player.id && nextIds.has(player.id));
  currentDetailed.forEach((player, index) => {
    const next = hasStableIdOverlap
      ? nextDetailed.find(entry => entry.id === player.id)
      : nextDetailed[index];
    if (!next || !next.name || next.name === player.name) return;
    renameOpponentPlayerAcrossCurrentMatchById(player.id, next.name, player.name);
  });
  const orderedCurrentNames = currentDetailed.map((player, index) => {
    const renamed = hasStableIdOverlap
      ? nextDetailed.find(entry => entry.id === player.id)
      : nextDetailed[index];
    return renamed && renamed.name ? renamed.name : player.name;
  });
  const addedNames = (hasStableIdOverlap
    ? nextDetailed.filter(player => player.id && !currentIds.has(player.id))
    : nextDetailed.slice(currentDetailed.length))
    .map(player => player.name)
    .filter(Boolean);
  const applied = updateOpponentPlayersList(orderedCurrentNames.concat(addedNames), {
    liberos: payload.liberos,
    playerNumbers: payload.numbers,
    captains: payload.captains,
    allowDuringMatch: true
  });
  if (applied === false) return false;
  state.opponentPreferredLibero = payload.preferredLibero || "";
  if (typeof renderPlayers === "function") renderPlayers();
  return true;
}
function syncTeamManagerModeUI() {
  if (elTeamManagerDialog) {
    elTeamManagerDialog.classList.toggle("team-modal__dialog--live-edit", !!teamManagerLiveEditMode);
  }
  if (elTeamManagerLiveNote) {
    elTeamManagerLiveNote.classList.toggle("hidden", !teamManagerLiveEditMode);
  }
}
function renamePlayerAtIndex(idx, nextNameRaw) {
  if (!state.players || !state.players[idx]) return;
  const normalized = normalizePlayers([nextNameRaw])[0];
  if (!normalized) {
    alert("Inserisci un nome valido.");
    renderPlayersManagerList();
    return;
  }
  const duplicate = state.players.some(
    (p, i) => i !== idx && p.toLowerCase() === normalized.toLowerCase()
  );
  if (duplicate) {
    alert("Nome già presente nella lista.");
    renderPlayersManagerList();
    return;
  }
  const oldName = state.players[idx];
  if (oldName === normalized) return;
  state.players[idx] = normalized;
  state.playerNumbers = state.playerNumbers || {};
  const oldNumber = state.playerNumbers[oldName];
  delete state.playerNumbers[oldName];
  if (oldNumber) {
    state.playerNumbers[normalized] = oldNumber;
  }
  replacePlayerNameEverywhere(oldName, normalized, idx);
  saveState();
  applyPlayersFromStateToTextarea();
  renderPlayersManagerList();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  renderLiberoTags();
  renderAggregatedTable();
  renderEventsLog();
}
function getPlayerNumber(name) {
  if (!name || !state.playerNumbers) return "";
  return state.playerNumbers[name] || "";
}
function getTeamPlayers(scope = "our") {
  return scope === "opponent" ? state.opponentPlayers || [] : state.players || [];
}
function getTeamNumbers(scope = "our") {
  return scope === "opponent" ? state.opponentPlayerNumbers || {} : state.playerNumbers || {};
}
function getTeamLiberos(scope = "our") {
  return scope === "opponent" ? state.opponentLiberos || [] : state.liberos || [];
}
function getTeamCourt(scope = "our") {
  return scope === "opponent" ? state.opponentCourt || [] : state.court || [];
}
function setTeamCourt(scope = "our", court = []) {
  if (scope === "opponent") {
    state.opponentCourt = court;
    if (state.autoRolePositioning) {
      updateOpponentAutoRoleBaseCourtCache(court);
    }
  } else {
    state.court = court;
  }
}
function getTeamRotation(scope = "our") {
  return scope === "opponent" ? state.opponentRotation || 1 : state.rotation || 1;
}
function setTeamRotation(scope = "our", rotation = 1) {
  if (scope === "opponent") {
    state.opponentRotation = rotation;
  } else {
    state.rotation = rotation;
  }
}
function getTeamAutoLiberoRole(scope = "our") {
  const role = scope === "opponent" ? state.opponentAutoLiberoRole : state.autoLiberoRole;
  return normalizeAutoLiberoRolePreference(role, state.autoLiberoRoleDefaultVersion);
}
function setTeamAutoLiberoRole(scope = "our", role = "") {
  if (scope === "opponent") {
    state.opponentAutoLiberoRole = role || "";
  } else {
    state.autoLiberoRole = role || "";
  }
}
function getTeamAutoLiberoBackline(scope = "our") {
  return scope === "opponent" ? !!state.opponentAutoLiberoBackline : !!state.autoLiberoBackline;
}
function setTeamAutoLiberoBackline(scope = "our", enabled = false) {
  if (scope === "opponent") {
    state.opponentAutoLiberoBackline = !!enabled;
  } else {
    state.autoLiberoBackline = !!enabled;
  }
}
function getTeamLiberoAutoMap(scope = "our") {
  return scope === "opponent" ? state.opponentLiberoAutoMap || {} : state.liberoAutoMap || {};
}
function setTeamLiberoAutoMap(scope = "our", map = {}) {
  if (scope === "opponent") {
    state.opponentLiberoAutoMap = map || {};
  } else {
    state.liberoAutoMap = map || {};
  }
}
function getTeamPreferredLibero(scope = "our") {
  return scope === "opponent" ? state.opponentPreferredLibero || "" : state.preferredLibero || "";
}
function setTeamPreferredLibero(scope = "our", name = "") {
  if (scope === "opponent") {
    state.opponentPreferredLibero = name || "";
  } else {
    state.preferredLibero = name || "";
  }
}
function getPlayerNumberValue(name, numbersMap = state.playerNumbers || {}) {
  const raw = numbersMap && numbersMap[name];
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
function sortNamesByNumber(names = [], numbersMap = state.playerNumbers || {}) {
  const list = Array.isArray(names) ? names.slice() : [];
  list.sort((a, b) => {
    const numA = getPlayerNumberValue(a, numbersMap);
    const numB = getPlayerNumberValue(b, numbersMap);
    if (numA === null && numB === null) {
      return a.localeCompare(b, "it", { sensitivity: "base" });
    }
    if (numA === null) return 1;
    if (numB === null) return -1;
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b, "it", { sensitivity: "base" });
  });
  return list;
}
function isCaptain(name) {
  if (!name) return false;
  const caps = state.captains || [];
  return caps.some(c => c.toLowerCase() === name.toLowerCase());
}
function formatNameWithNumber(name, options = {}) {
  const num = getPlayerNumber(name);
  const compactCourt = !!options.compactCourt;
  let baseName = formatStructuredPlayerName(name, "our");
  if (compactCourt) {
    baseName = baseName || name || "";
  }
  const base = num ? num + " - " + baseName : baseName;
  const includeCaptain = options.includeCaptain !== false;
  if (includeCaptain && isCaptain(name)) {
    return base + " (K)";
  }
  return base;
}
function formatNameWithNumberFor(name, numbersMap = {}, options = {}) {
  if (!name) return "";
  const raw = numbersMap && numbersMap[name];
  const num = raw !== undefined && raw !== null && raw !== "" ? String(raw) : "";
  const scope = options.scope || (numbersMap === state.opponentPlayerNumbers ? "opponent" : "our");
  let baseName = formatStructuredPlayerName(name, scope);
  if (options.compactCourt) {
    baseName = baseName || name || "";
  }
  const base = num ? num + " - " + baseName : baseName;
  if (options.captainSet && options.captainSet.has(name.toLowerCase())) {
    return base + " (K)";
  }
  return base;
}
const SKILL_SHORT_LABELS = {
  serve: "BA",
  pass: "RI",
  attack: "AT",
  defense: "DF",
  block: "MU",
  second: "AL",
  manual: "MN"
};
function getShortSkill(id) {
  if (!id) return "";
  return SKILL_SHORT_LABELS[id] || id.slice(0, 2).toUpperCase();
}
function getInitials(name) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
}
function buildNumbersForNames(names, provided = {}, previous = state.playerNumbers || {}) {
  const valid = value => {
    const clean = (value || "").trim();
    return clean && /^[0-9]{1,3}$/.test(clean) ? clean : "";
  };
  const hasExplicitEmpty = (obj, key) =>
    obj && Object.prototype.hasOwnProperty.call(obj, key) && String(obj[key]).trim() === "";
  const prev = previous || {};
  const used = new Set();
  const numbers = {};
  names.forEach(name => {
    if (hasExplicitEmpty(provided, name)) {
      numbers[name] = "";
      return;
    }
    const candidates = [valid(provided[name]), valid(prev[name])].filter(Boolean);
    let chosen = "";
    for (const candidate of candidates) {
      if (!used.has(candidate)) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen) {
      let candidate = 1;
      while (used.has(String(candidate))) candidate++;
      chosen = String(candidate);
    }
    numbers[name] = chosen;
    used.add(chosen);
  });
  return numbers;
}
function syncPlayerNumbers(names) {
  state.playerNumbers = buildNumbersForNames(names, {});
}
function syncOpponentPlayerNumbers(names, provided = {}) {
  const numbers = buildNumbersForNames(names, provided, state.opponentPlayerNumbers || {});
  state.opponentPlayerNumbers = numbers;
  return numbers;
}
function cleanOpponentLiberos() {
  const set = new Set(state.opponentPlayers || []);
  state.opponentLiberos = normalizePlayers(state.opponentLiberos || []).filter(name => set.has(name));
}
function ensureOpponentLiberosFromTeam() {
  if (Array.isArray(state.opponentLiberos)) return;
  const selected = state.selectedOpponentTeam || "";
  if (!selected) return;
  const team = loadOpponentTeamFromStorage(selected);
  if (!team) return;
  const roster = extractRosterFromTeam(team);
  if (!roster || !roster.liberos || roster.liberos.length === 0) return;
  const validPlayers = new Set(state.opponentPlayers || roster.players || []);
  state.opponentLiberos = normalizePlayers(roster.liberos).filter(name => validPlayers.has(name));
  cleanOpponentLiberos();
  saveState();
}
function applyDefaultLineup(names = [], rotation = 1) {
  ensureCourtShape();
  const valid = new Set(state.players || []);
  const lineup = Array.isArray(names) ? names.filter(name => name && valid.has(name)) : [];
  state.court = Array.from({ length: 6 }, (_, idx) => ({ main: lineup[idx] || "" }));
  const rot = Number.isFinite(rotation) ? rotation : parseInt(rotation, 10) || 1;
  state.rotation = Math.min(6, Math.max(1, rot));
  autoRoleBaseCourt = null;
  state.autoRoleBaseCourt = null;
  resetAutoRoleCache();
}
function applyOpponentDefaultLineup(names = [], rotation = 1) {
  opponentAutoRoleBaseCourt = null;
  state.opponentAutoRoleBaseCourt = null;
  state.opponentLiberoAutoMap = {};
  const valid = new Set(state.opponentPlayers || []);
  const lineup = Array.isArray(names) ? names.filter(name => name && valid.has(name)) : [];
  state.opponentCourt = Array.from({ length: 6 }, (_, idx) => ({ main: lineup[idx] || "" }));
  const rot = Number.isFinite(rotation) ? rotation : parseInt(rotation, 10) || 1;
  state.opponentRotation = Math.min(6, Math.max(1, rot));
  updateOpponentRotationDisplay();
  if (state.autoRolePositioning) {
    updateOpponentAutoRoleBaseCourtCache(state.opponentCourt);
  }
}
