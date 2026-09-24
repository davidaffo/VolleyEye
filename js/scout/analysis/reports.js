function buildAggregatedDataForPdf() {
  const emptyCounts = () => ({ "#": 0, "+": 0, "!": 0, "-": 0, "=": 0, "/": 0 });
  const getCounts = (idx, skillId) => {
    const base =
      (state.stats[idx] && state.stats[idx][skillId]) || {
        "#": 0,
        "+": 0,
        "!": 0,
        "-": 0,
        "=": 0,
        "/": 0
      };
    return Object.assign(emptyCounts(), base);
  };
  const totalFromCounts = counts => {
    const safeCounts = Object.assign(emptyCounts(), counts || {});
    return (
      (safeCounts["#"] || 0) +
      (safeCounts["+"] || 0) +
      (safeCounts["!"] || 0) +
      (safeCounts["-"] || 0) +
      (safeCounts["="] || 0) +
      (safeCounts["/"] || 0)
    );
  };
  const totalsBySkill = {
    serve: emptyCounts(),
    pass: emptyCounts(),
    freeball: emptyCounts(),
    attack: emptyCounts(),
    defense: emptyCounts(),
    block: emptyCounts(),
    second: emptyCounts()
  };
  const addCounts = (target, source) => {
    RESULT_CODES.forEach(code => {
      target[code] = (target[code] || 0) + (source[code] || 0);
    });
  };
  const rows = getSortedPlayerEntries().map(({ name, idx }) => {
    const serveCounts = getCounts(idx, "serve");
    const passCounts = getCounts(idx, "pass");
    const freeballCounts = getCounts(idx, "freeball");
    const attackCounts = getCounts(idx, "attack");
    const defenseCounts = getCounts(idx, "defense");
    const blockCounts = getCounts(idx, "block");
    const secondCounts = getCounts(idx, "second");

    const serveMetrics = computeMetrics(serveCounts, "serve");
    const passMetrics = computeMetrics(passCounts, "pass");
    const freeballMetrics = computeMetrics(freeballCounts, "freeball");
    const attackMetrics = computeMetrics(attackCounts, "attack");
    const defenseMetrics = computeMetrics(defenseCounts, "defense");
    const blockMetrics = computeMetrics(blockCounts, "block");
    const secondMetrics = computeMetrics(secondCounts, "second");

    addCounts(totalsBySkill.serve, serveCounts);
    addCounts(totalsBySkill.pass, passCounts);
    addCounts(totalsBySkill.freeball, freeballCounts);
    addCounts(totalsBySkill.attack, attackCounts);
    addCounts(totalsBySkill.defense, defenseCounts);
    addCounts(totalsBySkill.block, blockCounts);
    addCounts(totalsBySkill.second, secondCounts);

    return {
      name: formatNameWithNumber(name),
      serve: {
        tot: totalFromCounts(serveCounts),
        neg: serveMetrics.negativeCount || 0,
        pos: serveMetrics.pos === null ? "-" : formatPercent(serveMetrics.pos),
        eff: serveMetrics.eff === null ? "-" : formatPercent(serveMetrics.eff)
      },
      pass: {
        tot: totalFromCounts(passCounts),
        neg: passMetrics.negativeCount || 0,
        pos: passMetrics.pos === null ? "-" : formatPercent(passMetrics.pos),
        prf: passMetrics.prf === null ? "-" : formatPercent(passMetrics.prf)
      },
      freeball: {
        tot: totalFromCounts(freeballCounts),
        neg: freeballMetrics.negativeCount || 0,
        pos: freeballMetrics.pos === null ? "-" : formatPercent(freeballMetrics.pos),
        prf: freeballMetrics.prf === null ? "-" : formatPercent(freeballMetrics.prf)
      },
      attack: {
        tot: totalFromCounts(attackCounts),
        neg: attackMetrics.negativeCount || 0,
        pos: attackMetrics.pos === null ? "-" : formatPercent(attackMetrics.pos),
        eff: attackMetrics.eff === null ? "-" : formatPercent(attackMetrics.eff)
      },
      defense: {
        tot: totalFromCounts(defenseCounts),
        neg: defenseMetrics.negativeCount || 0,
        pos: defenseMetrics.pos === null ? "-" : formatPercent(defenseMetrics.pos),
        eff: defenseMetrics.eff === null ? "-" : formatPercent(defenseMetrics.eff)
      },
      block: {
        tot: totalFromCounts(blockCounts),
        neg: blockMetrics.negativeCount || 0,
        pos: blockMetrics.pos === null ? "-" : formatPercent(blockMetrics.pos),
        eff: blockMetrics.eff === null ? "-" : formatPercent(blockMetrics.eff)
      },
      second: {
        tot: totalFromCounts(secondCounts),
        pos: secondMetrics.pos === null ? "-" : formatPercent(secondMetrics.pos),
        prf: secondMetrics.prf === null ? "-" : formatPercent(secondMetrics.prf)
      }
    };
  });
  const totals = (() => {
    const serveMetrics = computeMetrics(totalsBySkill.serve, "serve");
    const passMetrics = computeMetrics(totalsBySkill.pass, "pass");
    const freeballMetrics = computeMetrics(totalsBySkill.freeball, "freeball");
    const attackMetrics = computeMetrics(totalsBySkill.attack, "attack");
    const defenseMetrics = computeMetrics(totalsBySkill.defense, "defense");
    const blockMetrics = computeMetrics(totalsBySkill.block, "block");
    const secondMetrics = computeMetrics(totalsBySkill.second, "second");
    return {
      name: "Totale squadra",
      serve: {
        tot: totalFromCounts(totalsBySkill.serve),
        neg: serveMetrics.negativeCount || 0,
        pos: serveMetrics.pos === null ? "-" : formatPercent(serveMetrics.pos),
        eff: serveMetrics.eff === null ? "-" : formatPercent(serveMetrics.eff)
      },
      pass: {
        tot: totalFromCounts(totalsBySkill.pass),
        neg: passMetrics.negativeCount || 0,
        pos: passMetrics.pos === null ? "-" : formatPercent(passMetrics.pos),
        prf: passMetrics.prf === null ? "-" : formatPercent(passMetrics.prf)
      },
      freeball: {
        tot: totalFromCounts(totalsBySkill.freeball),
        neg: freeballMetrics.negativeCount || 0,
        pos: freeballMetrics.pos === null ? "-" : formatPercent(freeballMetrics.pos),
        prf: freeballMetrics.prf === null ? "-" : formatPercent(freeballMetrics.prf)
      },
      attack: {
        tot: totalFromCounts(totalsBySkill.attack),
        neg: attackMetrics.negativeCount || 0,
        pos: attackMetrics.pos === null ? "-" : formatPercent(attackMetrics.pos),
        eff: attackMetrics.eff === null ? "-" : formatPercent(attackMetrics.eff)
      },
      defense: {
        tot: totalFromCounts(totalsBySkill.defense),
        neg: defenseMetrics.negativeCount || 0,
        pos: defenseMetrics.pos === null ? "-" : formatPercent(defenseMetrics.pos),
        eff: defenseMetrics.eff === null ? "-" : formatPercent(defenseMetrics.eff)
      },
      block: {
        tot: totalFromCounts(totalsBySkill.block),
        neg: blockMetrics.negativeCount || 0,
        pos: blockMetrics.pos === null ? "-" : formatPercent(blockMetrics.pos),
        eff: blockMetrics.eff === null ? "-" : formatPercent(blockMetrics.eff)
      },
      second: {
        tot: totalFromCounts(totalsBySkill.second),
        pos: secondMetrics.pos === null ? "-" : formatPercent(secondMetrics.pos),
        prf: secondMetrics.prf === null ? "-" : formatPercent(secondMetrics.prf)
      }
    };
  })();
  return { rows, totals };
}
function padCell(text, width) {
  const str = (text === null || text === undefined ? "" : String(text)).replace(/\s+/g, " ");
  if (str.length === width) return str;
  if (str.length > width) return str.slice(0, width);
  return str + " ".repeat(width - str.length);
}
function formatAggRow(row) {
  const widths = [
    16, // nome
    4, 4, 4, 4, // serve
    4, 4, 4, 4, // pass
    4, 4, 4, 4, // freeball
    4, 4, 4, 4, // attack
    4, 4, 4, 4, // defense
    4, 4, 4, 4, // block
    4, 4, 4 // second
  ];
  const cells = [
    row.name || "",
    row.serve.tot,
    row.serve.neg,
    row.serve.pos,
    row.serve.eff,
    row.pass.tot,
    row.pass.neg,
    row.pass.pos,
    row.pass.prf,
    row.freeball.tot,
    row.freeball.neg,
    row.freeball.pos,
    row.freeball.prf,
    row.attack.tot,
    row.attack.neg,
    row.attack.pos,
    row.attack.eff,
    row.defense.tot,
    row.defense.neg,
    row.defense.pos,
    row.defense.eff,
    row.block.tot,
    row.block.neg,
    row.block.pos,
    row.block.eff,
    row.second.tot,
    row.second.pos,
    row.second.prf
  ];
  return cells
    .map((c, i) => padCell(c, widths[i] || 4))
    .join(" | ");
}
function buildAnalysisPdfLines() {
  const lines = [];
  const matchInfo = state.match || {};
  const setsData = computeSetScores();
  const pointsSummary = computePointsSummary();
  const aggData = buildAggregatedDataForPdf();
  lines.push("VolleyEye - Analisi");
  const infoParts = [];
  if (matchInfo.opponent) infoParts.push("Avversario: " + matchInfo.opponent);
  if (matchInfo.category) infoParts.push("Categoria: " + matchInfo.category);
  if (matchInfo.date) infoParts.push("Data: " + matchInfo.date);
  if (infoParts.length > 0) lines.push(infoParts.join(" · "));
  lines.push("Punteggio totale: " + pointsSummary.totalFor + " - " + pointsSummary.totalAgainst);
  if (setsData && setsData.sets && setsData.sets.length > 0) {
    lines.push(
      "Set: " +
        setsData.sets
          .map(s => "S" + s.set + " " + s.for + "-" + s.against)
          .join(" | ")
    );
  }
  lines.push("Rotazioni (fatti - subiti - delta):");
  pointsSummary.rotations.forEach(r => {
    lines.push(
      "  P" +
        r.rotation +
        ": " +
        r.for +
        " - " +
        r.against +
        " (Δ " +
        formatDelta(r.delta) +
        ")"
    );
  });
  lines.push("");
  lines.push(
    formatAggRow({
      name: "Atleta",
      serve: { tot: "Tot", neg: "Neg", pos: "Pos", eff: "Eff" },
      pass: { tot: "Tot", neg: "Neg", pos: "Pos", prf: "Prf" },
      freeball: { tot: "Tot", neg: "Neg", pos: "Pos", prf: "Prf" },
      attack: { tot: "Tot", neg: "Neg", pos: "Pos", eff: "Eff" },
      defense: { tot: "Tot", neg: "Neg", pos: "Pos", eff: "Eff" },
      block: { tot: "Tot", neg: "Neg", pos: "Pos", eff: "Eff" },
      second: { tot: "Tot", pos: "Pos", prf: "Prf" }
    })
  );
  lines.push("-".repeat(140));
  aggData.rows.forEach(r => lines.push(formatAggRow(r)));
  lines.push("-".repeat(140));
  lines.push(formatAggRow(aggData.totals));
  return lines;
}
function escapePdfText(str) {
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function buildSimplePdf(lines, opts = {}) {
  const fontSize = opts.fontSize || 10;
  const lineHeight = opts.lineHeight || 12;
  const margin = opts.margin || 32;
  const pageWidth = opts.landscape ? 842 : 595;
  const pageHeight = opts.landscape ? 595 : 842;
  let y = pageHeight - margin;
  const contentParts = [];
  contentParts.push("BT");
  contentParts.push("/F1 " + fontSize + " Tf");
  contentParts.push(lineHeight + " TL");
  contentParts.push(margin + " " + y + " Td");
  lines.forEach(line => {
    contentParts.push("(" + escapePdfText(line) + ") Tj");
    contentParts.push("0 -" + lineHeight + " Td");
    y -= lineHeight;
  });
  contentParts.push("ET");
  const contentStream = contentParts.join("\n");
  const contentLength = new TextEncoder().encode(contentStream).length;
  const objects = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " +
      pageWidth +
      " " +
      pageHeight +
      "] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj"
  );
  objects.push(
    "4 0 obj\n<< /Length " +
      contentLength +
      " >>\nstream\n" +
      contentStream +
      "\nendstream\nendobj"
  );
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj");
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  let currentOffset = pdf.length;
  objects.forEach(obj => {
    offsets.push(currentOffset);
    pdf += obj + "\n";
    currentOffset = pdf.length;
  });
  const xrefStart = currentOffset;
  pdf += "xref\n0 " + (objects.length + 1) + "\n";
  pdf += "0000000000 65535 f \n";
  offsets.forEach(off => {
    pdf += String(off).padStart(10, "0") + " 00000 n \n";
  });
  pdf +=
    "trailer\n<< /Size " +
    (objects.length + 1) +
    " /Root 1 0 R >>\nstartxref\n" +
    xrefStart +
    "\n%%EOF";
  return new TextEncoder().encode(pdf);
}
function exportAnalysisPdf() {
  const hasEvents = state.events && state.events.length > 0;
  if (!hasEvents) {
    alert("Nessun evento da esportare.");
    return;
  }
  if (typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("match_exported", { export_format: "pdf" });
  }
  openAnalysisPrintLayout().catch(err => {
    console.error("Print layout failed", err);
    alert("Impossibile aprire il layout di stampa.");
  });
}
function replaceExportCanvases(originalRoot, cloneRoot) {
  if (!originalRoot || !cloneRoot) return;
  const originalCanvases = originalRoot.querySelectorAll("canvas");
  const cloneCanvases = cloneRoot.querySelectorAll("canvas");
  cloneCanvases.forEach((canvas, idx) => {
    const source = originalCanvases[idx];
    if (!source || !source.toDataURL) return;
    let dataUrl = "";
    try {
      dataUrl = source.toDataURL("image/png");
    } catch (err) {
      dataUrl = "";
    }
    if (!dataUrl) return;
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = canvas.getAttribute("aria-label") || "";
    img.className = canvas.className;
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.borderRadius = "0.5rem";
    img.style.minHeight = "100px";
    canvas.replaceWith(img);
  });
}
function applyComputedStyles(originalRoot, cloneRoot, { skipDisplaySelectors = [] } = {}) {
  if (!originalRoot || !cloneRoot || !window.getComputedStyle) return;
  const originals = [originalRoot, ...originalRoot.querySelectorAll("*")];
  const clones = [cloneRoot, ...cloneRoot.querySelectorAll("*")];
  originals.forEach((orig, idx) => {
    const clone = clones[idx];
    if (!clone) return;
    const computed = window.getComputedStyle(orig);
    if (!computed) return;
    const skipDisplay = skipDisplaySelectors.some(sel => orig.matches(sel));
    let cssText = "";
    for (let i = 0; i < computed.length; i += 1) {
      const prop = computed[i];
      if (skipDisplay && prop === "display") continue;
      const val = computed.getPropertyValue(prop);
      cssText += `${prop}:${val};`;
    }
    clone.setAttribute("style", cssText);
  });
}
function ensureExportSplash() {
  let overlay = document.getElementById("export-splash");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "export-splash";
  overlay.className = "export-splash";
  overlay.innerHTML = `
    <div class="export-splash__card">
      <span class="export-splash__spinner" aria-hidden="true"></span>
      <span>Esportazione in corso…</span>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}
function showExportSplash() {
  const overlay = ensureExportSplash();
  requestAnimationFrame(() => {
    overlay.classList.add("is-visible");
  });
}
function hideExportSplash() {
  const overlay = document.getElementById("export-splash");
  if (overlay) overlay.classList.remove("is-visible");
}
async function collectInlineCss() {
  let cssText = "";
  if (document.styleSheets) {
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) return;
        const chunk = Array.from(rules)
          .map(rule => rule.cssText)
          .join("\n");
        cssText += chunk + "\n";
      } catch (err) {
        // Ignore cross-origin stylesheets.
      }
    });
  }
  if (cssText) return cssText;
  const link = document.querySelector('link[rel="stylesheet"]');
  if (link && link.sheet) {
    try {
      const rules = link.sheet.cssRules || link.sheet.rules;
      if (rules && rules.length) {
        cssText = Array.from(rules)
          .map(rule => rule.cssText)
          .join("\n");
        if (cssText) return cssText;
      }
    } catch (err) {
      // Ignore link.sheet access errors.
    }
  }
  const href = link ? link.getAttribute("href") : "style.css";
  if (!href) return "";
  if (window.location && window.location.protocol === "file:") {
    return "";
  }
  try {
    const url = new URL(href, window.location.href);
    const resp = await fetch(url.toString(), { cache: "no-store" });
    if (resp.ok) return await resp.text();
    if ("caches" in window) {
      const cached = await caches.match(url.toString());
      if (cached) return await cached.text();
    }
  } catch (err) {
    if ("caches" in window) {
      try {
        const url = new URL(href, window.location.href);
        const cached = await caches.match(url.toString());
        if (cached) return await cached.text();
      } catch (_) {
        return "";
      }
    }
    return "";
  }
  return "";
}
function getExportAssetPaths() {
  return [
    "images/trajectory/attack_empty_near.png",
    "images/trajectory/attack_empty_far.png",
    "images/trajectory/attack_2_near.png",
    "images/trajectory/attack_3_near.png",
    "images/trajectory/attack_4_near.png",
    "images/trajectory/attack_2_far.png",
    "images/trajectory/attack_3_far.png",
    "images/trajectory/attack_4_far.png",
    "images/trajectory/service_start_near.png",
    "images/trajectory/service_start_far.png",
    "images/trajectory/service_end_near.png",
    "images/trajectory/service_end_far.png"
  ];
}
async function fetchExportAssetAsDataUrl(assetPath) {
  if (!assetPath) return "";
  const toDataUrl =
    typeof blobToDataUrl === "function"
      ? blobToDataUrl
      : blob =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = err => reject(err);
            reader.readAsDataURL(blob);
          });
  try {
    const url = new URL(assetPath, window.location.href);
    let resp = await fetch(url.toString(), { cache: "no-store" });
    if (!resp.ok && "caches" in window) {
      const cached = await caches.match(url.toString());
      if (cached) resp = cached;
    }
    if (!resp || !resp.ok) return "";
    const blob = await resp.blob();
    return await toDataUrl(blob);
  } catch (err) {
    return "";
  }
}
async function buildExportAssetMap() {
  const assets = getExportAssetPaths();
  const map = {};
  for (const asset of assets) {
    const dataUrl = await fetchExportAssetAsDataUrl(asset);
    if (dataUrl) map[asset] = dataUrl;
  }
  return map;
}
function replaceExportAssetsInScript(source, assetMap) {
  if (!source || !assetMap) return source || "";
  let updated = source;
  Object.entries(assetMap).forEach(([path, dataUrl]) => {
    if (!path || !dataUrl) return;
    updated = updated.split(path).join(dataUrl);
  });
  return updated;
}
function replaceExportAssetsInText(source, assetMap) {
  return replaceExportAssetsInScript(source, assetMap);
}
function replaceExportAssetsInDom(root, assetMap) {
  if (!root || !assetMap) return;
  const entries = Object.entries(assetMap).filter(([path, dataUrl]) => path && dataUrl);
  if (!entries.length) return;
  root.querySelectorAll("[src],[href],[style]").forEach(node => {
    ["src", "href", "style"].forEach(attr => {
      const current = node.getAttribute && node.getAttribute(attr);
      if (!current) return;
      let next = current;
      entries.forEach(([path, dataUrl]) => {
        next = next.split(path).join(dataUrl);
      });
      if (next !== current) {
        node.setAttribute(attr, next);
      }
    });
  });
}
async function exportAnalysisHtml() {
  const aggPanel = document.getElementById("aggregated-panel");
  if (!aggPanel) {
    alert("Pannello analisi non trovato.");
    return;
  }
  if (typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("match_exported", { export_format: "html" });
  }
  const prevTab = activeTab;
  const prevAggTab = activeAggTab || "summary";
  const prevTheme = state.theme || document.body.dataset.theme || "dark";
  showExportSplash();
  try {
    if (typeof saveState === "function") {
      saveState({ persistLocal: true });
    }
    setActiveTab("aggregated");
    setActiveAggTab("summary");
    if (typeof renderAggregatedTable === "function") {
      renderAggregatedTable();
    }
    if (typeof renderTrajectoryAnalysis === "function") {
      renderTrajectoryAnalysis();
    }
    if (typeof renderServeTrajectoryAnalysis === "function") {
      renderServeTrajectoryAnalysis();
    }
    if (typeof renderVideoAnalysis === "function") {
      renderVideoAnalysis();
    }
    setPrintMatchTitle();
    const exportState = JSON.parse(JSON.stringify(state));
    const exportCurrentMatchName = String(state.loadedMatchName || state.selectedMatch || "").trim();
    if (exportCurrentMatchName) {
      exportState.savedMatches = exportState.savedMatches && typeof exportState.savedMatches === "object"
        ? exportState.savedMatches
        : {};
      if (typeof getCurrentMatchPayload === "function") {
        exportState.savedMatches[exportCurrentMatchName] = getCurrentMatchPayload(exportCurrentMatchName);
      }
      exportState.selectedMatch = exportCurrentMatchName;
      exportState.loadedMatchName = exportCurrentMatchName;
    }
    exportState.uiActiveTab = "aggregated";
    exportState.uiAggTab = "summary";
    const exportRoot = document.documentElement.cloneNode(true);
    const exportHead = exportRoot.querySelector("head");
    const exportBody = exportRoot.querySelector("body");
    if (!exportHead || !exportBody) {
      throw new Error("Impossibile creare il layout export.");
    }
    exportBody.dataset.activeTab = "aggregated";
    exportBody.dataset.aggTab = "summary";
    exportBody.classList.remove("pdf-capture");
    exportBody.querySelectorAll("#export-splash").forEach(el => el.remove());
    exportBody.querySelectorAll(".tabs-nav, .tabs-dots").forEach(el => el.remove());
    exportBody.querySelectorAll("#btn-open-multiscout, #btn-export-pdf, #btn-export-html").forEach(btn => {
      btn.remove();
    });
    exportBody.querySelectorAll(".tab-panel").forEach(panel => {
      if (panel.dataset.tab !== "aggregated") {
        panel.remove();
      } else {
        panel.classList.add("active");
      }
    });
    exportBody.querySelectorAll(".agg-subtab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.aggTabTarget === "summary");
    });
    exportBody.querySelectorAll(".agg-subpanel").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.aggTab === "summary");
    });
    exportHead.querySelectorAll('link[rel="stylesheet"], link[rel="manifest"], link[rel="apple-touch-icon"]').forEach(el =>
      el.remove()
    );
    exportRoot.querySelectorAll("script").forEach(script => script.remove());
    let cssText = await collectInlineCss();
    const exportOnlyCss = [
      ".tab-panel{display:none !important;}",
      ".tab-panel.active{display:block !important;}"
    ].join("\n");
    if (cssText) {
      cssText += "\n" + exportOnlyCss;
    } else {
      const exportAggPanel = exportBody.querySelector("#aggregated-panel");
      if (exportAggPanel) {
        applyComputedStyles(aggPanel, exportAggPanel, {
          skipDisplaySelectors: [".agg-subpanel", ".tab-panel", "#analysis-score-summary"]
        });
      }
      cssText = [
        "body{margin:0;background:#fff;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}",
        exportOnlyCss,
        ".agg-subpanel{display:none;}",
        ".agg-subpanel.active{display:block;}",
        "#analysis-score-summary.hidden{display:none;}"
      ].join("\n");
    }
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const scriptChunks = [];
    const failedScripts = [];
    for (const script of scripts) {
      const src = script.getAttribute("src");
      if (!src) continue;
      const url = new URL(src, window.location.href);
      let text = "";
      try {
        const resp = await fetch(url.toString(), { cache: "no-store" });
        if (resp.ok) {
          text = await resp.text();
        } else if ("caches" in window) {
          const cached = await caches.match(url.toString());
          if (cached) text = await cached.text();
        }
      } catch (err) {
        if ("caches" in window) {
          try {
            const cached = await caches.match(url.toString());
            if (cached) text = await cached.text();
          } catch (_) {
            text = "";
          }
        }
      }
      if (!text) {
        failedScripts.push(src);
        continue;
      }
      scriptChunks.push(text);
    }
    if (failedScripts.length) {
      alert(
        "Esportazione incompleta: non riesco a includere il JS (" +
          failedScripts.join(", ") +
          ")."
      );
      return;
    }
    const assetMap = await buildExportAssetMap();
    const assetMapJson = JSON.stringify(assetMap);
    const stateJson = JSON.stringify(exportState);
    const stateJsonBase64 = btoa(unescape(encodeURIComponent(stateJson)));
    cssText = replaceExportAssetsInText(cssText, assetMap);
    replaceExportAssetsInDom(exportRoot, assetMap);
    const prelude = `
(function(){
  try {
    var exportedStateJson = decodeURIComponent(escape(atob(${JSON.stringify(stateJsonBase64)})));
    window.__exportedAnalysisState = JSON.parse(exportedStateJson);
  } catch (e) {}
  window.__EXPORT_ANALYSIS_HTML__ = true;
  window.__analysisAssetMap = ${assetMapJson};
})();
`;
    const postlude = `
if (typeof getTrajectoryImageForZone === "function" && window.__analysisAssetMap) {
  var originalGetTrajectoryImageForZone = getTrajectoryImageForZone;
  var assetMap = window.__analysisAssetMap;
  getTrajectoryImageForZone = function(zone, isFarSide) {
    var path = originalGetTrajectoryImageForZone(zone, isFarSide);
    return assetMap && assetMap[path] ? assetMap[path] : path;
  };
}
if (typeof init === "function") {
  init();
}
if (typeof setActiveTab === "function") setActiveTab("aggregated");
if (typeof setActiveAggTab === "function") setActiveAggTab("summary");
`;
    const title = "Analisi - " + (getCurrentMatchLabel() || "Match");
    const styleTag = `<style>${cssText}</style>`;
    const mergedScripts = scriptChunks.map(chunk => replaceExportAssetsInScript(chunk, assetMap));
    const scriptTag = `<script>${prelude}\n${mergedScripts.join("\n")}\n${postlude}<\/script>`;
    exportHead.insertAdjacentHTML("beforeend", styleTag);
    exportBody.insertAdjacentHTML("beforeend", scriptTag);
    exportHead.querySelectorAll("title").forEach(el => el.remove());
    exportHead.insertAdjacentHTML("afterbegin", `<title>${title}</title>`);
    const html = replaceExportAssetsInText("<!doctype html>\n" + exportRoot.outerHTML, assetMap);
    const fileName = "analisi_" + safeMatchSlug() + ".html";
    downloadBlob(new Blob([html], { type: "text/html" }), fileName);
  } finally {
    hideExportSplash();
    if (prevTab) setActiveTab(prevTab);
    if (prevAggTab) setActiveAggTab(prevAggTab);
  }
}
