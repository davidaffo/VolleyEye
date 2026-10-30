
import { session as matchState, blobToDataUrl, downloadBlob } from "../../../js/globals.js";

import { openAnalysisPrintLayout, safeMatchSlug } from "../io/exports.js";
import { exportProgressStore } from "../../state/roster-import-store.mjs";
import { saveState } from "../storage/save-state.js";
import { cloneIsolationData } from "../../domain/snapshots.js";
import { getCurrentMatchPayload } from "../teams/current-payload.js";

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
