import { RESULT_CODES } from "../../../js/globals.js";
import { session as matchState, blobToDataUrl, downloadBlob } from "../../../js/globals.js";
import { getSortedPlayerEntries } from "../teams/lineup-selectors.js";
import { computeMetrics } from "./metrics.js";
import { formatNameWithNumber } from "../teams/roster-data.js";
import { formatPercent } from "../../domain/counts.js";

import { openAnalysisPrintLayout, safeMatchSlug } from "../io/exports.js";
import { exportProgressStore } from "../../state/roster-import-store.mjs";
import { saveState } from "../storage/save-state.js";
import { cloneIsolationData } from "../../domain/snapshots.js";
import { getCurrentMatchPayload } from "../teams/current-payload.js";

export function buildAggregatedDataForPdf() {
  const emptyCounts = () => ({ "#": 0, "+": 0, "!": 0, "-": 0, "=": 0, "/": 0 });
  const getCounts = (idx, skillId) => {
    const base =
      (matchState.state.stats[idx] && matchState.state.stats[idx][skillId]) || {
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

export function exportAnalysisPdf() {
  const hasEvents = matchState.state.events && matchState.state.events.length > 0;
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

export function showExportSplash() {exportProgressStore.publish({open:true});}

export function hideExportSplash() {exportProgressStore.publish({open:false});}

export async function collectInlineCss() {
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

export function getExportAssetPaths() {
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

export async function fetchExportAssetAsDataUrl(assetPath) {
  if (!assetPath) return "";
  const toDataUrl =
    (blobToDataUrl);
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

export async function buildExportAssetMap() {
  const assets = getExportAssetPaths();
  const map = {};
  for (const asset of assets) {
    const dataUrl = await fetchExportAssetAsDataUrl(asset);
    if (dataUrl) map[asset] = dataUrl;
  }
  return map;
}

export function replaceExportAssetsInScript(source, assetMap) {
  if (!source || !assetMap) return source || "";
  let updated = source;
  Object.entries(assetMap).forEach(([path, dataUrl]) => {
    if (!path || !dataUrl) return;
    updated = updated.split(path).join(dataUrl);
  });
  return updated;
}

export function replaceExportAssetsInText(source, assetMap) {
  return replaceExportAssetsInScript(source, assetMap);
}

export async function exportAnalysisHtml() {
  showExportSplash();
  try {
    saveState({ persistLocal: true });
    const exportState = cloneIsolationData(matchState.state);
    const name = matchState.state.loadedMatchName || matchState.state.selectedMatch;
    if (name) {
      exportState.savedMatches[name] = getCurrentMatchPayload(name);
      exportState.selectedMatch = exportState.loadedMatchName = name;
    }
    exportState.uiActiveTab = "aggregated";
    exportState.uiAggTab = "summary";
    const [response, css, assets] = await Promise.all([
      fetch(window.__APP_ANALYSIS_RUNTIME_URL__), collectInlineCss(), buildExportAssetMap()
    ]);
    if (!response.ok) throw new Error("Impossibile caricare il report React.");
    const runtime = (await response.text()).replace(/<\/script/gi, "<\\/script");
    const data = JSON.stringify({ state: exportState, assets }).replace(/</g, "\\u003c");
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Analisi VolleyEye</title><style>${replaceExportAssetsInText(css, assets)}</style></head><body><div id="root"></div><script>const report=${data};window.__EXPORT_ANALYSIS_HTML__=true;window.__exportedAnalysisState=report.state;window.__analysisAssetMap=report.assets;<\/script><script>${runtime}<\/script></body></html>`;
    downloadBlob(new Blob([html], { type: "text/html" }), "analisi_" + safeMatchSlug() + ".html");
    window.trackVolleyEyeEventOnce?.("match_exported", { export_format: "html" });
  } finally { hideExportSplash(); }
}
