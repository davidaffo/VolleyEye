function buildCsvString() {
  if (!state.events || state.events.length === 0) return "";
  const header = [
    "timestamp",
    "set",
    "rotation",
    "playerIdx",
    "playerName",
    "skillId",
    "code",
    "opponent",
    "category",
    "matchDate",
    "notes"
  ];
  const lines = [];
  lines.push(header.join(";"));
  state.events.forEach(ev => {
    const row = [
      ev.t,
      ev.set,
      ev.rotation || "",
      ev.playerIdx,
      '"' + (ev.playerName || "").replace(/"/g, '""') + '"',
      ev.skillId,
      ev.code,
      '"' + (state.match.opponent || "").replace(/"/g, '""') + '"',
      '"' + (state.match.category || "").replace(/"/g, '""') + '"',
      state.match.date || "",
      '"' + (state.match.notes || "").replace(/"/g, '""') + '"'
    ];
    lines.push(row.join(";"));
  });
  return lines.join("\n");
}
function safeMatchSlug() {
  const datePart = (state.match && state.match.date) || "";
  const opponentSlug = (state.match.opponent || "match").replace(/\s+/g, "_");
  return (datePart ? datePart + "_" : "") + opponentSlug;
}
function downloadCsv(csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scout_" + safeMatchSlug() + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function exportCsv() {
  const csv = buildCsvString();
  if (!csv) {
    alert("Nessun evento da esportare.");
    return;
  }
  downloadCsv(csv);
}
function copyCsvToClipboard() {
  const csv = buildCsvString();
  if (!csv) {
    alert("Nessun evento da copiare.");
    return;
  }
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    alert("Copia negli appunti non supportata su questo dispositivo.");
    return;
  }
  navigator.clipboard
    .writeText(csv)
    .then(() => alert("CSV copiato negli appunti."))
    .catch(() => alert("Impossibile copiare negli appunti su questo dispositivo."));
}
function loadScriptOnce(url, globalCheck) {
  return new Promise((resolve, reject) => {
    if (globalCheck && globalCheck()) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="' + url + '"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", e => reject(e));
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = e => reject(e);
    document.head.appendChild(script);
  });
}
async function ensurePdfLibs() {
  try {
    await loadScriptOnce(
      "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
      () => typeof window.html2canvas === "function"
    );
    await loadScriptOnce(
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      () => window.jspdf && typeof window.jspdf.jsPDF === "function"
    );
    return true;
  } catch (err) {
    logError("pdf-libs", err);
    return false;
  }
}
function prepareAnalysisFiltersForPdf(container) {
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
function waitForImages(images) {
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
async function ensureTrajectoryAssetsLoaded(activeSubtab) {
  if (activeSubtab === "trajectory") {
    const canvases = elTrajectoryGrid ? elTrajectoryGrid.querySelectorAll("canvas[data-traj-canvas]") : [];
    const imgs = [];
    canvases.forEach(canvas => {
      const zone = parseInt(canvas.dataset.trajCanvas, 10);
      if (!isNaN(zone)) imgs.push(getTrajectoryBg(zone));
    });
    await waitForImages(imgs);
    if (typeof renderTrajectoryAnalysis === "function") {
      renderTrajectoryAnalysis();
    }
  }
  if (activeSubtab === "serve") {
    const imgs = getServeTrajectoryImages();
    await waitForImages([imgs && imgs.start, imgs && imgs.end].filter(Boolean));
    if (typeof renderServeTrajectoryAnalysis === "function") {
      renderServeTrajectoryAnalysis();
    }
  }
  if (activeSubtab === "player") {
    const canvases = elPlayerTrajectoryGrid
      ? elPlayerTrajectoryGrid.querySelectorAll("canvas[data-traj-canvas]")
      : [];
    const imgs = [];
    canvases.forEach(canvas => {
      const zone = parseInt(canvas.dataset.trajCanvas, 10);
      if (!isNaN(zone)) imgs.push(getTrajectoryBg(zone));
    });
    const serveImgs = getServeTrajectoryImages();
    imgs.push(serveImgs && serveImgs.start, serveImgs && serveImgs.end);
    await waitForImages(imgs.filter(Boolean));
    if (typeof renderPlayerTrajectoryAnalysis === "function") {
      renderPlayerTrajectoryAnalysis();
    }
    if (typeof renderPlayerServeTrajectoryAnalysis === "function") {
      renderPlayerServeTrajectoryAnalysis();
    }
  }
}
function setPrintMatchTitle() {
  const el = document.getElementById("print-match-title");
  if (!el) return;
  const label =
    (typeof buildMatchDisplayName === "function" && buildMatchDisplayName(state.match)) ||
    (state.match && state.match.opponent) ||
    "";
  el.textContent = label || "Match";
}
async function captureAnalysisAsPdf() {
  const pdfReady = await ensurePdfLibs();
  const aggPanel = document.getElementById("aggregated-panel");
  if (!aggPanel) {
    throw new Error("Pannello analisi non trovato");
  }
  const prevTab = activeTab;
  const prevAggTab = activeAggTab;
  const prevTheme = state.theme || document.body.dataset.theme || "dark";
  setActiveTab("aggregated");
  setActiveAggTab(prevAggTab || activeAggTab || "summary");
  applyTheme("light", { persistPreference: false });
  document.body.classList.add("pdf-capture");
  setPrintMatchTitle();
  const captureTarget = aggPanel.querySelector(".agg-subpanel.active") || aggPanel;
  const restoreFilters = prepareAnalysisFiltersForPdf(captureTarget);
  try {
    await new Promise(res => setTimeout(res, 120));
    await ensureTrajectoryAssetsLoaded(activeAggTab);
    await new Promise(res => requestAnimationFrame(res));
    if (!pdfReady) {
      window.print();
      return;
    }
    const canvas = await window.html2canvas(captureTarget, {
      backgroundColor: "#ffffff",
      scale: 1.3,
      allowTaint: true,
      useCORS: true,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.72);
    const pdf = new window.jspdf.jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const renderWidth = pageWidth - margin * 2;
    const ratio = renderWidth / imgWidth;
    let renderHeight = imgHeight * ratio;
    if (renderHeight > pageHeight - margin * 2) {
      const ratioH = (pageHeight - margin * 2) / imgHeight;
      renderHeight = imgHeight * ratioH;
    }
    pdf.addImage(imgData, "PNG", margin, margin, renderWidth, renderHeight);
    const blob = pdf.output("blob");
    const fileName = "analisi_" + safeMatchSlug() + ".pdf";
    downloadBlob(blob, fileName);
  } finally {
    restoreFilters();
    document.body.classList.remove("pdf-capture");
    applyTheme(prevTheme, { persistPreference: false });
    if (prevTab) setActiveTab(prevTab);
    if (prevAggTab) setActiveAggTab(prevAggTab);
  }
}
async function openAnalysisPrintLayout() {
  const aggPanel = document.getElementById("aggregated-panel");
  if (!aggPanel) {
    throw new Error("Pannello analisi non trovato");
  }
  const prevTab = activeTab;
  const prevAggTab = activeAggTab;
  const prevTheme = state.theme || document.body.dataset.theme || "dark";
  setActiveTab("aggregated");
  setActiveAggTab(prevAggTab || activeAggTab || "summary");
  applyTheme("light", { persistPreference: false });
  document.body.classList.add("pdf-capture");
  setPrintMatchTitle();
  const captureTarget = aggPanel.querySelector(".agg-subpanel.active") || aggPanel;
  const restoreFilters = prepareAnalysisFiltersForPdf(captureTarget);
  try {
    await new Promise(res => setTimeout(res, 120));
    await ensureTrajectoryAssetsLoaded(activeAggTab);
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
function buildMatchExportPayload() {
  syncEventPlayerLinks(state.events || []);
  const payload = {
    app: "volleyeye",
    version: 1,
    exportedAt: new Date().toISOString(),
    state: {
      match: state.match,
      theme: state.theme,
      currentSet: state.currentSet,
      rotation: state.rotation,
      isServing: !!state.isServing,
      autoRotatePending: !!state.autoRotatePending,
      opponentAutoRotatePending: !!state.opponentAutoRotatePending,
      skillClock: state.skillClock,
      players: state.players,
      captains: (state.captains || []).slice(0, 1),
      playerNumbers: state.playerNumbers,
      liberos: state.liberos,
      opponentStats: state.opponentStats,
      opponentPlayers: state.opponentPlayers,
      opponentPlayerNumbers: state.opponentPlayerNumbers,
      opponentLiberos: state.opponentLiberos,
      opponentCaptains: state.opponentCaptains,
      opponentCourt: state.opponentCourt,
      opponentRotation: state.opponentRotation,
      opponentCourtViewMirrored: !!state.opponentCourtViewMirrored,
      opponentAutoRoleP1American: !!state.opponentAutoRoleP1American,
      opponentAttackTrajectoryEnabled: state.opponentAttackTrajectoryEnabled !== false,
      opponentServeTrajectoryEnabled: state.opponentServeTrajectoryEnabled !== false,
      opponentSetTypePromptEnabled: state.opponentSetTypePromptEnabled !== false,
      opponentAutoLiberoBackline: state.opponentAutoLiberoBackline !== false,
      opponentAutoLiberoRole: state.opponentAutoLiberoRole,
      opponentLiberoAutoMap: state.opponentLiberoAutoMap,
      opponentPreferredLibero: state.opponentPreferredLibero,
      opponentSkillFlowOverride: state.opponentSkillFlowOverride,
      opponentSkillConfig: state.opponentSkillConfig,
      court: state.court,
      events: state.events,
      stats: state.stats,
      metricsConfig: state.metricsConfig,
      scoreOverrides: state.scoreOverrides,
      setResults: state.setResults,
      setStarts: state.setStarts,
      matchFinished: state.matchFinished,
      selectedTeam: state.selectedTeam,
      selectedOpponentTeam: state.selectedOpponentTeam,
      video: state.video,
      pointRules: state.pointRules,
      autoRotate: state.autoRotate,
      predictiveSkillFlow: state.predictiveSkillFlow !== false,
      skillFlowOverride: state.skillFlowOverride,
      pendingServe: state.pendingServe,
      forceSkillActive: !!state.forceSkillActive,
      forceSkillScope: state.forceSkillScope,
      autoLiberoBackline: state.autoLiberoBackline,
      autoLiberoRole: state.autoLiberoRole,
      liberoAutoMap: state.liberoAutoMap,
      preferredLibero: state.preferredLibero,
      nextSetType: state.nextSetType,
      freeballPending: !!state.freeballPending,
      freeballPendingScope: state.freeballPendingScope,
      flowTeamScope: state.flowTeamScope,
      useOpponentTeam: !!state.useOpponentTeam,
      videoFilterPresets:
        typeof normalizeVideoFilterPresets === "function"
          ? normalizeVideoFilterPresets(state.videoFilterPresets || [])
          : Array.isArray(state.videoFilterPresets)
            ? state.videoFilterPresets
            : [],
      courtViewMirrored: !!state.courtViewMirrored,
      courtSideSwapped: !!state.courtSideSwapped,
      loadedMatchName: state.loadedMatchName || state.selectedMatch || ""
    }
  };
  return typeof cloneIsolationData === "function" ? cloneIsolationData(payload) : JSON.parse(JSON.stringify(payload));
}
function buildDatabaseBackupPayload() {
  const payload = buildMatchExportPayload();
  payload.kind = "database-backup";
  payload.savedAt = payload.exportedAt;
  const savedMatches =
    state && state.savedMatches && typeof state.savedMatches === "object"
      ? JSON.parse(JSON.stringify(state.savedMatches))
      : {};
  const currentMatchName = String(state.loadedMatchName || state.selectedMatch || "").trim();
  if (currentMatchName && typeof getCurrentMatchPayload === "function") {
    savedMatches[currentMatchName] = getCurrentMatchPayload(currentMatchName);
  }
  payload.state.savedMatches = savedMatches;
  const savedTeams =
    typeof loadTeamsMapFromStorage === "function"
      ? loadTeamsMapFromStorage()
      : state.savedTeams || {};
  payload.state.savedTeams =
    typeof cloneIsolationData === "function" ? cloneIsolationData(savedTeams) : JSON.parse(JSON.stringify(savedTeams));
  payload.state.savedOpponentTeams =
    typeof cloneIsolationData === "function"
      ? cloneIsolationData(savedTeams)
      : JSON.parse(JSON.stringify(savedTeams));
  payload.state.playersDb =
    typeof cloneIsolationData === "function"
      ? cloneIsolationData(state.playersDb || {})
      : JSON.parse(JSON.stringify(state.playersDb || {}));
  payload.state.selectedMatch = state.selectedMatch || "";
  payload.state.loadedMatchName = state.loadedMatchName || state.selectedMatch || "";
  return payload;
}
async function exportMatchToFile() {
  const payload = buildMatchExportPayload();
  const json = JSON.stringify(payload, null, 2);
  const opponentSlug = safeMatchSlug();
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, "match_" + opponentSlug + ".json");
  if (typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("match_exported", { export_format: "json" });
  }
}
