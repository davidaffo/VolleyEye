import { ensureMatchDefaults } from "../match-details.js";

import { readCamp3FileAsArrayBuffer } from "../storage/archive-actions.js";
import { normalizePlayerNameCase, normalizePlayers, buildFullName, enforceSingleCaptainFlag } from "../../../domain/player-names.js";
import { applyOpponentDefaultLineup } from "../core/player-model.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { isTemplatePlayerName, findPlayersDbMatchByName, findPlayersDbMatchByFullName, generatePlayerId, loadTeamFromStorage, extractRosterFromTeam, loadOpponentTeamFromStorage } from "../storage/team-repository.js";
import { publishCamp3ConfirmView, setCamp3ConfirmOpen } from "../camp3-view.js";
import { openTeamManagerModal, renderTeamManagerTable, refreshTeamManagerFromSelection } from "../editor/team-editor.js";
import { session as matchState } from "../../../../js/globals.js";
import { updateTeamButtonsState, updateOpponentTeamButtonsState } from "../settings/scouting-config.js";
import { renderTeamsSelect, hasMatchDataForReset, renderOpponentTeamsSelect } from "../storage/match-repository.js";
import { updatePlayersList, renderLiberoChipsInline, renderOpponentLiberoChipsInline } from "../court/court-ui-bootstrap.js";
import { saveState } from "../../storage/save-state.js";
import { session as courtEngineState } from "../court/court-engine.js";
import { renderOpponentPlayers } from "../../live/team-rendering.js";
import { publishLiberoBench } from "../../scout/court-view.js";




export function readCamp3FileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File non leggibile."));
    reader.readAsText(file);
  });
}

export function loadCamp3ExternalScript(src, globalName) {
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

export async function extractTextFromCamp3Pdf(file) {
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

export async function extractTextFromCamp3Image(file) {
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

export async function extractTextFromCamp3File(file) {
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

export function parseCamp3RosterText(text) {
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

export function findCamp3PlayerMatch(camp3Player, currentPlayers) {
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

export function getCamp3ImportCurrentPlayers() {
  return (rosterLineupState.teamManagerState && rosterLineupState.teamManagerState.players ? rosterLineupState.teamManagerState.players : []).filter(player => {
    const name = player && (player.name || buildFullName(player.lastName, player.firstName));
    return !(isTemplatePlayerName(name));
  });
}

export function createCamp3ReviewDraft(camp3Players) {
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

export function getCamp3RowKind(row) {
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

export function buildCamp3ImportPlanFromDraft(draft) {
  if (!rosterLineupState.teamManagerState || !draft) return null;
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

export function formatCamp3ImportPreview(changes) {
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

export function renderCamp3ConfirmSummary(draft) {

publishCamp3ConfirmView(draft);return;
}

export function closeCamp3ConfirmModal(result = false) {
  if (!rosterLineupState.elCamp3ConfirmModal) return;
  const resolver = rosterLineupState.elCamp3ConfirmModal._camp3Resolve;
  rosterLineupState.elCamp3ConfirmModal._camp3Resolve = null;
  setCamp3ConfirmOpen(false);
  if (typeof resolver === "function") resolver(!!result);
}

export function showCamp3ImportConfirm(draft) {
  if (!rosterLineupState.elCamp3ConfirmModal || !rosterLineupState.elCamp3ConfirmSummary) {
    const plan = buildCamp3ImportPlanFromDraft(draft);
    return Promise.resolve(confirm(formatCamp3ImportPreview(plan ? plan.changes : {})) ? draft : null);
  }
  renderCamp3ConfirmSummary(draft);
  setCamp3ConfirmOpen(true);
  return new Promise(resolve => {
    rosterLineupState.elCamp3ConfirmModal._camp3Resolve = result => resolve(result ? draft : null);
  });
}

export async function importCamp3IntoTeamManager(file) {
  if (!file) return;
  if (!rosterLineupState.teamManagerState) {
    openTeamManagerModal(rosterLineupState.teamManagerScope || "our");
  }
  if (rosterLineupState.teamManagerLiveEditMode) {
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
  rosterLineupState.teamManagerState.players = plan.nextPlayers;
  rosterLineupState.teamManagerState.defaultLineup = normalizePlayers(rosterLineupState.teamManagerState.defaultLineup || []).filter(name =>
    plan.nextPlayers.some(player => player.name === name && !player.out && player.role !== "L")
  );
  const liberoNames = plan.nextPlayers.filter(player => player.role === "L" && !player.out).map(player => player.name);
  if (!liberoNames.includes(rosterLineupState.teamManagerState.preferredLibero)) {
    rosterLineupState.teamManagerState.preferredLibero = liberoNames[0] || "";
  }
  renderTeamManagerTable();
}

export function handleTeamSelectChange(selectedOverride = "") {
  if (!matchState.elTeamsSelect && !selectedOverride) return;
  const selected = selectedOverride || matchState.elTeamsSelect.value;
  if (!selected) {
    updateTeamButtonsState();
    return;
  }
  if (matchState.state.useOpponentTeam && selected === matchState.state.selectedOpponentTeam) {
    alert("Non puoi selezionare la stessa squadra come avversaria.");
    renderTeamsSelect();
    return;
  }
  const hasData = hasMatchDataForReset();
  const isChanging = selected !== matchState.state.selectedTeam;
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
  matchState.state.selectedTeam = selected;
  matchState.state.match = matchState.state.match || {};
  matchState.state.match.teamName = selected;
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

export function handleOpponentTeamSelectChange(selectedOverride = "") {
  if (!rosterLineupState.elOpponentTeamsSelect && !selectedOverride) return;
  const selected = selectedOverride || rosterLineupState.elOpponentTeamsSelect.value;
  if (selected && selected === matchState.state.selectedTeam) {
    alert("Non puoi selezionare la stessa squadra come avversaria.");
    if (rosterLineupState.elOpponentTeamsSelect) rosterLineupState.elOpponentTeamsSelect.value = "";
    renderOpponentTeamsSelect();
    return;
  }
  const hasData = hasMatchDataForReset();
  const isChanging = selected !== matchState.state.selectedOpponentTeam;
  if (isChanging && hasData) {
    alert("Non puoi cambiare la squadra avversaria dopo l'inizio dello scout. Esegui prima il reset del match.");
    renderOpponentTeamsSelect();
    return;
  }
  if (!selected) {
    matchState.state.selectedOpponentTeam = "";
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
  matchState.state.selectedOpponentTeam = selected;
  if (matchState.state.useOpponentTeam) {
    matchState.state.match.opponent = selected;
    ensureMatchDefaults();
    saveState();
  }
  updateOpponentTeamButtonsState();
  const roster = extractRosterFromTeam(team);
  const applied = courtEngineState.updateOpponentPlayersList(roster.players || [], {
    liberos: roster.liberos || [],
    playerNumbers: roster.numbers || {},
    captains: roster.captains || []
  });
  if (applied === false) return;
  matchState.state.opponentPreferredLibero = roster.preferredLibero || roster.liberos?.[0] || "";
  renderOpponentLiberoChipsInline();
  const opponentDefaultLineup =
    roster.defaultLineup && roster.defaultLineup.length > 0
      ? roster.defaultLineup
      : roster.playersDetailed && roster.playersDetailed.length > 0
        ? roster.playersDetailed.filter(p => !p.out && p.role !== "L").map(p => p.name)
        : roster.players || [];
  applyOpponentDefaultLineup(opponentDefaultLineup, roster.defaultRotation || 1);
  renderOpponentPlayers();
  if (!matchState.state.match.opponent) {
    matchState.state.match.opponent = selected;
    ensureMatchDefaults();
  }
  renderOpponentTeamsSelect();
  saveState();
}

export function renderLiberoTags() {publishLiberoBench();}

export function renderOpponentLiberoTags() {publishLiberoBench();}
