function readCamp3FileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File non leggibile."));
    reader.readAsText(file);
  });
}
function loadCamp3ExternalScript(src, globalName) {
  return new Promise((resolve, reject) => {
    if (globalName && window[globalName]) {
      resolve(window[globalName]);
      return;
    }
    const existing = document.querySelector(`script[data-camp3-loader="${globalName || src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(globalName ? window[globalName] : true), { once: true });
      existing.addEventListener("error", () => reject(new Error("Libreria non caricata.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.camp3Loader = globalName || src;
    script.onload = () => resolve(globalName ? window[globalName] : true);
    script.onerror = () => reject(new Error("Libreria non caricata."));
    document.head.appendChild(script);
  });
}
async function extractTextFromCamp3Pdf(file) {
  const pdfjsLib = await loadCamp3ExternalScript(
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    "pdfjsLib"
  );
  if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") {
    throw new Error("PDF.js non disponibile.");
  }
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const data = await readCamp3FileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    let previousY = null;
    const lines = [];
    let current = [];
    content.items.forEach(item => {
      const y = item && item.transform ? Math.round(item.transform[5]) : 0;
      if (previousY !== null && Math.abs(y - previousY) > 3) {
        lines.push(current.join(" "));
        current = [];
      }
      previousY = y;
      current.push(item.str || "");
    });
    if (current.length) lines.push(current.join(" "));
    pages.push(lines.join("\n"));
  }
  return pages.join("\n");
}
async function extractTextFromCamp3Image(file) {
  const Tesseract = await loadCamp3ExternalScript(
    "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
    "Tesseract"
  );
  if (!Tesseract || typeof Tesseract.recognize !== "function") {
    throw new Error("Tesseract non disponibile.");
  }
  const result = await Tesseract.recognize(file, "ita+eng");
  return (result && result.data && result.data.text) || "";
}
async function extractTextFromCamp3File(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return extractTextFromCamp3Pdf(file);
  }
  if (type.startsWith("image/")) {
    return extractTextFromCamp3Image(file);
  }
  return readCamp3FileAsText(file);
}
function parseCamp3RosterText(text) {
  if (!text || typeof text !== "string") return [];
  const beforeStaff = text.split(/\bQualifica\b/i)[0] || text;
  const lines = beforeStaff.split(/\r?\n/).map(line => line.replace(/\u00a0/g, " "));
  const players = [];
  const seenNumbers = new Set();
  const flagPattern = /^(K|L|L1|L2)$/i;
  lines.forEach(rawLine => {
    const dateMatch = rawLine.match(/\b\d{2}[/. -]\d{2}[/. -]\d{4}\b/);
    if (!dateMatch) return;
    const beforeDate = rawLine.slice(0, dateMatch.index).trim();
    const numberMatch = beforeDate.match(/^\s*(\d{1,3})\s+(.+)$/);
    if (!numberMatch) return;
    const number = numberMatch[1];
    if (seenNumbers.has(number)) return;
    let namePart = numberMatch[2].trim();
    let isCaptain = false;
    let isLibero = false;
    const spacedGroups = namePart.split(/\s{2,}/).map(part => part.trim()).filter(Boolean);
    let groups = spacedGroups.length >= 2 ? spacedGroups : namePart.split(/\s+/).filter(Boolean);
    while (groups.length > 0 && flagPattern.test(groups[groups.length - 1])) {
      const flag = groups.pop().toUpperCase();
      if (flag === "K") isCaptain = true;
      if (flag.startsWith("L")) isLibero = true;
    }
    if (groups.length < 2) return;
    const lastName = normalizePlayerNameCase(groups[0]);
    const firstName = normalizePlayerNameCase(groups.slice(1).join(" "));
    const cleanName = normalizePlayers([normalizePlayerNameCase(buildFullName(lastName, firstName))])[0];
    if (!cleanName) return;
    seenNumbers.add(number);
    players.push({
      number,
      name: cleanName,
      lastName,
      firstName,
      role: isLibero ? "L" : "",
      isCaptain
    });
  });
  return players;
}
function findCamp3PlayerMatch(camp3Player, currentPlayers) {
  const wanted = (camp3Player.name || "").trim().toLowerCase();
  if (!wanted) return null;
  const exact = currentPlayers.find(player => (player.name || "").trim().toLowerCase() === wanted);
  if (exact) return exact;
  return currentPlayers.find(player => {
    return (
      String(player.lastName || "").trim().toLowerCase() === String(camp3Player.lastName || "").trim().toLowerCase() &&
      String(player.firstName || "").trim().toLowerCase() === String(camp3Player.firstName || "").trim().toLowerCase()
    );
  }) || null;
}
function getCamp3ImportCurrentPlayers() {
  return (teamManagerState && teamManagerState.players ? teamManagerState.players : []).filter(player => {
    const name = player && (player.name || buildFullName(player.lastName, player.firstName));
    return !(typeof isTemplatePlayerName === "function" && isTemplatePlayerName(name));
  });
}
function createCamp3ReviewDraft(camp3Players) {
  const currentPlayers = getCamp3ImportCurrentPlayers();
  const matchedIds = new Set();
  const rows = (camp3Players || []).map((player, idx) => {
    const match = findCamp3PlayerMatch(player, currentPlayers.filter(entry => !matchedIds.has(entry.id)));
    if (match && match.id) matchedIds.add(match.id);
    return {
      id: `camp3_${Date.now()}_${idx}`,
      enabled: true,
      matchId: match && match.id ? match.id : "",
      number: player.number || "",
      lastName: String(player.lastName || "").trim() || (!player.firstName ? String(player.name || "").trim() : ""),
      firstName: String(player.firstName || "").trim(),
      role: player.role === "L" ? "L" : "",
      isCaptain: !!player.isCaptain
    };
  });
  const outRows = currentPlayers
    .filter(player => player && player.id && !matchedIds.has(player.id) && !player.out)
    .map((player, idx) => ({
      id: `camp3_out_${Date.now()}_${idx}`,
      enabled: true,
      playerId: player.id,
      name: player.name || buildFullName(player.lastName, player.firstName)
    }));
  return { rows, outRows };
}
function getCamp3RowKind(row) {
  if (!row || !row.matchId) return "added";
  const current = getCamp3ImportCurrentPlayers().find(player => player && player.id === row.matchId);
  if (!current) return "added";
  const nextName = normalizePlayers([normalizePlayerNameCase(buildFullName(row.lastName, row.firstName))])[0] || "";
  const currentName = normalizePlayers([
    normalizePlayerNameCase(current.name || buildFullName(current.lastName, current.firstName))
  ])[0] || "";
  const nextNumber = String(row.number || "").trim();
  const currentNumber = String(current.number || "").trim();
  const nextRole = row.role === "L" ? "L" : "";
  const currentRole = current.role === "L" ? "L" : "";
  const nextCaptain = !!row.isCaptain;
  const currentCaptain = !!current.isCaptain;
  return (
    nextName !== currentName ||
    nextNumber !== currentNumber ||
    nextRole !== currentRole ||
    nextCaptain !== currentCaptain ||
    !!current.out
  )
    ? "modified"
    : "unchanged";
}
function buildCamp3ImportPlanFromDraft(draft) {
  if (!teamManagerState || !draft) return null;
  const currentPlayers = getCamp3ImportCurrentPlayers();
  const recognizedIds = new Set();
  const changes = {
    added: [],
    numberUpdated: [],
    restored: [],
    out: [],
    liberos: [],
    captains: []
  };
  const nextPlayers = currentPlayers.map(player => Object.assign({}, player));
  const enabledRows = (draft.rows || []).filter(row => row && row.enabled);
  enabledRows.forEach(row => {
    const cleanNumber = String(row.number || "").trim();
    const fullName = normalizePlayers([normalizePlayerNameCase(buildFullName(row.lastName, row.firstName))])[0];
    if (!fullName) return;
    const camp3Player = {
      number: /^[0-9]{1,3}$/.test(cleanNumber) ? cleanNumber : "",
      name: fullName,
      lastName: normalizePlayerNameCase(row.lastName || ""),
      firstName: normalizePlayerNameCase(row.firstName || ""),
      role: row.role === "L" ? "L" : "",
      isCaptain: !!row.isCaptain
    };
    let target = row.matchId ? nextPlayers.find(player => player.id === row.matchId) : null;
    if (!target) {
      target = findCamp3PlayerMatch(camp3Player, nextPlayers);
    }
    let isNewPlayer = false;
    if (!target) {
      const dbMatch =
        findPlayersDbMatchByName(camp3Player.firstName, camp3Player.lastName) ||
        findPlayersDbMatchByFullName(camp3Player.name);
      target = {
        id: dbMatch && dbMatch.id ? dbMatch.id : generatePlayerId(),
        name: camp3Player.name,
        firstName: camp3Player.firstName,
        lastName: camp3Player.lastName,
        codeOfficial: "",
        photo: dbMatch && typeof dbMatch.photo === "string" ? dbMatch.photo : "",
        number: "",
        role: "",
        isCaptain: false,
        out: false
      };
      nextPlayers.push(target);
      changes.added.push(`${camp3Player.number} ${camp3Player.name}`);
      isNewPlayer = true;
    }
    if (target.id) recognizedIds.add(target.id);
    if (!isNewPlayer && String(target.number || "") !== String(camp3Player.number || "")) {
      changes.numberUpdated.push(
        `${target.name || camp3Player.name}: ${target.number || "senza numero"} -> ${camp3Player.number}`
      );
    }
    target.number = camp3Player.number;
    if (target.out) {
      changes.restored.push(target.name || camp3Player.name);
      target.out = false;
    }
    if (camp3Player.role === "L" && target.role !== "L") {
      changes.liberos.push(target.name || camp3Player.name);
    }
    target.role = camp3Player.role === "L" ? "L" : "";
    if (camp3Player.isCaptain && !target.isCaptain) {
      changes.captains.push(target.name || camp3Player.name);
    }
    target.isCaptain = !!camp3Player.isCaptain;
    target.name = camp3Player.name;
    target.firstName = camp3Player.firstName;
    target.lastName = camp3Player.lastName;
  });
  (draft.outRows || []).filter(row => row && row.enabled).forEach(row => {
    const player = nextPlayers.find(entry => entry && entry.id === row.playerId);
    if (!player || player.out) return;
    player.out = true;
    changes.out.push(player.name || buildFullName(player.lastName, player.firstName));
  });
  const captainName = enabledRows.find(row => row.isCaptain)
    ? normalizePlayerNameCase(
        buildFullName(
          enabledRows.find(row => row.isCaptain).lastName,
          enabledRows.find(row => row.isCaptain).firstName
        )
      )
    : "";
  enforceSingleCaptainFlag(nextPlayers, captainName);
  return { nextPlayers, changes };
}
function buildCamp3ImportPlan(camp3Players) {
  return buildCamp3ImportPlanFromDraft(createCamp3ReviewDraft(camp3Players));
}
function formatCamp3ImportPreview(changes) {
  const lines = ["Modifiche riconosciute dal CAMP3:"];
  const append = (title, list) => {
    if (!list || list.length === 0) return;
    lines.push("");
    lines.push(title + ":");
    list.slice(0, 20).forEach(item => lines.push("- " + item));
    if (list.length > 20) lines.push("- ... altre " + (list.length - 20));
  };
  append("Aggiunte", changes.added);
  append("Numeri aggiornati", changes.numberUpdated);
  append("Rimesse in rosa", changes.restored);
  append("Fuori rosa", changes.out);
  append("Liberi riconosciuti", changes.liberos);
  append("Capitana riconosciuta", changes.captains);
  if (lines.length === 1) {
    lines.push("");
    lines.push("Nessuna modifica necessaria.");
  } else {
    lines.push("");
    lines.push("Applicare queste modifiche alla tabella squadra?");
  }
  return lines.join("\n");
}
function renderCamp3ConfirmSummary(draft) {
  if (!elCamp3ConfirmSummary) return;
  elCamp3ConfirmSummary.innerHTML = "";
  const title = document.createElement("p");
  title.className = "section-note";
  title.textContent = "Controlla e modifica le righe riconosciute prima di applicarle alla squadra.";
  elCamp3ConfirmSummary.appendChild(title);
  const activeRows = (draft.rows || []).filter(row => row && row.enabled);
  const activeOutRows = (draft.outRows || []).filter(row => row && row.enabled);
  if (activeRows.length > 0) {
    const section = document.createElement("section");
    section.className = "camp3-confirm-section";
    const heading = document.createElement("h4");
    heading.textContent = `Giocatrici lette dal CAMP3 (${activeRows.length})`;
    const tableWrap = document.createElement("div");
    tableWrap.className = "camp3-confirm-tablewrap";
    const table = document.createElement("table");
    table.className = "camp3-confirm-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Stato</th>
          <th>#</th>
          <th>Cognome</th>
          <th>Nome</th>
          <th>L</th>
          <th>K</th>
          <th></th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement("tbody");
    activeRows.forEach(row => {
      const tr = document.createElement("tr");
      const rowKind = getCamp3RowKind(row);
      tr.className = `camp3-confirm-row camp3-confirm-row--${rowKind}`;
      const status = document.createElement("span");
      status.className = `camp3-confirm-status camp3-confirm-status--${rowKind}`;
      status.textContent =
        rowKind === "added" ? "Aggiunta" : rowKind === "modified" ? "Modifica" : "Invariata";
      const syncRowStatus = () => {
        const nextKind = getCamp3RowKind(row);
        tr.className = `camp3-confirm-row camp3-confirm-row--${nextKind}`;
        status.className = `camp3-confirm-status camp3-confirm-status--${nextKind}`;
        status.textContent =
          nextKind === "added" ? "Aggiunta" : nextKind === "modified" ? "Modifica" : "Invariata";
      };
      const numberInput = document.createElement("input");
      numberInput.type = "number";
      numberInput.min = "0";
      numberInput.max = "999";
      numberInput.value = row.number || "";
      numberInput.addEventListener("input", () => {
        row.number = numberInput.value;
        syncRowStatus();
      });
      const lastNameInput = document.createElement("input");
      lastNameInput.type = "text";
      lastNameInput.value = row.lastName || "";
      lastNameInput.addEventListener("input", () => {
        row.lastName = lastNameInput.value;
        syncRowStatus();
      });
      const firstNameInput = document.createElement("input");
      firstNameInput.type = "text";
      firstNameInput.value = row.firstName || "";
      firstNameInput.addEventListener("input", () => {
        row.firstName = firstNameInput.value;
        syncRowStatus();
      });
      const liberoChk = document.createElement("input");
      liberoChk.type = "checkbox";
      liberoChk.checked = row.role === "L";
      liberoChk.addEventListener("change", () => {
        row.role = liberoChk.checked ? "L" : "";
        syncRowStatus();
      });
      const captainChk = document.createElement("input");
      captainChk.type = "checkbox";
      captainChk.checked = !!row.isCaptain;
      captainChk.addEventListener("change", () => {
        if (captainChk.checked) {
          (draft.rows || []).forEach(other => {
            if (other) other.isCaptain = other.id === row.id;
          });
        } else {
          row.isCaptain = false;
        }
        renderCamp3ConfirmSummary(draft);
      });
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "pill-remove camp3-confirm-remove";
      removeBtn.textContent = "✕";
      removeBtn.setAttribute("aria-label", "Elimina modifica");
      removeBtn.addEventListener("click", () => {
        row.enabled = false;
        renderCamp3ConfirmSummary(draft);
      });
      [numberInput, lastNameInput, firstNameInput].forEach(input => {
        input.className = "team-manager-input";
      });
      [status, numberInput, lastNameInput, firstNameInput, liberoChk, captainChk, removeBtn].forEach(el => {
        const td = document.createElement("td");
        td.appendChild(el);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    section.appendChild(heading);
    section.appendChild(tableWrap);
    elCamp3ConfirmSummary.appendChild(section);
  }
  if (activeOutRows.length > 0) {
    const section = document.createElement("section");
    section.className = "camp3-confirm-section";
    const heading = document.createElement("h4");
    heading.textContent = `Da mettere fuori rosa (${activeOutRows.length})`;
    const list = document.createElement("div");
    list.className = "camp3-confirm-out-list";
    activeOutRows.forEach(row => {
      const item = document.createElement("div");
      item.className = "camp3-confirm-out-item";
      const label = document.createElement("span");
      label.textContent = row.name || "Giocatrice";
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "pill-remove camp3-confirm-remove";
      removeBtn.textContent = "✕";
      removeBtn.setAttribute("aria-label", "Non mettere fuori rosa");
      removeBtn.addEventListener("click", () => {
        row.enabled = false;
        renderCamp3ConfirmSummary(draft);
      });
      item.appendChild(label);
      item.appendChild(removeBtn);
      list.appendChild(item);
    });
    section.appendChild(heading);
    section.appendChild(list);
    elCamp3ConfirmSummary.appendChild(section);
  }
  if (activeRows.length === 0 && activeOutRows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Nessuna modifica da applicare.";
    elCamp3ConfirmSummary.appendChild(empty);
  }
}
function closeCamp3ConfirmModal(result = false) {
  if (!elCamp3ConfirmModal) return;
  const resolver = elCamp3ConfirmModal._camp3Resolve;
  elCamp3ConfirmModal._camp3Resolve = null;
  elCamp3ConfirmModal.classList.add("hidden");
  if (typeof resolver === "function") resolver(!!result);
}
function showCamp3ImportConfirm(draft) {
  if (!elCamp3ConfirmModal || !elCamp3ConfirmSummary) {
    const plan = buildCamp3ImportPlanFromDraft(draft);
    return Promise.resolve(confirm(formatCamp3ImportPreview(plan ? plan.changes : {})) ? draft : null);
  }
  renderCamp3ConfirmSummary(draft);
  elCamp3ConfirmModal.classList.remove("hidden");
  return new Promise(resolve => {
    elCamp3ConfirmModal._camp3Resolve = result => resolve(result ? draft : null);
  });
}
async function importCamp3IntoTeamManager(file) {
  if (!file) return;
  if (!teamManagerState) {
    openTeamManagerModal(teamManagerScope || "our");
  }
  if (teamManagerLiveEditMode) {
    alert("Import CAMP3 non disponibile nella modifica rapida in partita, perché può mettere giocatrici fuori rosa.");
    return;
  }
  const text = await extractTextFromCamp3File(file);
  const camp3Players = parseCamp3RosterText(text);
  if (!camp3Players || camp3Players.length === 0) {
    alert("Nessuna giocatrice riconosciuta nel CAMP3. Con una foto prova un'immagine più dritta e leggibile.");
    return;
  }
  const draft = createCamp3ReviewDraft(camp3Players);
  const initialPlan = buildCamp3ImportPlanFromDraft(draft);
  if (!initialPlan) return;
  const hasChanges = Object.values(initialPlan.changes).some(list => Array.isArray(list) && list.length > 0);
  if (!hasChanges) {
    alert(formatCamp3ImportPreview(initialPlan.changes));
    return;
  }
  const editedDraft = await showCamp3ImportConfirm(draft);
  if (!editedDraft) return;
  const plan = buildCamp3ImportPlanFromDraft(editedDraft);
  if (!plan) return;
  teamManagerState.players = plan.nextPlayers;
  teamManagerState.defaultLineup = normalizePlayers(teamManagerState.defaultLineup || []).filter(name =>
    plan.nextPlayers.some(player => player.name === name && !player.out && player.role !== "L")
  );
  const liberoNames = plan.nextPlayers.filter(player => player.role === "L" && !player.out).map(player => player.name);
  if (!liberoNames.includes(teamManagerState.preferredLibero)) {
    teamManagerState.preferredLibero = liberoNames[0] || "";
  }
  renderTeamManagerTable();
}
function importOpponentTeamFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = (e.target && e.target.result) || "";
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        data = parseDelimitedTeamText(text);
      }
      applyImportedOpponentTeamData(data);
    } catch (err) {
      logError("Errore importazione avversaria", err);
      alert("File squadra avversaria non valido.");
    }
    if (elOpponentTeamFileInput) {
      elOpponentTeamFileInput.value = "";
    }
  };
  reader.readAsText(file);
}
function importTeamFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = (e.target && e.target.result) || "";
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        data = parseDelimitedTeamText(text);
      }
      applyImportedTeamData(data);
    } catch (err) {
      logError("Errore importazione squadra", err);
      alert("File squadra non valido.");
    }
    if (elTeamFileInput) {
      elTeamFileInput.value = "";
    }
  };
  reader.readAsText(file);
}
function handleTeamSelectChange(selectedOverride = "") {
  if (!elTeamsSelect && !selectedOverride) return;
  const selected = selectedOverride || elTeamsSelect.value;
  if (!selected) {
    updateTeamButtonsState();
    return;
  }
  if (state.useOpponentTeam && selected === state.selectedOpponentTeam) {
    alert("Non puoi selezionare la stessa squadra come avversaria.");
    renderTeamsSelect();
    return;
  }
  const hasData = hasMatchDataForReset();
  const isChanging = selected !== state.selectedTeam;
  if (isChanging && hasData) {
    alert("Non puoi cambiare squadra dopo l'inizio dello scout. Esegui prima il reset del match.");
    renderTeamsSelect();
    return;
  }
  const team = loadTeamFromStorage(selected);
  if (!team) {
    alert("Squadra non trovata o corrotta.");
    renderTeamsSelect();
    refreshTeamManagerFromSelection();
    return;
  }
  state.selectedTeam = selected;
  state.match = state.match || {};
  state.match.teamName = selected;
  updateTeamButtonsState();
  const roster = extractRosterFromTeam(team);
  const defaultLineup =
    roster.defaultLineup && roster.defaultLineup.length > 0
      ? roster.defaultLineup
      : roster.playersDetailed && roster.playersDetailed.length > 0
        ? roster.playersDetailed.filter(p => !p.out && p.role !== "L").map(p => p.name)
        : roster.players || [];
  const applied = updatePlayersList(roster.players || [], {
    askReset: true,
    liberos: roster.liberos || [],
    playerNumbers: roster.numbers || {},
    captains: roster.captains || [],
    setDefaultLineup: true,
    defaultLineupNames: defaultLineup,
    defaultLineupRotation: roster.defaultRotation || 1,
    preferredLibero: roster.preferredLibero || ""
  });
  if (applied === false) return;
  renderLiberoTags();
  renderTeamsSelect();
  renderLiberoChipsInline();
  refreshTeamManagerFromSelection();
}
function handleOpponentTeamSelectChange(selectedOverride = "") {
  if (!elOpponentTeamsSelect && !selectedOverride) return;
  const selected = selectedOverride || elOpponentTeamsSelect.value;
  if (selected && selected === state.selectedTeam) {
    alert("Non puoi selezionare la stessa squadra come avversaria.");
    if (elOpponentTeamsSelect) elOpponentTeamsSelect.value = "";
    renderOpponentTeamsSelect();
    return;
  }
  const hasData = hasMatchDataForReset();
  const isChanging = selected !== state.selectedOpponentTeam;
  if (isChanging && hasData) {
    alert("Non puoi cambiare la squadra avversaria dopo l'inizio dello scout. Esegui prima il reset del match.");
    renderOpponentTeamsSelect();
    return;
  }
  if (!selected) {
    state.selectedOpponentTeam = "";
    updateOpponentTeamButtonsState();
    saveState();
    return;
  }
  const team = loadOpponentTeamFromStorage(selected);
  if (!team) {
    alert("Squadra avversaria non trovata o corrotta.");
    renderOpponentTeamsSelect();
    return;
  }
  state.selectedOpponentTeam = selected;
  if (state.useOpponentTeam) {
    state.match.opponent = selected;
    if (typeof applyMatchInfoToUI === "function") {
      applyMatchInfoToUI();
    }
    saveState();
  }
  updateOpponentTeamButtonsState();
  const roster = extractRosterFromTeam(team);
  const applied = updateOpponentPlayersList(roster.players || [], {
    liberos: roster.liberos || [],
    playerNumbers: roster.numbers || {},
    captains: roster.captains || []
  });
  if (applied === false) return;
  state.opponentPreferredLibero = roster.preferredLibero || roster.liberos?.[0] || "";
  renderOpponentLiberoChipsInline();
  const opponentDefaultLineup =
    roster.defaultLineup && roster.defaultLineup.length > 0
      ? roster.defaultLineup
      : roster.playersDetailed && roster.playersDetailed.length > 0
        ? roster.playersDetailed.filter(p => !p.out && p.role !== "L").map(p => p.name)
        : roster.players || [];
  applyOpponentDefaultLineup(opponentDefaultLineup, roster.defaultRotation || 1);
  if (typeof renderOpponentPlayers === "function") {
    renderOpponentPlayers();
  }
  if (!state.match.opponent) {
    state.match.opponent = selected;
    applyMatchInfoToUI();
  }
  renderOpponentTeamsSelect();
  saveState();
}
function renderLiberoTags() {
  const mainContainers = [elLiberoTags].filter(Boolean);
  const inlineContainers = [elLiberoTagsInline].filter(Boolean);
  [...mainContainers, ...inlineContainers].forEach(container => {
    container.innerHTML = "";
  });
  if (!state.players || state.players.length === 0) {
    [...mainContainers].forEach(container => {
      const span = document.createElement("div");
      span.className = "players-empty";
      span.textContent = "Aggiungi giocatrici per segnare i liberi.";
      container.appendChild(span);
    });
    inlineContainers.forEach(container => {
      const span = document.createElement("div");
      span.className = "players-empty";
      span.textContent = "Nessun libero selezionato.";
      container.appendChild(span);
    });
    return;
  }
  const libSet = new Set(state.liberos || []);
  const ordered = sortNamesByNumber(state.players || [], state.playerNumbers || {});
  // Impostazioni: mostra tutte le giocatrici, evidenziando i liberi
  mainContainers.forEach(container => {
    ordered.forEach(name => {
      const btn = document.createElement("button");
      const active = libSet.has(name);
      btn.type = "button";
      btn.className = "libero-tag" + (active ? " active" : "");
      btn.textContent = formatNameWithNumber(name);
      btn.addEventListener("click", () => toggleLibero(name));
      container.appendChild(btn);
    });
  });
  // Inline: lista drag dei liberi disponibili (anche se in campo, marcati come bloccati)
  inlineContainers.forEach(container => {
    const used = getUsedNames();
    if (libSet.size === 0) {
      const span = document.createElement("div");
      span.className = "players-empty";
      span.textContent = "Nessun libero selezionato.";
      container.appendChild(span);
      return;
    }
    const liberoOrdered = orderLiberosByPreference(
      ordered.filter(name => libSet.has(name)),
      "our",
      state.playerNumbers || {}
    );
    liberoOrdered.forEach(name => {
      if (!libSet.has(name)) return;
      const chip = document.createElement("div");
      const classes = ["bench-chip", "libero-flag"];
      const isUsed = used.has(name);
      if (isUsed) classes.push("bench-locked");
      chip.className = classes.join(" ");
      chip.draggable = !isUsed;
      chip.dataset.playerName = name;
      const label = document.createElement("span");
      label.textContent = formatNameWithNumber(name) + (isUsed ? " (in campo)" : "");
      chip.appendChild(label);
      if (!isUsed) {
        chip.addEventListener("dragstart", handleBenchDragStart);
        chip.addEventListener("dragend", handleBenchDragEnd);
        chip.addEventListener("click", () => handleBenchClick(name));
      }
      container.appendChild(chip);
    });
  });
}
function renderOpponentLiberoTags() {
  if (!elOpponentLiberoTags) return;
  elOpponentLiberoTags.innerHTML = "";
  if (!state.opponentPlayers || state.opponentPlayers.length === 0) {
    const span = document.createElement("div");
    span.className = "players-empty";
    span.textContent = "Aggiungi giocatrici avversarie per segnare i liberi.";
    elOpponentLiberoTags.appendChild(span);
    renderOpponentLiberoChipsInline();
    return;
  }
  const libSet = new Set(state.opponentLiberos || []);
  const ordered = sortNamesByNumber(state.opponentPlayers || [], state.opponentPlayerNumbers || {});
  const liberoOrdered = orderLiberosByPreference(
    ordered.filter(name => libSet.has(name)),
    "opponent",
    state.opponentPlayerNumbers || {}
  );
  liberoOrdered.forEach(name => {
    const btn = document.createElement("button");
    const active = libSet.has(name);
    btn.type = "button";
    btn.className = "libero-tag" + (active ? " active" : "");
    btn.textContent = formatNameWithNumber(name);
    btn.addEventListener("click", () => toggleOpponentLiberoAndRefresh(name, !active));
    elOpponentLiberoTags.appendChild(btn);
  });
  renderOpponentLiberoChipsInline();
}
const allowedMetricCodes = new Set(RESULT_CODES);
const SETTINGS_RESULT_CODES = ["#", "+", "!", "-", "/", "="];
const allowedPointCodes = new Set([...SETTINGS_RESULT_CODES, "for", "against", "error"]);
