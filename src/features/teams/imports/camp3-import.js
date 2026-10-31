import { ensureMatchDefaults } from "../match-details.js";
import { readCamp3FileAsArrayBuffer, readCamp3FileAsText } from "../../io/file-readers.js";
import { normalizePlayers } from "../../../domain/player-names.js";
import { applyOpponentDefaultLineup } from "../lineup-commands.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { loadTeamFromStorage, extractRosterFromTeam, loadOpponentTeamFromStorage } from "../storage/team-repository.js";
import { publishCamp3ConfirmView, setCamp3ConfirmOpen } from "../camp3-view.js";
import { openTeamManagerModal, refreshTeamManagerFromSelection } from "../editor/team-editor.js";
import { renderTeamManagerTable } from "../editor-view.js";
import { session as matchState } from "../../../../js/globals.js";
import { updateTeamButtonsState, updateOpponentTeamButtonsState, publishTeamsManagerView } from "../manager-view.js";
import { hasMatchDataForReset } from "../../storage/match-repository.js";
import { updatePlayersList } from "../court/court-ui-bootstrap.js";
import { renderLiberoBench } from "../../scout/court-commands.js";
import { saveState } from "../../storage/save-state.js";
import { session as courtEngineState } from "../court/court-engine.js";
import { renderOpponentPlayers } from "../../live/team-rendering.js";
import { parseCamp3RosterText, createCamp3ReviewDraft, buildCamp3ImportPlanFromDraft, formatCamp3ImportPreview } from "./camp3-model.js";

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
  publishCamp3ConfirmView(draft);
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
    publishTeamsManagerView();
    return;
  }
  const hasData = hasMatchDataForReset();
  const isChanging = selected !== matchState.state.selectedTeam;
  if (isChanging && hasData) {
    alert("Non puoi cambiare squadra dopo l'inizio dello scout. Esegui prima il reset del match.");
    publishTeamsManagerView();
    return;
  }
  const team = loadTeamFromStorage(selected);
  if (!team) {
    alert("Squadra non trovata o corrotta.");
    publishTeamsManagerView();
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
  renderLiberoBench();
  publishTeamsManagerView();
  renderLiberoBench();
  refreshTeamManagerFromSelection();
}

export function handleOpponentTeamSelectChange(selectedOverride = "") {
  if (!rosterLineupState.elOpponentTeamsSelect && !selectedOverride) return;
  const selected = selectedOverride || rosterLineupState.elOpponentTeamsSelect.value;
  if (selected && selected === matchState.state.selectedTeam) {
    alert("Non puoi selezionare la stessa squadra come avversaria.");
    if (rosterLineupState.elOpponentTeamsSelect) rosterLineupState.elOpponentTeamsSelect.value = "";
    publishTeamsManagerView();
    return;
  }
  const hasData = hasMatchDataForReset();
  const isChanging = selected !== matchState.state.selectedOpponentTeam;
  if (isChanging && hasData) {
    alert("Non puoi cambiare la squadra avversaria dopo l'inizio dello scout. Esegui prima il reset del match.");
    publishTeamsManagerView();
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
    publishTeamsManagerView();
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
  renderLiberoBench();
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
  publishTeamsManagerView();
  saveState();
}
