function getSelectedVideoAttackEvents() {
  if (!(document && document.body && document.body.dataset.activeTab === "video")) return [];
  const rows = getSelectedRows("video");
  return rows
    .map(row => row.ev)
    .filter(ev => ev && ev.skillId === "attack");
}
function getAttackShortcutTargetEvents() {
  const videoEvents = getSelectedVideoAttackEvents();
  if (videoEvents.length) return videoEvents;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  if (activeTab === "scout") {
    const ev = getLastAttackEventForScope();
    return ev ? [ev] : [];
  }
  return [];
}
function applyAttackFieldToEvents(events, updater, { shouldRecalc = true } = {}) {
  const targetEvents = Array.isArray(events) ? events.filter(Boolean) : [];
  if (!targetEvents.length || typeof updater !== "function") return false;
  if (targetEvents.length > 1 || (document && document.body && document.body.dataset.activeTab === "video")) {
    pushVideoUndoSnapshot(true);
  }
  targetEvents.forEach(ev => updater(ev));
  if (document && document.body && document.body.dataset.activeTab === "video") {
    refreshAfterVideoEdit(shouldRecalc);
    renderEventsLog({ suppressScroll: true });
    renderVideoAnalysis();
    updateVideoAnalysisOverlay();
  } else {
    saveState({ persistLocal: true });
    if (shouldRecalc) {
      invalidateAnalysisCaches();
      recalcAllStatsAndUpdateUI();
    }
    renderEventsLog({ suppressScroll: true });
    if (document && document.body && document.body.dataset.activeTab === "video") {
      renderVideoAnalysis();
    }
  }
  return true;
}
function getSetterShortcutScope(events) {
  const scopes = new Set((events || []).map(ev => getTeamScopeFromEvent(ev)));
  if (scopes.size !== 1) return null;
  return Array.from(scopes)[0] || null;
}
function resetAttackShortcutModals() {
  baseModalTargetEvents = [];
  setterModalTargetEvents = [];
  attackTypeModalTargetEvents = [];
  blockNumberModalTargetEvents = [];
  if (elBaseModal) {
    elBaseModal.classList.add("hidden");
  }
  if (elAttackSetterModal) {
    elAttackSetterModal.classList.add("hidden");
  }
  if (elAttackTypeModal) {
    elAttackTypeModal.classList.add("hidden");
  }
  if (elBlockNumberModal) {
    elBlockNumberModal.classList.add("hidden");
  }
  setGlobalModalState(false);
}
function isAttackShortcutModalOpen(modal) {
  return !!modal && !modal.classList.contains("hidden");
}
function toggleBaseModal() {
  if (isAttackShortcutModalOpen(elBaseModal)) closeBaseModal();
  else openBaseModal();
}
function toggleAttackSetterModal() {
  if (isAttackShortcutModalOpen(elAttackSetterModal)) closeAttackSetterModal();
  else openAttackSetterModal();
}
function toggleAttackTypeModal() {
  if (isAttackShortcutModalOpen(elAttackTypeModal)) closeAttackTypeModal();
  else openAttackTypeModal();
}
function toggleBlockNumberModal() {
  if (isAttackShortcutModalOpen(elBlockNumberModal)) closeBlockNumberModal();
  else openBlockNumberModal();
}
function openMatchManagerModal() {
  if (!elMatchManagerModal) return;
  elMatchManagerModal.classList.remove("hidden");
  setGlobalModalState(true);
  if (typeof renderMatchesSelect === "function") renderMatchesSelect();
  if (typeof applyMatchInfoToUI === "function") applyMatchInfoToUI();
  if (typeof renderMatchSummary === "function") renderMatchSummary();
}
function closeMatchManagerModal() {
  if (!elMatchManagerModal) return;
  elMatchManagerModal.classList.add("hidden");
  setGlobalModalState(false);
}
function getLastAttackEventForScope(scope) {
  const events = state.events || [];
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (!ev || ev.skillId !== "attack") continue;
    if (scope && getTeamScopeFromEvent(ev) !== scope) continue;
    return ev;
  }
  return null;
}
function applyBaseToTarget(baseValue) {
  const targetEvents = baseModalTargetEvents || [];
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
function openBaseModal() {
  if (!elBaseModal) return;
  const targetEvents = getAttackShortcutTargetEvents();
  if (!targetEvents.length) {
    alert("Seleziona uno o più attacchi per assegnare la base.");
    return;
  }
  baseModalTargetEvents = targetEvents;
  elBaseModal.classList.remove("hidden");
  setGlobalModalState(true, { forcePopup: true });
}
function closeBaseModal() {
  resetAttackShortcutModals();
}
function renderSetterModalOptions(scope, setterIdx) {
  if (!elAttackSetterModalGrid) return;
  const players = getPlayersForScope(scope) || [];
  const isVideoModal = document && document.body && document.body.dataset.activeTab === "video";
  const baseCourt = scope === "opponent" ? state.opponentCourt : state.court;
  const shaped =
    typeof ensureCourtShapeFor === "function"
      ? ensureCourtShapeFor(baseCourt || [])
      : (typeof getCourtShape === "function" ? getCourtShape(baseCourt || []) : baseCourt || []);
  const inCourtNames = new Set();
  (shaped || []).forEach(slot => {
    if (!slot) return;
    const main = typeof slot === "string" ? slot : slot.main;
    const replaced = typeof slot === "object" ? slot.replaced : "";
    if (main) inCourtNames.add(main);
    if (replaced) inCourtNames.add(replaced);
  });
  if (isVideoModal) {
    getLiberosForScope(scope).forEach(name => {
      if (name) inCourtNames.add(name);
    });
  }
  const numbers = getPlayerNumbersForScope(scope);
  const liberoSet = new Set(getLiberosForScope(scope));
  elAttackSetterModalGrid.innerHTML = "";
  const emptyBtn = document.createElement("button");
  emptyBtn.type = "button";
  emptyBtn.className = "base-modal-btn";
  emptyBtn.dataset.setterIndex = "";
  emptyBtn.textContent = "—";
  elAttackSetterModalGrid.appendChild(emptyBtn);
  players.forEach((name, idx) => {
    if (!inCourtNames.has(name)) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "base-modal-btn";
    if (liberoSet.has(name)) btn.classList.add("player-role-libero");
    if (isSetterPlayerForScope(scope, idx)) btn.classList.add("player-role-setter");
    btn.dataset.setterIndex = String(idx);
    const label =
      scope === "opponent" ? formatNameWithNumberFor(name, numbers) : formatNameWithNumber(name);
    btn.textContent = label || name || "Giocatrice " + (idx + 1);
    if (idx === setterIdx) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => applySetterToTarget(idx));
    elAttackSetterModalGrid.appendChild(btn);
  });
  emptyBtn.addEventListener("click", () => applySetterToTarget(null));
}
function applySetterToTarget(setterIdx) {
  const targetEvents = setterModalTargetEvents || [];
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
function openAttackSetterModal() {
  if (!elAttackSetterModal) return;
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
  setterModalTargetEvents = targetEvents;
  const seed = targetEvents[0];
  const setterIdx = typeof seed.setterIdx === "number" ? seed.setterIdx : null;
  renderSetterModalOptions(scope, setterIdx);
  elAttackSetterModal.classList.remove("hidden");
  setGlobalModalState(true, { forcePopup: true });
}
function closeAttackSetterModal() {
  resetAttackShortcutModals();
}
function applyAttackTypeToTarget(value) {
  const targetEvents = attackTypeModalTargetEvents || [];
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
function openAttackTypeModal() {
  if (!elAttackTypeModal) return;
  const targetEvents = getAttackShortcutTargetEvents();
  if (!targetEvents.length) {
    alert("Seleziona uno o più attacchi per assegnare il tipo.");
    return;
  }
  attackTypeModalTargetEvents = targetEvents;
  if (elAttackTypeModalGrid) {
    elAttackTypeModalGrid.querySelectorAll(".base-modal-btn").forEach(btn => {
      if (btn._attackTypeBound) return;
      btn._attackTypeBound = true;
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        const value = btn.dataset.attackType;
        if (value) applyAttackTypeToTarget(value);
      });
    });
  }
  elAttackTypeModal.classList.remove("hidden");
  setGlobalModalState(true, { forcePopup: true });
}
function closeAttackTypeModal() {
  resetAttackShortcutModals();
}
function applyBlockNumberToTarget(value) {
  const targetEvents = blockNumberModalTargetEvents || [];
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
function openBlockNumberModal() {
  if (!elBlockNumberModal) return;
  const targetEvents = getAttackShortcutTargetEvents();
  if (!targetEvents.length) {
    alert("Seleziona uno o più attacchi per assegnare il muro.");
    return;
  }
  blockNumberModalTargetEvents = targetEvents;
  elBlockNumberModal.classList.remove("hidden");
  setGlobalModalState(true, { forcePopup: true });
}
function closeBlockNumberModal() {
  resetAttackShortcutModals();
}
function buildPlayersDbUsage(teamsMap) {
  const usage = {};
  Object.entries(teamsMap || {}).forEach(([teamName, teamData]) => {
    const normalized =
      typeof normalizeTeamPayload === "function" ? normalizeTeamPayload(teamData, teamName) : teamData;
    const roster = normalized && Array.isArray(normalized.playersDetailed) ? normalized.playersDetailed : [];
    roster.forEach(player => {
      const id = player && (player.id || player.playerId);
      if (!id) return;
      if (!usage[id]) usage[id] = [];
      usage[id].push(teamName);
    });
  });
  Object.keys(usage).forEach(id => {
    usage[id] = usage[id].filter(Boolean).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
  });
  return usage;
}
function buildPlayersDbOptions(entries) {
  return (entries || []).map(entry => {
    const name =
      entry.name ||
      (typeof buildFullName === "function" ? buildFullName(entry.lastName, entry.firstName) : "") ||
      [entry.lastName, entry.firstName].filter(Boolean).join(" ");
    const label = (name || "Giocatrice") + " · " + entry.id;
    return { id: entry.id, label };
  });
}
function renderPlayersDbMergeControls(entries) {
  if (!elPlayersDbMergePrimary || !elPlayersDbMergeSecondary || !elBtnMergePlayers) return;
  const options = buildPlayersDbOptions(entries);
  const fillSelect = select => {
    select.innerHTML = "";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "-";
    select.appendChild(emptyOpt);
    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.id;
      option.textContent = opt.label;
      select.appendChild(option);
    });
    if (!select.value && options.length > 0) {
      select.value = options[0].id;
    }
  };
  fillSelect(elPlayersDbMergePrimary);
  fillSelect(elPlayersDbMergeSecondary);
  if (options.length > 1 && elPlayersDbMergeSecondary.value === elPlayersDbMergePrimary.value) {
    elPlayersDbMergeSecondary.value = options[1].id;
  }
  elBtnMergePlayers.disabled = options.length < 2;
}
function renderPlayersDbList() {
  if (!elPlayersDbBody || !elPlayersDbCount) return;
  const db = state.playersDb || {};
  const teamsMap = typeof loadTeamsMapFromStorage === "function" ? loadTeamsMapFromStorage() : state.savedTeams || {};
  const usage = buildPlayersDbUsage(teamsMap);
  const entries = Object.values(db).filter(entry => {
    if (!entry || !entry.id) return false;
    if (typeof isTemplatePlayerName === "function" && isTemplatePlayerName(entry.name)) return false;
    return true;
  });
  entries.sort((a, b) => {
    const lastA = (a.lastName || "").trim();
    const lastB = (b.lastName || "").trim();
    const firstA = (a.firstName || "").trim();
    const firstB = (b.firstName || "").trim();
    const nameA = (a.name || "").trim();
    const nameB = (b.name || "").trim();
    if (lastA && lastB && lastA !== lastB) return lastA.localeCompare(lastB, "it", { sensitivity: "base" });
    if (firstA && firstB && firstA !== firstB) return firstA.localeCompare(firstB, "it", { sensitivity: "base" });
    return nameA.localeCompare(nameB, "it", { sensitivity: "base" });
  });
  elPlayersDbBody.innerHTML = "";
  if (entries.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Nessuna giocatrice nell'archivio.";
    tr.appendChild(td);
    elPlayersDbBody.appendChild(tr);
    elPlayersDbCount.textContent = "0 giocatrici";
    renderPlayersDbMergeControls([]);
    return;
  }
  const orphanCount = entries.filter(entry => !usage[entry.id] || usage[entry.id].length === 0).length;
  entries.forEach(entry => {
    const tr = document.createElement("tr");
    const tdLast = document.createElement("td");
    const tdFirst = document.createElement("td");
    const tdPhoto = document.createElement("td");
    const tdTeams = document.createElement("td");
    const tdId = document.createElement("td");
    tdLast.textContent = entry.lastName || "";
    tdFirst.textContent = entry.firstName || "";
    const photoWrap = document.createElement("div");
    photoWrap.className = "players-db-photo-cell";
    const photoPreview = document.createElement("div");
    photoPreview.className = "players-db-photo-preview" + (entry.photo ? "" : " empty");
    if (entry.photo) {
      photoPreview.style.backgroundImage = `url(${JSON.stringify(entry.photo)})`;
    }
    photoPreview.setAttribute("role", "button");
    photoPreview.tabIndex = 0;
    photoPreview.title = entry.photo ? "Modifica foto" : "Aggiungi foto";
    photoPreview.setAttribute("aria-label", entry.photo ? "Modifica foto" : "Aggiungi foto");
    const handlePhotoClick = async () => {
      try {
        let photo = "";
        if (entry.photo && typeof openPlayerPhotoEditor === "function") {
          const edited = await openPlayerPhotoEditor(entry.photo, { allowRemove: true });
          if (edited === PLAYER_PHOTO_REMOVE_RESULT) {
            updatePlayerPhotoInDbAndTeams(entry.id, "");
            return;
          }
          photo = edited || "";
        } else {
          const file =
            typeof pickImageFile === "function" ? await pickImageFile("image/*") : null;
          if (!file) return;
          photo =
            typeof preparePlayerPhotoDataUrl === "function"
              ? await preparePlayerPhotoDataUrl(file)
              : "";
        }
        if (!photo) return;
        updatePlayerPhotoInDbAndTeams(entry.id, photo);
      } catch (err) {
        logError("Errore caricamento foto archivio giocatrici", err);
        alert("Immagine non valida o non caricabile.");
      }
    };
    photoPreview.addEventListener("click", handlePhotoClick);
    photoPreview.addEventListener("keydown", ev => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      handlePhotoClick();
    });
    photoWrap.appendChild(photoPreview);
    tdPhoto.appendChild(photoWrap);
    tdTeams.textContent = (usage[entry.id] || []).join(", ") || "—";
    tdId.textContent = entry.id || "";
    tr.appendChild(tdLast);
    tr.appendChild(tdFirst);
    tr.appendChild(tdPhoto);
    tr.appendChild(tdTeams);
    tr.appendChild(tdId);
    elPlayersDbBody.appendChild(tr);
  });
  elPlayersDbCount.textContent =
    entries.length + " giocatrici" + (orphanCount > 0 ? " · " + orphanCount + " senza squadra" : "");
  renderPlayersDbMergeControls(entries);
}
function openPlayersDbModal() {
  if (!elPlayersDbModal) return;
  renderPlayersDbList();
  elPlayersDbModal.classList.remove("hidden");
  setGlobalModalState(true);
}
function closePlayersDbModal() {
  if (!elPlayersDbModal) return;
  elPlayersDbModal.classList.add("hidden");
  setGlobalModalState(false);
}
function openDebugModal() {
  if (!elDebugModal) return;
  elDebugModal.classList.remove("hidden");
  setGlobalModalState(true);
}
function closeDebugModal() {
  if (!elDebugModal) return;
  elDebugModal.classList.add("hidden");
  setGlobalModalState(false);
}
function syncOpponentSettingsUI() {
  const enabled = !!state.useOpponentTeam;
  const wasEnabled = lastUseOpponentTeamState;
  if (elUseOpponentTeamToggle) elUseOpponentTeamToggle.checked = enabled;
  if (elOpponentTeamSettings) {
    elOpponentTeamSettings.classList.toggle("hidden", !enabled);
  }
  if (elSingleTeamScoreActions) {
    elSingleTeamScoreActions.classList.toggle("hidden", enabled);
  }
  if (elBtnFreeballOppSingle) {
    elBtnFreeballOppSingle.classList.toggle("hidden", enabled);
  }
  const opponentPanel = document.querySelector('[data-team-panel="opponent"]');
  if (opponentPanel) {
    opponentPanel.classList.remove("hidden");
    opponentPanel
      .querySelectorAll(".score-actions, .team-controls-panel, .opponent-bench")
      .forEach(node => node.classList.toggle("hidden", !enabled));
  }
  const opponentSettingsPanel = document.querySelector('[data-team-panel="opponent-settings"]');
  if (opponentSettingsPanel) {
    opponentSettingsPanel.classList.toggle("hidden", !enabled);
  }
  if (enabled) {
    if (state.match && typeof state.match.opponentManual === "undefined") {
      state.match.opponentManual = state.match.opponent || "";
    }
    if (state.selectedOpponentTeam) {
      state.match.opponent = state.selectedOpponentTeam;
    }
    saveState();
  }
  if (!enabled) {
    if (state.match && typeof state.match.opponentManual === "string") {
      state.match.opponent = state.match.opponentManual;
    }
    if (wasEnabled === true) {
      state.courtSideSwapped = false;
      state.courtViewMirrored = false;
      state.opponentCourtViewMirrored = false;
    }
    saveState();
  }
  lastUseOpponentTeamState = enabled;
  if (typeof syncCourtSideLayout === "function") {
    syncCourtSideLayout();
  }
  relocateVideoScoutContainer();
  if (typeof renderPlayers === "function") {
    renderPlayers();
  }
  if (typeof applyMatchInfoToUI === "function") {
    applyMatchInfoToUI();
  }
  // Fallback hard sync to avoid stale UI when toggling teams.
  const singleFreeballBtn = document.getElementById("btn-freeball-opp-single");
  if (singleFreeballBtn) {
    singleFreeballBtn.classList.toggle("hidden", enabled);
  }
}
function renderTeamsManagerList() {
  if (!elTeamsManagerList) return;
  const names = typeof listTeamsFromStorage === "function" ? listTeamsFromStorage() : [];
  if (!names.includes(teamsManagerSelectedName)) {
    teamsManagerSelectedName = "";
  }
  elTeamsManagerList.innerHTML = "";
  if (names.length === 0) {
    const empty = document.createElement("li");
    empty.className = "teams-manager-item";
    empty.textContent = "Nessuna squadra salvata.";
    elTeamsManagerList.appendChild(empty);
  } else {
    names.forEach(name => {
      const item = document.createElement("li");
      item.className = "teams-manager-item" + (name === teamsManagerSelectedName ? " selected" : "");
      item.dataset.teamName = name;
      item.textContent = name;
      item.addEventListener("click", () => {
        teamsManagerSelectedName = name;
        renderTeamsManagerList();
      });
      elTeamsManagerList.appendChild(item);
    });
  }
  renderTeamMergeControls();
  const hasSelection = !!teamsManagerSelectedName;
  if (elTeamsManagerOpenTeam) elTeamsManagerOpenTeam.disabled = !hasSelection;
  if (elTeamsManagerDelete) elTeamsManagerDelete.disabled = !hasSelection;
  if (elTeamsManagerDuplicate) elTeamsManagerDuplicate.disabled = !hasSelection;
  if (elTeamsManagerExport) elTeamsManagerExport.disabled = !hasSelection;
}
function openTeamsManagerModal() {
  if (!elTeamsManagerModal) return;
  teamsManagerSelectedName = state.selectedTeam || "";
  renderTeamsManagerList();
  elTeamsManagerModal.classList.remove("hidden");
  setGlobalModalState(true);
}
function closeTeamsManagerModal() {
  if (!elTeamsManagerModal) return;
  elTeamsManagerModal.classList.add("hidden");
  setGlobalModalState(false);
}
function importTeamToStorageOnly(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const raw = evt && evt.target ? String(evt.target.result || "") : "";
      const data = JSON.parse(raw);
      const normalized =
        typeof normalizeTeamPayload === "function" ? normalizeTeamPayload(data) : data;
      const name = normalized && normalized.name ? normalized.name.trim() : "";
      if (!name) {
        alert("Il file non contiene un nome squadra valido.");
        return;
      }
      const roster =
        typeof extractRosterFromTeam === "function" ? extractRosterFromTeam(normalized) : normalized;
      if (!roster || !Array.isArray(roster.players) || roster.players.length === 0) {
        alert("Il file non contiene giocatrici valide.");
        return;
      }
      if (typeof saveTeamToStorage === "function") {
        if (!saveTeamToStorage(name, normalized)) {
          alert("Impossibile archiviare la squadra. Controlla lo spazio disponibile nel browser.");
          return;
        }
      }
      if (typeof syncTeamsFromStorage === "function") syncTeamsFromStorage();
      if (typeof renderTeamsSelect === "function") renderTeamsSelect();
      teamsManagerSelectedName = name;
      renderTeamsManagerList();
      alert("Squadra importata: " + name);
    } catch (err) {
      logError("Errore importazione squadra (manager)", err);
      alert("File squadra non valido.");
    }
  };
  reader.readAsText(file);
}
function removeOrphanPlayersFromDb() {
  const teamsMap = typeof loadTeamsMapFromStorage === "function" ? loadTeamsMapFromStorage() : state.savedTeams || {};
  const usage = buildPlayersDbUsage(teamsMap);
  const db = Object.assign({}, state.playersDb || {});
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
  state.playersDb = db;
  if (typeof savePlayersDbToStorage === "function") {
    savePlayersDbToStorage(db);
  }
  renderPlayersDbList();
}
// Shared preparation for both the player archive and team merges. No writes here.
function buildPlayersMergePlan(idMap, rosterPlayers = []) {
  const db = { ...loadPlayersDbFromStorage(), ...state.playersDb };
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
  const currentName = state.loadedMatchName || state.selectedMatch || "";
  if (currentName && matches[currentName] && typeof getCurrentMatchPayload === "function") {
    matches[currentName] = rewrite(getCurrentMatchPayload(currentName));
  }
  const nextState = rewrite(state);
  Object.assign(nextState, { playersDb: db, savedTeams: teams, savedOpponentTeams: teams, savedMatches: matches, lastSavedAt: Date.now() });
  return { teams, matches, db, nextState };
}
function mergePlayersDbEntries(primaryId, secondaryId) {
  if (!primaryId || !secondaryId || primaryId === secondaryId) return false;
  try {
    commitArchiveMerge(buildPlayersMergePlan(new Map([[secondaryId, primaryId]])));
    return true;
  } catch (error) {
    logError("Errore unione giocatrici", error);
    return false;
  }
}
function updatePlayerPhotoInDbAndTeams(playerId, photoDataUrl = "") {
  if (!playerId) return false;
  const db = Object.assign({}, state.playersDb || {});
  const current = db[playerId];
  if (!current) return false;
  db[playerId] = Object.assign({}, current, {
    photo: typeof photoDataUrl === "string" ? photoDataUrl : ""
  });
  state.playersDb = db;
  if (typeof savePlayersDbToStorage === "function") {
    savePlayersDbToStorage(db);
  }
  const teamsMap = typeof loadTeamsMapFromStorage === "function" ? loadTeamsMapFromStorage() : {};
  Object.entries(teamsMap || {}).forEach(([teamName, team]) => {
    const normalized = typeof normalizeTeamPayload === "function" ? normalizeTeamPayload(team, teamName) : team;
    if (!normalized || !Array.isArray(normalized.playersDetailed)) return;
    let changed = false;
    normalized.playersDetailed = normalized.playersDetailed.map(player => {
      const id = player && (player.id || player.playerId);
      if (id !== playerId) return player;
      changed = true;
      return Object.assign({}, player, { photo: typeof photoDataUrl === "string" ? photoDataUrl : "" });
    });
    if (changed && typeof saveTeamToStorage === "function") {
      saveTeamToStorage(teamName, normalized);
    }
  });
  invalidateRosterIdMapsCache();
  renderPlayersDbList();
  if (typeof renderPlayers === "function") {
    renderPlayers();
  }
  if (typeof renderPlayerAnalysis === "function") {
    renderPlayerAnalysis();
  }
  return true;
}
const BULK_EDIT_CONFIG = {
  videoTime: {
    label: "Tempo video",
    build: ({ proxy, context }) => {
      const baseMs = context && typeof context.baseMs === "number" ? context.baseMs : null;
      const first = proxy && proxy.t ? computeEventVideoTime(proxy, baseMs) : 0;
      return createVideoTimeInput(proxy, first, () => {});
    }
  },
  set: {
    label: "Set",
    build: ({ proxy }) => createNumberSelect(proxy, "set", 1, 5, () => {})
  },
  player: {
    label: "Giocatrice",
    build: ({ proxy }) => createPlayerSelect(proxy, () => {})
  },
  setter: {
    label: "Alzatore",
    build: ({ proxy }) => createPlayerSelect(proxy, () => {}, { target: "setter" })
  },
  skill: {
    label: "Fondamentale",
    build: ({ proxy }) => createSkillSelect(proxy, () => {})
  },
  code: {
    label: "Codice",
    build: ({ proxy }) => createCodeSelect(proxy, () => {})
  },
  rotation: {
    label: "Rotazione",
    build: ({ proxy }) => createNumberSelect(proxy, "rotation", 1, 6, () => {})
  },
  zone: {
    label: "Zona",
    build: ({ proxy }) => createNumberSelect(proxy, "zone", 1, 6, () => {})
  },
  setterPosition: {
    label: "Posizione palleggio",
    build: ({ proxy }) => createNumberSelect(proxy, "setterPosition", 1, 6, () => {})
  },
  opponentSetterPosition: {
    label: "Posizione palleggio avv",
    build: ({ proxy }) => createNumberSelect(proxy, "opponentSetterPosition", 1, 6, () => {})
  },
  receivePosition: {
    label: "Zona ricezione",
    build: ({ proxy }) => createNumberSelect(proxy, "receivePosition", 1, 6, () => {})
  },
  base: {
    label: "Base",
    build: ({ proxy }) => createBaseSelect(proxy, () => {})
  },
  setType: {
    label: "Tipo alzata",
    build: ({ proxy }) => createSetTypeSelect(proxy, () => {})
  },
  combination: {
    label: "Combinazione",
    build: ({ proxy }) => createTextInput(proxy, "combination", () => {})
  },
  serveType: {
    label: "Tipo servizio",
    build: ({ proxy }) => createServeTypeSelect(proxy, () => {})
  },
  receiveEvaluation: {
    label: "Valutazione ricezione",
    build: ({ proxy }) => createEvalSelect(proxy, "receiveEvaluation", () => {}, { includeFb: true })
  },
  attackEvaluation: {
    label: "Valutazione attacco",
    build: ({ proxy }) => createEvalSelect(proxy, "attackEvaluation", () => {})
  },
  attackBp: {
    label: "Fase attacco",
    build: ({ proxy }) => createPhaseSelect(proxy, () => {})
  },
  attackType: {
    label: "Tipo attacco",
    build: ({ proxy }) => createTextInput(proxy, "attackType", () => {})
  },
  blockNumber: {
    label: "Numero muro",
    build: ({ proxy }) => createNumberInput(proxy, "blockNumber", 0, undefined, () => {})
  },
  playerIn: {
    label: "In",
    build: ({ proxy }) => createPlayerNameSelect(proxy, "playerIn", () => {})
  },
  playerOut: {
    label: "Out",
    build: ({ proxy }) => createPlayerNameSelect(proxy, "playerOut", () => {})
  },
  durationMs: {
    label: "Durata (ms)",
    build: ({ proxy }) => createNumberInput(proxy, "durationMs", 0, undefined, () => {})
  }
};
const elBtnFreeball = document.getElementById("btn-freeball");
const elBtnFreeballOpp = document.getElementById("btn-freeball-opp");
const elBtnFreeballOppSingle = document.getElementById("btn-freeball-opp-single");
const elBtnAttackBase = document.getElementById("btn-attack-base");
const elBtnAttackSetter = document.getElementById("btn-attack-setter");
const elBtnAttackType = document.getElementById("btn-attack-type");
const elBtnBlockNumber = document.getElementById("btn-block-number");
const elNetActionsDefault = document.getElementById("net-actions-default");
const elBtnNetBlockPrompt = document.getElementById("btn-net-block-prompt");
const elBtnToggleCourtView = document.getElementById("btn-toggle-court-view");
const elNextSkillIndicator = document.getElementById("next-skill-indicator");
const elSetTypeShortcuts = document.getElementById("set-type-shortcuts");
const elSetTypeCurrent = document.getElementById("set-type-current");
const elBtnOffsetSkills = document.getElementById("btn-offset-skills");
const elBtnVideoUndo = document.getElementById("btn-video-undo");
const elOffsetModal = document.getElementById("offset-modal");
const elOffsetSkillGrid = document.getElementById("offset-skill-grid");
const elOffsetClose = document.getElementById("offset-close");
const elOffsetApply = document.getElementById("offset-apply");
const elBtnUnifyTimes = document.getElementById("btn-unify-times");
const elUnifyTimesModal = document.getElementById("unify-times-modal");
const elUnifyTimesGrid = document.getElementById("unify-times-grid");
const elUnifyTimesClose = document.getElementById("unify-times-close");
const elUnifyTimesApply = document.getElementById("unify-times-apply");
const elBtnSkillDuration = document.getElementById("btn-skill-duration");
const elSkillDurationModal = document.getElementById("skill-duration-modal");
const elSkillDurationGrid = document.getElementById("skill-duration-grid");
const elSkillDurationClose = document.getElementById("skill-duration-close");
const elSkillDurationApply = document.getElementById("skill-duration-apply");
const elBtnTimeout = document.getElementById("btn-timeout");
const elBtnTimeoutOpp = document.getElementById("btn-timeout-opp");
const elDvwScoutInput = document.getElementById("dvw-scout-input");
const elBtnDvwScoutApply = document.getElementById("btn-dvw-scout-apply");
const elBtnDvwScoutClear = document.getElementById("btn-dvw-scout-clear");
const elBtnDvwScoutHelp = document.getElementById("btn-dvw-scout-help");
const elDvwScoutPending = document.getElementById("dvw-scout-pending");
const elDvwScoutBreakdown = document.getElementById("dvw-scout-breakdown");
const elDvwScoutStatus = document.getElementById("dvw-scout-status");
const elDvwScoutLastCode = document.getElementById("dvw-scout-last-code");
const elTimeoutCount = document.getElementById("timeout-count");
const elTimeoutOppCount = document.getElementById("timeout-opp-count");
const elSubstitutionRemaining = document.getElementById("substitution-remaining");
const elSubstitutionRemainingOpp = document.getElementById("substitution-remaining-opp");
const elBaseModal = document.getElementById("base-modal");
const elBaseModalClose = document.getElementById("base-modal-close");
const elBaseModalGrid = document.getElementById("base-modal-grid");
const elAttackTypeModal = document.getElementById("attack-type-modal");
const elAttackTypeModalClose = document.getElementById("attack-type-modal-close");
const elAttackTypeModalGrid = document.getElementById("attack-type-modal-grid");
const elAttackSetterModal = document.getElementById("attack-setter-modal");
const elAttackSetterModalClose = document.getElementById("attack-setter-modal-close");
const elAttackSetterModalGrid = document.getElementById("attack-setter-modal-grid");
const elBlockNumberModal = document.getElementById("block-number-modal");
const elBlockNumberModalClose = document.getElementById("block-number-modal-close");
const elBlockNumberModalGrid = document.getElementById("block-number-modal-grid");
const LOCAL_VIDEO_DB = "volley-video-db";
const LOCAL_VIDEO_STORE = "videos";
const LOCAL_VIDEO_HANDLE_KEY = "current-handle";
const TAB_ORDER = ["match", "info", "scout", "aggregated", "video"];
let dvwScoutPendingTokens = [];
function buildReceiveDisplayMapping(court, rotation, scope = "our") {
  if (typeof buildAutoRolePermutation === "function") {
    const perm =
      buildAutoRolePermutation({
        baseLineup: court,
        rotation,
        phase: "receive",
        isServing: state.isServing,
        autoRoleP1American: scope === "opponent"
          ? !!state.opponentAutoRoleP1American
          : !!state.autoRoleP1American
      }) || [];
    return perm.map(item => ({
      slot: (item && item.slot) || { main: "", replaced: "" },
      idx: typeof item.idx === "number" ? item.idx : 0
    }));
  }
  const base = ensureCourtShapeFor(court);
  const mapping = base.map((slot, idx) => ({ slot, idx }));
  const rot = Math.min(6, Math.max(1, parseInt(rotation, 10) || 1));
  if (typeof INTELLISCOUT_RECEIVE_ASSIGNMENTS !== "undefined") {
    const pairs = INTELLISCOUT_RECEIVE_ASSIGNMENTS[rot] || [];
    const snapshot = mapping.slice();
    pairs.forEach(([targetIdx, sourceIdx]) => {
      if (targetIdx == null || sourceIdx == null) return;
      if (!snapshot[sourceIdx]) return;
      mapping[targetIdx] = snapshot[sourceIdx];
    });
    return mapping;
  }
  if (typeof applyReceivePattern === "function") {
    return applyReceivePattern(mapping, rot);
  }
  return mapping;
}
function getAutoRoleDisplayCourt(forSkillId = null, scope = "our") {
  const useAuto = !!state.autoRolePositioning;
  if (useAuto && typeof sanitizeAutoRoleBaseCourtForScope === "function") {
    sanitizeAutoRoleBaseCourtForScope(scope);
  }
  const opponentBase =
    useAuto && scope === "opponent" && state.opponentAutoRoleBaseCourt && state.opponentAutoRoleBaseCourt.length === 6
      ? ensureCourtShapeFor(state.opponentAutoRoleBaseCourt)
      : ensureCourtShapeFor(state.opponentCourt);
  const baseCourt =
    useAuto && scope === "our" && autoRoleBaseCourt
      ? ensureCourtShapeFor(autoRoleBaseCourt)
      : scope === "opponent"
        ? opponentBase
        : ensureCourtShapeFor(state.court);
  const effectiveBase = baseCourt;
  if (!useAuto) {
    return effectiveBase.map((slot, idx) => ({ slot, idx }));
  }
  if (forSkillId === "serve") {
    const servingCourt = getServeDisplayCourt(scope);
    return ensureCourtShapeFor(servingCourt || effectiveBase).map((slot, idx) => ({ slot, idx }));
  }
  if (forSkillId === "pass") {
    const rotation = scope === "opponent" ? state.opponentRotation : state.rotation;
    return buildReceiveDisplayMapping(effectiveBase, rotation || 1, scope);
  }
  const phase = forSkillId ? getCurrentPhase(scope) : isServingForScope(scope) ? "attack" : "receive";
  if (typeof buildAutoRolePermutation === "function") {
    const perm =
      buildAutoRolePermutation({
        baseLineup: effectiveBase,
        rotation: scope === "opponent" ? state.opponentRotation || 1 : state.rotation || 1,
        phase,
        isServing: scope === "opponent" ? !state.isServing : state.isServing,
        autoRoleP1American: scope === "opponent"
          ? !!state.opponentAutoRoleP1American
          : !!state.autoRoleP1American
      }) || [];
    return perm.map(item => ({
      slot: (item && item.slot) || { main: "", replaced: "" },
      idx: typeof item.idx === "number" ? item.idx : 0
    }));
  }
  return ensureCourtShapeFor(effectiveBase).map((slot, idx) => ({ slot, idx }));
}

// Team merges preserve historical names, numbers and court positions; identity links change.
function buildTeamMerge(primaryName, secondaryName, choices) {
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
function commitTeamMerge(primaryName, secondaryName, choices) {
  commitArchiveMerge(buildTeamMerge(primaryName, secondaryName, choices), [getTeamStorageKey(secondaryName)]);
}
function commitArchiveMerge(plan, removedKeys = []) {
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
  const previous = new Map([...writes.keys()].map(key => [key, localStorage.getItem(key)]));
  const changed = [];
  try {
    writes.forEach((value, key) => {
      if (value === previous.get(key)) return;
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      changed.push(key);
    });
  } catch (error) {
    changed.reverse().forEach(key => {
      const old = previous.get(key);
      if (old === null) localStorage.removeItem(key);
      else localStorage.setItem(key, old);
    });
    throw new Error("Salvataggio non riuscito. Unione annullata: " + error.message);
  }
  Object.assign(state, plan.nextState);
  writeStateToIndexedDb(snapshot);
}
function renderTeamMergeControls() {
  const panel = document.getElementById("team-merge-panel");
  if (!panel) return;
  panel.replaceChildren();
  const names = listTeamsFromStorage().filter(name => name !== teamsManagerSelectedName);
  if (!teamsManagerSelectedName || !names.length) return;
  const title = document.createElement("h4");
  title.textContent = "Unisci in “" + teamsManagerSelectedName + "”";
  const label = document.createElement("label");
  label.textContent = "Squadra da unire ed eliminare";
  const select = document.createElement("select");
  select.setAttribute("aria-label", label.textContent);
  select.add(new Option("Seleziona una squadra…", ""));
  names.forEach(name => select.add(new Option(name, name)));
  label.append(select);
  const details = document.createElement("div");
  panel.append(title, label, details);
  select.addEventListener("change", () => {
    details.replaceChildren();
    if (!select.value) return;
    const primary = loadTeamNormalized(teamsManagerSelectedName);
    const secondary = loadTeamNormalized(select.value);
    if (!primary || !secondary) return;
    const note = document.createElement("p");
    note.className = "section-note";
    note.textContent = "Verifica gli abbinamenti. Le giocatrici non abbinate saranno aggiunte. In caso di conflitto si mantengono i dati della squadra scelta; nomi e numeri storici delle partite restano invariati.";
    details.append(note);
    const choices = {};
    secondary.playersDetailed.forEach(player => {
      const row = document.createElement("label");
      row.className = "controls-row";
      row.append(document.createTextNode(player.name + " → "));
      const picker = document.createElement("select");
      picker.setAttribute("aria-label", "Abbina " + player.name);
      picker.add(new Option("Aggiungi alla rosa", ""));
      primary.playersDetailed.forEach(p => picker.add(new Option(p.name, p.id)));
      const match = primary.playersDetailed.find(p => p.id === player.id) || primary.playersDetailed.find(p => p.name.toLowerCase() === player.name.toLowerCase());
      picker.value = match ? match.id : "";
      if (primary.playersDetailed.some(p => p.id === player.id)) picker.disabled = true;
      choices[player.id] = picker.value;
      picker.addEventListener("change", () => { choices[player.id] = picker.value; });
      row.append(picker);
      details.append(row);
    });
    const button = document.createElement("button");
    button.className = "danger";
    button.textContent = "Unisci squadre";
    button.addEventListener("click", () => {
      const primaryName = teamsManagerSelectedName;
      const secondaryName = select.value;
      try {
        buildTeamMerge(primaryName, secondaryName, choices);
        if (!confirm("Unire “" + secondaryName + "” in “" + primaryName + "”? Le partite saranno ricollegate e “" + secondaryName + "” sarà eliminata. Gli ID delle giocatrici abbinate saranno unificati anche nelle altre squadre e partite.")) return;
        commitTeamMerge(primaryName, secondaryName, choices);
      } catch (error) {
        alert(error.message);
        return;
      }
      renderTeamsManagerList();
      renderTeamsSelect();
      renderOpponentTeamsSelect();
      if (typeof applyMatchInfoToUI === "function") applyMatchInfoToUI();
      alert("Squadre unite e partite aggiornate.");
    });
    details.append(button);
  });
}
