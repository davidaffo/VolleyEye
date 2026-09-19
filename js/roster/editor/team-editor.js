function buildTemplateNumbers() {
  const numbers = {};
  TEMPLATE_TEAM.players.forEach((name, idx) => {
    numbers[name] = String(idx + 1);
  });
  return numbers;
}
function buildRoleBasedDefaultLineup(names = []) {
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
function applyTemplateTeam(options = {}) {
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
function applyTemplateRoster(scope = "our", options = {}) {
  if (scope === "opponent") {
    updateOpponentPlayersList(TEMPLATE_TEAM.players, {
      liberos: TEMPLATE_TEAM.liberos,
      playerNumbers: buildTemplateNumbers(),
      captains: []
    });
    applyOpponentDefaultLineup(buildRoleBasedDefaultLineup(TEMPLATE_TEAM.players), 1);
    state.opponentPreferredLibero = TEMPLATE_TEAM.liberos[0] || "";
    if (typeof renderOpponentPlayers === "function") {
      renderOpponentPlayers();
    }
    return;
  }
  applyTemplateTeam(options);
}
function buildTeamManagerStateFromSource(source, scope = "our") {
  const isOpponent = scope === "opponent";
  const normalized = source ? normalizeTeamPayload(source) : null;
  const basePlayers = isOpponent ? state.opponentPlayers || [] : state.players || [];
  const baseNumbers = isOpponent ? state.opponentPlayerNumbers || {} : state.playerNumbers || {};
  const baseLiberos = isOpponent ? state.opponentLiberos || [] : state.liberos || [];
  const sourceCaptains = normalized
    ? normalized.captains || []
    : isOpponent
      ? state.opponentCaptains || []
      : state.captains || [];
  const sourceLiberos = normalized ? normalized.liberos || [] : baseLiberos;
  const captainSet = new Set(sourceCaptains);
  const playersDetailed =
    normalized && normalized.playersDetailed && normalized.playersDetailed.length > 0
      ? normalized.playersDetailed.map(p => {
          const fullName = buildFullName(p.lastName, p.firstName);
          const isLib = sourceLiberos.includes(fullName) || p.role === "L";
          const fallbackNumber = baseNumbers[fullName] || (p.name && baseNumbers[p.name]) || "";
          const dbEntry =
            (state.playersDb && state.playersDb[p.id]) || findPlayersDbMatchByFullName(fullName, p.id) || null;
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
          const db = Object.assign({}, state.playersDb || {});
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
            state.playersDb = db;
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
      (isOpponent ? state.selectedOpponentTeam : state.selectedTeam) ||
      state.match.opponent ||
      (isOpponent ? "Avversaria" : "Squadra"),
    staff: (normalized && normalized.staff) || Object.assign({}, DEFAULT_STAFF),
    officialCode: (normalized && normalized.officialCode) || "",
    officialId: (normalized && normalized.officialId) || "",
    players: playersDetailed,
    defaultLineup,
    defaultRotation: (normalized && normalized.defaultRotation) || 1,
    preferredLibero
  };
}
function renderTeamManagerTable() {
  if (!elTeamManagerBody || !teamManagerState) return;
  elTeamManagerBody.innerHTML = "";
  const isEmpty = !teamManagerState.players || teamManagerState.players.length === 0;
  if (elTeamManagerTemplate) {
    elTeamManagerTemplate.classList.toggle("hidden", !isEmpty);
  }
  const players = (teamManagerState.players || []).map((player, idx) => ({ player, idx }));
  players.sort((a, b) => {
    const numA =
      a.player.number !== undefined && a.player.number !== null && a.player.number !== ""
        ? parseInt(a.player.number, 10)
        : null;
    const numB =
      b.player.number !== undefined && b.player.number !== null && b.player.number !== ""
        ? parseInt(b.player.number, 10)
        : null;
    const cleanA = Number.isFinite(numA) ? numA : null;
    const cleanB = Number.isFinite(numB) ? numB : null;
    if (cleanA === null && cleanB === null) {
      return a.idx - b.idx;
    }
    if (cleanA === null) return -1;
    if (cleanB === null) return 1;
    if (cleanA !== cleanB) return cleanA - cleanB;
    return (a.player.name || "").localeCompare(b.player.name || "", "it", { sensitivity: "base" });
  });
  players.forEach(({ player: p }) => {
    if (!isValidPlayerId(p.id)) {
      p.id = generatePlayerId();
    }
    const tr = document.createElement("tr");
    tr.className = "team-manager-row";
    const isLibero = String(p.role || "").toUpperCase() === "L";
    if (isLibero) tr.classList.add("team-manager-row--libero");
    if (p.out) tr.classList.add("team-manager-row--out");
    const numberInput = document.createElement("input");
    numberInput.type = "number";
    numberInput.min = "0";
    numberInput.max = "99";
    numberInput.value = p.number || "";
    numberInput.addEventListener("change", () => {
      p.number = numberInput.value;
      renderTeamManagerTable();
    });
    const lastNameInput = document.createElement("input");
    lastNameInput.type = "text";
    lastNameInput.placeholder = "Cognome";
    lastNameInput.value = p.lastName || (!p.firstName ? p.name : "") || "";
    const firstNameInput = document.createElement("input");
    firstNameInput.type = "text";
    firstNameInput.placeholder = "Nome";
    firstNameInput.value = p.firstName || "";
    const photoCell = document.createElement("div");
    photoCell.className = "team-manager-photo-cell";
    const photoPreview = document.createElement("button");
    photoPreview.type = "button";
    photoPreview.className = "team-manager-photo-preview" + (p.photo ? "" : " empty");
    photoPreview.title = p.photo ? "Modifica foto" : "Aggiungi foto";
    photoPreview.setAttribute("aria-label", p.photo ? "Modifica foto" : "Aggiungi foto");
    if (p.photo) {
      photoPreview.style.backgroundImage = `url(${JSON.stringify(p.photo)})`;
    }
    photoPreview.addEventListener("click", async () => {
      try {
        let photo = "";
        if (p.photo && typeof openPlayerPhotoEditor === "function") {
          const edited = await openPlayerPhotoEditor(p.photo, { allowRemove: true });
          if (edited === PLAYER_PHOTO_REMOVE_RESULT) {
            p.photo = "";
            renderTeamManagerTable();
            return;
          }
          photo = edited || "";
        } else {
          const file =
            typeof pickImageFile === "function" ? await pickImageFile("image/*") : null;
          if (!file) return;
          photo =
            typeof preparePlayerPhotoDataUrl === "function"
              ? await preparePlayerPhotoDataUrl(file, { allowRemove: !!p.photo })
              : "";
        }
        if (!photo) return;
        p.photo = photo;
        renderTeamManagerTable();
      } catch (err) {
        logError("Errore caricamento foto giocatrice", err);
        alert("Immagine non valida o non caricabile.");
      }
    });
    photoCell.appendChild(photoPreview);
    const syncFullName = () => {
      p.lastName = lastNameInput.value.trim();
      p.firstName = firstNameInput.value.trim();
      p.name = buildFullName(p.lastName, p.firstName);
    };
    const maybeMatchPlayersDb = () => {
      const first = p.firstName || "";
      const last = p.lastName || "";
      const key = (last + "|" + first).toLowerCase().trim();
      if (!first || !last) {
        p.__dbPromptKey = "";
        return;
      }
      if (p.__dbPromptKey === key) return;
      const match = findPlayersDbMatchByName(first, last, p.id);
      if (match) {
        const label = buildFullName(match.lastName, match.firstName) || match.name || "questa giocatrice";
        const ok = confirm(
          "Giocatrice già presente in archivio (" + label + "). Vuoi usare quella esistente?"
        );
        if (ok) {
          p.id = match.id;
          p.firstName = match.firstName || first;
          p.lastName = match.lastName || last;
          p.name = buildFullName(p.lastName, p.firstName);
          p.photo = typeof match.photo === "string" ? match.photo : p.photo || "";
          renderTeamManagerTable();
          return;
        }
      }
      p.__dbPromptKey = key;
    };
    syncFullName();
    lastNameInput.addEventListener("change", () => {
      syncFullName();
      maybeMatchPlayersDb();
    });
    firstNameInput.addEventListener("change", () => {
      syncFullName();
      maybeMatchPlayersDb();
    });
    let liberoChk = null;
    const captainChk = document.createElement("input");
    captainChk.type = "checkbox";
    captainChk.checked = !!p.isCaptain;
    captainChk.addEventListener("change", () => {
      p.isCaptain = captainChk.checked;
      enforceSingleCaptainFlag(teamManagerState.players, p.isCaptain ? p.name : "");
      renderTeamManagerTable();
    });
    liberoChk = document.createElement("input");
    liberoChk.type = "checkbox";
    liberoChk.checked = isLibero;
    liberoChk.addEventListener("change", () => {
      p.role = liberoChk.checked ? "L" : "";
      renderTeamManagerTable();
    });
    const outChk = document.createElement("input");
    outChk.type = "checkbox";
    outChk.checked = !!p.out;
    outChk.disabled = !!teamManagerLiveEditMode;
    if (teamManagerLiveEditMode) {
      outChk.title = "Fuori rosa disabilitato durante la partita.";
    }
    outChk.addEventListener("change", () => {
      p.out = outChk.checked;
      renderTeamManagerTable();
    });
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "small danger";
    delBtn.textContent = "✕";
    delBtn.disabled = !!teamManagerLiveEditMode;
    if (teamManagerLiveEditMode) {
      delBtn.title = "Rimozione disabilitata durante la partita.";
    }
    delBtn.addEventListener("click", () => {
      const label = p.name || "questa giocatrice";
      const ok = confirm("Eliminare " + label + "?");
      if (!ok) return;
      const removeIdx = (teamManagerState.players || []).findIndex(entry => entry.id === p.id);
      if (removeIdx >= 0) {
        teamManagerState.players.splice(removeIdx, 1);
      } else {
        teamManagerState.players = (teamManagerState.players || []).filter(entry => entry !== p);
      }
      renderTeamManagerTable();
    });
    [
      numberInput,
      lastNameInput,
      firstNameInput,
      captainChk,
      outChk
    ].forEach(control => control.classList.add("team-manager-input"));

    const idChip = document.createElement("span");
    idChip.className = "team-manager-id";
    idChip.textContent = p.id || "—";
    const tds = [
      numberInput,
      lastNameInput,
      firstNameInput,
      photoCell,
      captainChk,
      liberoChk,
      outChk,
      idChip,
      delBtn
    ];
    tds.forEach(el => {
      const td = document.createElement("td");
      if (el instanceof HTMLElement) {
        td.appendChild(el);
      } else {
        td.textContent = el;
      }
      tr.appendChild(td);
    });
    elTeamManagerBody.appendChild(tr);
  });
  renderDefaultLineupEditor();
}
function getDefaultLineupRoster() {
  if (!teamManagerState) return [];
  const roster = (teamManagerState.players || [])
    .filter(p => (p.name || "").trim() !== "" && String(p.role || "").toUpperCase() !== "L")
    .map(p => ({
      name: buildFullName(p.lastName, p.firstName) || p.name.trim(),
      number: p.number || "",
      isCaptain: !!p.isCaptain,
      out: !!p.out
    }));
  roster.sort((a, b) => {
    const numA = a.number !== "" ? parseInt(a.number, 10) : NaN;
    const numB = b.number !== "" ? parseInt(b.number, 10) : NaN;
    const cleanA = Number.isFinite(numA) ? numA : null;
    const cleanB = Number.isFinite(numB) ? numB : null;
    if (cleanA === null && cleanB === null) {
      return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
    }
    if (cleanA === null) return 1;
    if (cleanB === null) return -1;
    if (cleanA !== cleanB) return cleanA - cleanB;
    return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
  });
  return roster;
}
function formatDefaultLineupName(name, numbersMap, captainSet, options = {}) {
  if (!name) return "";
  const num = (numbersMap && numbersMap[name]) || "";
  const compactCourt = !!options.compactCourt;
  let baseName = formatStructuredPlayerName(name, teamManagerScope || "our");
  if (compactCourt) {
    baseName = baseName || name || "";
  }
  const base = num ? num + " - " + baseName : baseName;
  if (options.includeCaptain !== false && captainSet && captainSet.has(name)) {
    return base + " (K)";
  }
  return base;
}
function normalizeDefaultLineup(names, rosterNames) {
  const allowed = new Set(rosterNames);
  const list = Array.isArray(names) ? names.slice(0, 6) : [];
  const cleaned = list.map(name => (name && allowed.has(name) ? name : ""));
  while (cleaned.length < 6) cleaned.push("");
  return cleaned;
}
function setDefaultLineupSlot(slotIdx, name) {
  if (!teamManagerState) return;
  const roster = getDefaultLineupRoster();
  const rosterNames = roster.map(p => p.name);
  if (!rosterNames.includes(name)) return;
  const current = normalizeDefaultLineup(teamManagerState.defaultLineup || [], rosterNames);
  const existingIdx = current.findIndex(n => n === name);
  const targetName = current[slotIdx] || "";
  if (targetName && targetName !== name) {
    if (existingIdx !== -1) {
      current[existingIdx] = targetName;
    }
  }
  if (existingIdx !== -1 && existingIdx !== slotIdx && !targetName) {
    current[existingIdx] = "";
  }
  current[slotIdx] = name;
  teamManagerState.defaultLineup = current;
  renderDefaultLineupEditor();
}
function rotateDefaultLineup(direction) {
  if (!teamManagerState) return;
  const rosterNames = getDefaultLineupRoster().map(p => p.name);
  const current = normalizeDefaultLineup(teamManagerState.defaultLineup || [], rosterNames);
  let rotated = current.slice();
  if (direction === "cw") {
    rotated = [current[5], current[0], current[1], current[2], current[3], current[4]];
    teamManagerState.defaultRotation = ((teamManagerState.defaultRotation || 1) % 6) + 1;
  } else {
    rotated = [current[1], current[2], current[3], current[4], current[5], current[0]];
    teamManagerState.defaultRotation =
      teamManagerState.defaultRotation === 1 ? 6 : (teamManagerState.defaultRotation || 1) - 1;
  }
  teamManagerState.defaultLineup = rotated;
  renderDefaultLineupEditor();
}
function clearDefaultLineupSlot(slotIdx) {
  if (!teamManagerState) return;
  const rosterNames = getDefaultLineupRoster().map(p => p.name);
  const current = normalizeDefaultLineup(teamManagerState.defaultLineup || [], rosterNames);
  current[slotIdx] = "";
  teamManagerState.defaultLineup = current;
  renderDefaultLineupEditor();
}
function ensureDefaultLineupTouchListeners() {
  if (defaultLineupTouchListenersAttached) return;
  document.addEventListener("touchmove", handleDefaultLineupTouchMove, { passive: false });
  document.addEventListener("touchend", handleDefaultLineupTouchEnd, { passive: false });
  document.addEventListener("touchcancel", handleDefaultLineupTouchCancel, { passive: false });
  defaultLineupTouchListenersAttached = true;
}
function clearDefaultLineupTouch() {
  const prev = document.querySelector(".default-lineup-slot.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (defaultLineupTouchGhost && defaultLineupTouchGhost.parentNode) {
    defaultLineupTouchGhost.parentNode.removeChild(defaultLineupTouchGhost);
  }
  defaultLineupTouchGhost = null;
  defaultLineupTouchName = "";
  defaultLineupTouchFromIdx = null;
  defaultLineupTouchOverIdx = -1;
  document.body.style.overflow = "";
}
function updateDefaultLineupTouchOver(x, y) {
  const elAt = document.elementFromPoint(x, y);
  const slot = elAt && elAt.closest(".default-lineup-slot");
  const prev = document.querySelector(".default-lineup-slot.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (!slot || !slot.dataset.slotIndex) {
    defaultLineupTouchOverIdx = -1;
    return;
  }
  const idx = parseInt(slot.dataset.slotIndex, 10);
  if (isNaN(idx)) {
    defaultLineupTouchOverIdx = -1;
    return;
  }
  defaultLineupTouchOverIdx = idx;
  slot.classList.add("drop-over");
}
function handleDefaultLineupTouchStart(e, name, fromIdx = null) {
  const t = e.touches && e.touches[0];
  if (!t || !name) return;
  ensureDefaultLineupTouchListeners();
  defaultLineupTouchName = name;
  defaultLineupTouchFromIdx = typeof fromIdx === "number" ? fromIdx : null;
  defaultLineupTouchStart = { x: t.clientX, y: t.clientY };
  const label = formatDefaultLineupName(name, state.playerNumbers || {}, new Set(state.captains || []), {
    compactCourt: true
  }) || name;
  if (defaultLineupTouchGhost && defaultLineupTouchGhost.parentNode) {
    defaultLineupTouchGhost.parentNode.removeChild(defaultLineupTouchGhost);
  }
  const ghost = document.createElement("div");
  ghost.className = "touch-drag-ghost";
  ghost.textContent = label;
  ghost.style.left = t.clientX + "px";
  ghost.style.top = t.clientY + "px";
  document.body.appendChild(ghost);
  defaultLineupTouchGhost = ghost;
  updateDefaultLineupTouchOver(t.clientX, t.clientY);
  document.body.style.overflow = "hidden";
  e.stopPropagation();
  e.preventDefault();
}
function handleDefaultLineupTouchMove(e) {
  if (!defaultLineupTouchName) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  if (defaultLineupTouchGhost) {
    defaultLineupTouchGhost.style.left = t.clientX + "px";
    defaultLineupTouchGhost.style.top = t.clientY + "px";
  }
  updateDefaultLineupTouchOver(t.clientX, t.clientY);
  e.stopPropagation();
  e.preventDefault();
}
function finalizeDefaultLineupTouch(e, forcedIdx = null) {
  if (!defaultLineupTouchName) return;
  if (typeof forcedIdx === "number") {
    defaultLineupTouchOverIdx = forcedIdx;
  }
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  const endX = t ? t.clientX : defaultLineupTouchStart.x;
  const endY = t ? t.clientY : defaultLineupTouchStart.y;
  const dist = Math.hypot(endX - defaultLineupTouchStart.x, endY - defaultLineupTouchStart.y);
  if (defaultLineupTouchOverIdx >= 0) {
    setDefaultLineupSlot(defaultLineupTouchOverIdx, defaultLineupTouchName);
  } else if (dist < 8) {
    if (typeof defaultLineupTouchFromIdx === "number") {
      clearDefaultLineupSlot(defaultLineupTouchFromIdx);
    } else if (teamManagerState) {
      const rosterNames = getDefaultLineupRoster().map(p => p.name);
      const current = normalizeDefaultLineup(teamManagerState.defaultLineup || [], rosterNames);
      const firstEmpty = current.findIndex(n => !n);
      const targetIdx = firstEmpty !== -1 ? firstEmpty : 0;
      setDefaultLineupSlot(targetIdx, defaultLineupTouchName);
    }
  }
  clearDefaultLineupTouch();
  e.stopPropagation();
  e.preventDefault();
}
function handleDefaultLineupTouchEnd(e) {
  if (!defaultLineupTouchName) return;
  finalizeDefaultLineupTouch(e);
}
function handleDefaultLineupTouchCancel() {
  if (!defaultLineupTouchName) return;
  clearDefaultLineupTouch();
}
function renderDefaultLineupEditor() {
  if (!elDefaultLineupGrid || !elDefaultLineupBench || !teamManagerState) return;
  if (elDefaultLineupRotation) {
    const rawRotation = parseInt(teamManagerState.defaultRotation, 10);
    const rotation =
      Number.isFinite(rawRotation) && rawRotation >= 1 && rawRotation <= 6 ? rawRotation : 1;
    teamManagerState.defaultRotation = rotation;
    elDefaultLineupRotation.value = String(rotation);
    elDefaultLineupRotation.onchange = () => {
      const next = parseInt(elDefaultLineupRotation.value, 10);
      teamManagerState.defaultRotation = Number.isFinite(next) ? Math.min(6, Math.max(1, next)) : 1;
    };
  }
  const roster = getDefaultLineupRoster();
  const rosterNames = roster.map(p => p.name);
  const numbersMap = {};
  const captainSet = new Set();
  const outSet = new Set();
  const allPlayers = (teamManagerState.players || []).filter(p => (p.name || "").trim() !== "");
  allPlayers.forEach(player => {
    const fullName = buildFullName(player.lastName, player.firstName) || player.name.trim();
    if (player.number) numbersMap[fullName] = String(player.number);
    if (player.isCaptain) captainSet.add(fullName);
    if (player.out) outSet.add(fullName);
  });
  if (elDefaultLineupPreferredLibero) {
    const liberos = allPlayers
      .filter(p => String(p.role || "").toUpperCase() === "L" && !p.out)
      .map(p => buildFullName(p.lastName, p.firstName) || p.name.trim());
    const preferred =
      teamManagerState.preferredLibero && liberos.includes(teamManagerState.preferredLibero)
        ? teamManagerState.preferredLibero
        : liberos[0] || "";
    teamManagerState.preferredLibero = preferred;
    elDefaultLineupPreferredLibero.innerHTML = "";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "-";
    elDefaultLineupPreferredLibero.appendChild(emptyOpt);
    const ordered = sortNamesByNumber(liberos, numbersMap);
    ordered.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = formatNameWithNumberFor(name, numbersMap);
      elDefaultLineupPreferredLibero.appendChild(opt);
    });
    elDefaultLineupPreferredLibero.value = preferred;
    elDefaultLineupPreferredLibero.disabled = ordered.length === 0;
    if (!elDefaultLineupPreferredLibero._preferredBound) {
      elDefaultLineupPreferredLibero.addEventListener("change", () => {
        const next = elDefaultLineupPreferredLibero.value || "";
        teamManagerState.preferredLibero = next;
      });
      elDefaultLineupPreferredLibero._preferredBound = true;
    }
  }
  const current = normalizeDefaultLineup(teamManagerState.defaultLineup || [], rosterNames);
  teamManagerState.defaultLineup = current;
  elDefaultLineupGrid.innerHTML = "";
  const courtSlots = [
    { pos: 4, idx: 3 },
    { pos: 3, idx: 2 },
    { pos: 2, idx: 1 },
    { pos: 5, idx: 4 },
    { pos: 6, idx: 5 },
    { pos: 1, idx: 0 }
  ];
  courtSlots.forEach(({ pos, idx }) => {
    const name = current[idx];
    const slot = document.createElement("div");
    slot.className = "default-lineup-slot" + (!name ? " empty" : "");
    slot.dataset.slotIndex = String(idx);
    slot.dataset.position = String(pos);
    slot.draggable = !!name;
    const nameLabel = document.createElement("span");
    nameLabel.className = "default-lineup-name";
    if (name) {
      const label = formatDefaultLineupName(name, numbersMap, captainSet, { compactCourt: true });
      nameLabel.textContent = label;
    if (outSet.has(name)) {
      nameLabel.classList.add("default-lineup-out");
    }
    } else {
      nameLabel.textContent = "";
    }
    slot.appendChild(nameLabel);
    slot.addEventListener("dragstart", e => {
      if (!name) return;
      defaultLineupDragName = name;
      defaultLineupDragAt = Date.now();
      if (e.dataTransfer) {
        e.dataTransfer.setData("text/plain", name);
        e.dataTransfer.effectAllowed = "move";
      }
    });
    slot.addEventListener("dragend", () => {
      defaultLineupDragName = "";
    });
    slot.addEventListener("click", () => {
      if (name) {
        clearDefaultLineupSlot(idx);
      }
    });
    slot.addEventListener("touchend", e => {
      if (!defaultLineupTouchName) return;
      finalizeDefaultLineupTouch(e, idx);
    });
    if (name) {
      slot.addEventListener("touchstart", e => {
        handleDefaultLineupTouchStart(e, name, idx);
      });
    }
    slot.addEventListener("dragover", e => {
      e.preventDefault();
      slot.classList.add("drop-over");
    });
    slot.addEventListener("dragleave", () => slot.classList.remove("drop-over"));
    slot.addEventListener("drop", e => {
      e.preventDefault();
      slot.classList.remove("drop-over");
      const dropped =
        (e.dataTransfer && e.dataTransfer.getData("text/plain")) ||
        defaultLineupDragName ||
        "";
      if (dropped) {
        setDefaultLineupSlot(idx, dropped);
      }
      defaultLineupDragName = "";
      defaultLineupDragAt = 0;
    });
    elDefaultLineupGrid.appendChild(slot);
  });
  const used = new Set(current.filter(Boolean));
  const bench = roster.filter(p => !used.has(p.name));
  elDefaultLineupBench.innerHTML = "";
  if (bench.length === 0) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Nessuna giocatrice disponibile.";
    elDefaultLineupBench.appendChild(empty);
    return;
  }
  bench.forEach(p => {
    const chip = document.createElement("div");
    chip.className = "default-lineup-chip";
    chip.draggable = true;
    chip.dataset.playerName = p.name;
    const label =
      formatDefaultLineupName(p.name, numbersMap, captainSet, { compactCourt: true }) || p.name;
    chip.textContent = label;
    if (p.out) {
      chip.classList.add("default-lineup-out");
    }
    chip.addEventListener("dragstart", e => {
      defaultLineupDragName = p.name;
      defaultLineupDragAt = Date.now();
      if (e.dataTransfer) {
        e.dataTransfer.setData("text/plain", p.name);
        e.dataTransfer.effectAllowed = "move";
      }
    });
    chip.addEventListener("dragend", () => {
      defaultLineupDragName = "";
    });
    chip.addEventListener("touchstart", e => {
      handleDefaultLineupTouchStart(e, p.name, null);
    });
    chip.addEventListener("click", () => {
      const firstEmpty = current.findIndex(n => !n);
      if (firstEmpty !== -1) {
        setDefaultLineupSlot(firstEmpty, p.name);
      }
    });
    elDefaultLineupBench.appendChild(chip);
  });
}
function refreshTeamManagerPlayersFromState() {
  if (!elTeamManagerModal || elTeamManagerModal.classList.contains("hidden")) return;
  if (teamManagerScope !== "our") return;
  if (!teamManagerState) return;
  const captainSet = new Set(state.captains || []);
  const basePlayers = state.players || [];
  const baseNumbers = state.playerNumbers || {};
  const baseLiberos = state.liberos || [];
  const prevMap = new Map((teamManagerState.players || []).map(p => [p.name, p]));
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
  enforceSingleCaptainFlag(playersDetailed, (state.captains || [])[0] || "");
  teamManagerState.players = playersDetailed;
  teamManagerState.defaultLineup = normalizePlayers(teamManagerState.defaultLineup || []).filter(name =>
    basePlayers.includes(name)
  );
  renderTeamManagerTable();
}
function refreshTeamManagerFromSelection() {
  if (!elTeamManagerModal || elTeamManagerModal.classList.contains("hidden")) return;
  if (teamManagerScope !== "our") return;
  teamManagerLiveEditMode = false;
  teamManagerStorageOnly = false;
  const selected = state.selectedTeam || (elTeamsSelect && elTeamsSelect.value) || "";
  const source = selected ? loadTeamFromStorage(selected) : null;
  teamManagerState = buildTeamManagerStateFromSource(source, "our");
  if (elTeamMetaName) elTeamMetaName.value = teamManagerState.name || "";
  if (elTeamMetaName) {
    elTeamMetaName.disabled = true;
    elTeamMetaName.title = "Rinomina squadra disabilitata";
  }
  if (elTeamMetaHead) elTeamMetaHead.value = teamManagerState.staff.headCoach || "";
  if (elTeamMetaAssistant) elTeamMetaAssistant.value = teamManagerState.staff.assistantCoach || "";
  if (elTeamMetaManager) elTeamMetaManager.value = teamManagerState.staff.manager || "";
  syncTeamManagerModeUI();
  renderTeamManagerTable();
}
function openTeamManagerModal(scope = "our") {
  let options = {};
  if (scope && typeof scope === "object") {
    options = scope;
    scope = options.scope || "our";
  }
  const { liveEdit = false, storageOnly = false } = options;
  teamManagerScope = scope;
  teamManagerLiveEditMode = !!liveEdit;
  teamManagerStorageOnly = !!storageOnly;
  const isOpponent = scope === "opponent";
  const selected = isOpponent ? state.selectedOpponentTeam : state.selectedTeam;
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
  teamManagerState = buildTeamManagerStateFromSource(source, scope);
  if (elTeamMetaName) elTeamMetaName.value = teamManagerState.name || "";
  if (elTeamMetaName) {
    elTeamMetaName.disabled = true;
    elTeamMetaName.title = "Rinomina squadra disabilitata";
  }
  if (elTeamMetaHead) elTeamMetaHead.value = teamManagerState.staff.headCoach || "";
  if (elTeamMetaAssistant) elTeamMetaAssistant.value = teamManagerState.staff.assistantCoach || "";
  if (elTeamMetaManager) elTeamMetaManager.value = teamManagerState.staff.manager || "";
  syncTeamManagerModeUI();
  renderTeamManagerTable();
  if (elTeamManagerModal) {
    elTeamManagerModal.classList.remove("hidden");
    setGlobalModalState(true);
  }
  const title = document.querySelector("#team-manager-modal h3");
  if (title) {
    title.textContent = liveEdit
      ? "Modifica squadra in partita"
      : isOpponent
        ? "Gestione squadra avversaria"
        : "Gestione squadra";
  }
}
function openNewTeamManager() {
  teamManagerScope = "our";
  teamManagerLiveEditMode = false;
  teamManagerStorageOnly = true;
  teamManagerState = {
    name: "",
    staff: Object.assign({}, DEFAULT_STAFF),
    players: [],
    defaultLineup: [],
    defaultRotation: 1,
    preferredLibero: ""
  };
  if (elTeamMetaName) elTeamMetaName.value = "";
  if (elTeamMetaName) {
    elTeamMetaName.disabled = false;
    elTeamMetaName.title = "";
  }
  if (elTeamMetaHead) elTeamMetaHead.value = "";
  if (elTeamMetaAssistant) elTeamMetaAssistant.value = "";
  if (elTeamMetaManager) elTeamMetaManager.value = "";
  syncTeamManagerModeUI();
  renderTeamManagerTable();
  if (elTeamManagerModal) {
    elTeamManagerModal.classList.remove("hidden");
    setGlobalModalState(true);
  }
  const title = document.querySelector("#team-manager-modal h3");
  if (title) {
    title.textContent = "Nuova squadra";
  }
}
function closeTeamManagerModal() {
  if (elTeamManagerModal) {
    elTeamManagerModal.classList.add("hidden");
  }
  teamManagerLiveEditMode = false;
  teamManagerStorageOnly = false;
  syncTeamManagerModeUI();
  setGlobalModalState(false);
}
function collectTeamManagerPayload() {
  if (!teamManagerState) return null;
  const name = elTeamMetaName && elTeamMetaName.value ? elTeamMetaName.value.trim() : teamManagerState.name;
  const staff = {
    headCoach: (elTeamMetaHead && elTeamMetaHead.value) || "",
    assistantCoach: (elTeamMetaAssistant && elTeamMetaAssistant.value) || "",
    manager: (elTeamMetaManager && elTeamMetaManager.value) || ""
  };
  const playersDetailed = enforceSingleCaptainFlag(
    teamManagerState.players
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
    ((teamManagerState.players || []).find(player => player && player.isCaptain) || {}).name || ""
  );
  const defaultLineup = normalizePlayers(teamManagerState.defaultLineup || [])
    .filter(name => playersDetailed.some(p => p.name === name && !p.out))
    .slice(0, 6);
  const defaultRotation =
    teamManagerState.defaultRotation && teamManagerState.defaultRotation >= 1 && teamManagerState.defaultRotation <= 6
      ? teamManagerState.defaultRotation
      : 1;
  const liberos = playersDetailed.filter(p => p.role === "L" && !p.out).map(p => p.name);
  const preferredLibero =
    teamManagerState.preferredLibero && liberos.includes(teamManagerState.preferredLibero)
      ? teamManagerState.preferredLibero
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
    officialCode: typeof teamManagerState.officialCode === "string" ? teamManagerState.officialCode.trim() : "",
    officialId: typeof teamManagerState.officialId === "string" ? teamManagerState.officialId.trim() : "",
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
function saveTeamManagerPayload(options = {}) {
  const {
    closeModal = true,
    openLineupAfter = false,
    saveToStorage = true,
    showAlert = true,
    preserveCourt = false
  } = options;
  const liveEditMode = !!teamManagerLiveEditMode;
  const storageOnly = !!teamManagerStorageOnly;
  const previousName = teamManagerState && teamManagerState.name ? teamManagerState.name.trim() : "";
  const payload = collectTeamManagerPayload();
  if (!payload || !payload.name) {
    alert("Inserisci un nome squadra valido.");
    return;
  }
  if (!Array.isArray(payload.players) || payload.players.length === 0) {
    alert("Aggiungi almeno una giocatrice prima di salvare la squadra.");
    return;
  }
  const isOpponent = teamManagerScope === "opponent";
  if (!liveEditMode && !storageOnly && hasMatchDataForReset() && !state.matchFinished) {
    alert(
      "Durante lo scout usa Modifica rapida. La gestione completa della squadra resta disponibile dall'archivio e non modifica il match."
    );
    return;
  }
  const liveCurrentPayload = liveEditMode
    ? cloneIsolationData(isOpponent ? getCurrentOpponentPayload() : getCurrentTeamPayload())
    : null;
  if (typeof invalidateRosterIdMapsCache === "function") {
    invalidateRosterIdMapsCache(isOpponent ? "opponent" : "our");
  }
  if (liveEditMode) {
    const removed = getRemovedLiveTeamPlayers(
      payload,
      isOpponent ? "opponent" : "our",
      liveCurrentPayload
    );
    if (removed.length > 0 && !state.matchFinished) {
      alert("Durante la partita non puoi rimuovere giocatrici dal roster rapido.");
      return;
    }
  }
  let nextName = payload.name.trim();
  if (previousName && nextName && previousName !== nextName) {
    payload.name = previousName;
    nextName = previousName;
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
      state.selectedOpponentTeam = nextName;
      renderTeamsSelect();
      renderOpponentTeamsSelect();
      if (state.useOpponentTeam || !state.match.opponent || state.match.opponent === previousName) {
        state.match.opponent = nextName;
        applyMatchInfoToUI();
      }
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
        state.selectedTeam = nextName;
      }
      renderTeamsSelect();
      renderOpponentTeamsSelect();
      if (typeof renderTeamsManagerList === "function") {
        teamsManagerSelectedName = nextName;
        renderTeamsManagerList();
      }
    }
  } else if (!storageOnly) {
    if (isOpponent) {
      state.selectedOpponentTeam = nextName;
    } else {
      state.selectedTeam = nextName;
    }
  }
  if (teamManagerState) {
    teamManagerState.name = nextName;
  }
  const roster = extractRosterFromTeam(payload);
  if (storageOnly) {
    // La gestione dell'archivio non deve modificare roster, formazione o liberi del match aperto.
  } else if (isOpponent) {
    if (liveEditMode) {
      const applied = applyLiveOpponentTeamManagerPayload(payload, liveCurrentPayload);
      if (!applied) return;
    } else {
      updateOpponentPlayersList(roster.players, {
        liberos: roster.liberos,
        playerNumbers: roster.numbers,
        captains: roster.captains
      });
      state.opponentPreferredLibero = roster.preferredLibero || roster.liberos?.[0] || "";
      renderOpponentLiberoChipsInline();
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
          ? roster.playersDetailed.filter(p => !p.out).map(p => p.name)
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
