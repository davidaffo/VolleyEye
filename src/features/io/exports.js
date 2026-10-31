import { buildMatchExportPayload } from "../storage/match-payload.js";
import { session as matchState, downloadBlob } from "../../../js/globals.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { getTrajectoryBg, getServeTrajectoryImages } from "../analysis/trajectory-canvas.js";
import { renderPlayerTrajectoryAnalysis, renderPlayerServeTrajectoryAnalysis } from "../analysis/player-trajectories.js";
import { buildMatchDisplayName, safeMatchSlug } from "../teams/match-details.js";
import { applyTheme } from "../teams/core/state-store.js";
import { cloneIsolationData } from "../../domain/snapshots.js";
import { setActiveTab, setActiveAggTab } from "../core/app-lifecycle.js";
import { session as browserEffectsState } from "../../app/browser-effects.js";
import { getCurrentMatchPayload } from "../teams/current-payload.js";
import { loadTeamsMapFromStorage } from "../teams/storage/team-repository.js";

export function prepareAnalysisFiltersForPdf(container) {
  if (!container) return () => {};
  const touched = [];
  const summaries = [];
  const setAttr = (el, name, value) => {
    if (!el) return;
    touched.push({ el, name, prev: el.getAttribute(name) });
    el.setAttribute(name, value);
  };
  const buildSummary = items => {
    const wrap = document.createElement("div");
    wrap.className = "pdf-filter-summary";
    const title = document.createElement("span");
    title.className = "pdf-filter-summary__title";
    title.textContent = "Filtri attivi:";
    wrap.appendChild(title);
    items.forEach(item => {
      const chip = document.createElement("span");
      chip.className = "pdf-filter-chip";
      chip.textContent = item.label + ": " + item.values.join(", ");
      wrap.appendChild(chip);
    });
    return wrap;
  };
  const containers = container.querySelectorAll(".analysis-filters, .trajectory-filters");
  containers.forEach(filterGroup => {
    const items = [];
    const filters = filterGroup.querySelectorAll(".analysis-filter, .trajectory-filter");
    filters.forEach(filter => {
      const labelEl = filter.querySelector(".analysis-filter__label, .trajectory-filter__label");
      const label = labelEl ? labelEl.textContent.trim() : "";
      const values = [];
      const labels = filter.querySelectorAll("label");
      labels.forEach(lbl => {
        const input = lbl.querySelector("input");
        if (!input || !input.checked) return;
        const text = lbl.textContent.trim();
        if (text) values.push(text);
      });
      const select = filter.querySelector("select");
      if (select) {
        const val = (select.value || "").trim();
        const active = val !== "" && val !== "any";
        if (active) {
          const opt = select.selectedOptions && select.selectedOptions[0];
          const text = opt ? opt.textContent.trim() : val;
          values.push(text);
        }
      }
      if (values.length) {
        items.push({ label: label || "Filtro", values });
      }
    });
    if (items.length === 0) {
      setAttr(filterGroup, "data-pdf-hide", "true");
      return;
    }
    const summary = buildSummary(items);
    filterGroup.parentNode.insertBefore(summary, filterGroup);
    summaries.push(summary);
    setAttr(filterGroup, "data-pdf-hide", "true");
  });
  return () => {
    summaries.forEach(node => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    touched.forEach(({ el, name, prev }) => {
      if (!el) return;
      if (prev === null) {
        el.removeAttribute(name);
      } else {
        el.setAttribute(name, prev);
      }
    });
  };
}

export function waitForImages(images) {
  const pending = images
    .filter(img => img && !img.complete)
    .map(
      img =>
        new Promise(resolve => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        })
    );
  if (!pending.length) return Promise.resolve();
  return Promise.all(pending).then(() => undefined);
}

export async function ensureTrajectoryAssetsLoaded(activeSubtab) {
  if (activeSubtab === "trajectory") {
    const canvases = rosterLineupState.elTrajectoryGrid ? rosterLineupState.elTrajectoryGrid.querySelectorAll("canvas[data-traj-canvas]") : [];
    const imgs = [];
    canvases.forEach(canvas => {
      const zone = parseInt(canvas.dataset.trajCanvas, 10);
      if (!isNaN(zone)) imgs.push(getTrajectoryBg(zone));
    });
    await waitForImages(imgs);
    renderTrajectoryAnalysis();
  }
  if (activeSubtab === "serve") {
    const imgs = getServeTrajectoryImages();
    await waitForImages([imgs && imgs.start, imgs && imgs.end].filter(Boolean));
    renderServeTrajectoryAnalysis();
  }
  if (activeSubtab === "player") {
    const canvases = rosterLineupState.elPlayerTrajectoryGrid
      ? rosterLineupState.elPlayerTrajectoryGrid.querySelectorAll("canvas[data-traj-canvas]")
      : [];
    const imgs = [];
    canvases.forEach(canvas => {
      const zone = parseInt(canvas.dataset.trajCanvas, 10);
      if (!isNaN(zone)) imgs.push(getTrajectoryBg(zone));
    });
    const serveImgs = getServeTrajectoryImages();
    imgs.push(serveImgs && serveImgs.start, serveImgs && serveImgs.end);
    await waitForImages(imgs.filter(Boolean));
    renderPlayerTrajectoryAnalysis();
    renderPlayerServeTrajectoryAnalysis();
  }
}

export function setPrintMatchTitle() {
  const el = document.getElementById("print-match-title");
  if (!el) return;
  const label =
    (buildMatchDisplayName(matchState.state.match)) ||
    (matchState.state.match && matchState.state.match.opponent) ||
    "";
  el.textContent = label || "Match";
}

export async function openAnalysisPrintLayout() {
  const aggPanel = document.getElementById("aggregated-panel");
  if (!aggPanel) {
    throw new Error("Pannello analisi non trovato");
  }
  const prevTab = rosterLineupState.activeTab;
  const prevAggTab = rosterLineupState.activeAggTab;
  const prevTheme = matchState.state.theme || document.body.dataset.theme || "dark";
  setActiveTab("aggregated");
  setActiveAggTab(prevAggTab || rosterLineupState.activeAggTab || "summary");
  applyTheme("light", { persistPreference: false });
  document.body.classList.add("pdf-capture");
  setPrintMatchTitle();
  const captureTarget = aggPanel.querySelector(".agg-subpanel.active") || aggPanel;
  const restoreFilters = prepareAnalysisFiltersForPdf(captureTarget);
  try {
    await new Promise(res => browserEffectsState.setTimeout(res, 120));
    await ensureTrajectoryAssetsLoaded(rosterLineupState.activeAggTab);
    await new Promise(res => requestAnimationFrame(res));
    window.print();
  } finally {
    restoreFilters();
    document.body.classList.remove("pdf-capture");
    applyTheme(prevTheme, { persistPreference: false });
    if (prevTab) setActiveTab(prevTab);
    if (prevAggTab) setActiveAggTab(prevAggTab);
  }
}



export function buildDatabaseBackupPayload() {
  const payload = buildMatchExportPayload();
  payload.kind = "database-backup";
  payload.savedAt = payload.exportedAt;
  const savedMatches =
    matchState.state && matchState.state.savedMatches && typeof matchState.state.savedMatches === "object"
      ? JSON.parse(JSON.stringify(matchState.state.savedMatches))
      : {};
  const currentMatchName = String(matchState.state.loadedMatchName || matchState.state.selectedMatch || "").trim();
  if (currentMatchName) {
    savedMatches[currentMatchName] = getCurrentMatchPayload(currentMatchName);
  }
  payload.state.savedMatches = savedMatches;
  const savedTeams =
    (loadTeamsMapFromStorage());
  payload.state.savedTeams =
    (cloneIsolationData(savedTeams));
  payload.state.savedOpponentTeams =
    (cloneIsolationData(savedTeams));
  payload.state.playersDb =
    (cloneIsolationData(matchState.state.playersDb || {}));
  payload.state.selectedMatch = matchState.state.selectedMatch || "";
  payload.state.loadedMatchName = matchState.state.loadedMatchName || matchState.state.selectedMatch || "";
  return payload;
}

export async function exportMatchToFile() {
  const payload = buildMatchExportPayload();
  const json = JSON.stringify(payload, null, 2);
  const opponentSlug = safeMatchSlug();
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, "match_" + opponentSlug + ".json");
  if (typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("match_exported", { export_format: "json" });
  }
}

export function getMatchSheetPrintScale(width, height, pageWidth, pageHeight) {
  if (width <= 0 || height <= 0 || pageWidth <= 0 || pageHeight <= 0) return 1;
  return Math.min(1, (pageWidth - 2) / width, (pageHeight - 2) / height);
}

export function prepareMatchSheetPrint() {
  if (document.body.dataset.aggTab !== "match-sheet") return;
  const sheet = document.getElementById("match-sheet-page");
  if (!sheet) return;
  clearMatchSheetPrint();
  const root = document.createElement("div");
  root.id = "match-sheet-print-root";
  const copy = sheet.cloneNode(true);
  copy.removeAttribute("id");
  root.appendChild(copy);
  document.body.appendChild(root);
  document.body.classList.add("printing-match-sheet");
  // Measure the unscaled sheet, including overflowing descendants, on both axes.
  const page = root.getBoundingClientRect();
  const bounds = copy.getBoundingClientRect();
  let width = Math.max(copy.scrollWidth, bounds.width);
  let height = Math.max(copy.scrollHeight, bounds.height);
  copy.querySelectorAll("*").forEach(element => {
    const rect = element.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    width = Math.max(width, rect.right - bounds.left);
    height = Math.max(height, rect.bottom - bounds.top);
  });
  const scale = getMatchSheetPrintScale(width, height, page.width, page.height);
  copy.style.transform = `scale(${scale})`;
  copy.style.left = `${Math.max(0, (page.width - width * scale) / 2)}px`;

}

export function clearMatchSheetPrint() {
  document.getElementById("match-sheet-print-root")?.remove();
  document.body.classList.remove("printing-match-sheet");
}

