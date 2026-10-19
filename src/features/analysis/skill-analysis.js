import { deferSkillChartRenderWhilePaused } from "./skill-chart-model.js";
import { session } from "../state/analysis-skill-analysis.js";

import { session as matchState } from "../../../js/globals.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";

import { getPlayerAnalysisPlayerIdx } from "./player-model.js";
import {
  publishReactGlobalSkillCharts,
  publishReactPlayerSkillCharts,
} from "./charts-view.js";

const skillAnalysisState = session;

export function isAggSubtabVisible(tabId) {
  const currentTopTab =
    typeof rosterLineupState.activeTab !== "undefined"
      ? rosterLineupState.activeTab
      : (document &&
          document.body &&
          document.body.dataset &&
          document.body.dataset.activeTab) ||
        "";
  return (
    currentTopTab === "aggregated" && rosterLineupState.activeAggTab === tabId
  );
}

export function inlineComputedDomStyles(sourceNode, targetNode) {
  if (!(sourceNode instanceof Element) || !(targetNode instanceof Element))
    return;
  const cs = window.getComputedStyle(sourceNode);
  for (let i = 0; i < cs.length; i += 1) {
    const prop = cs[i];
    const value = cs.getPropertyValue(prop);
    if (value) targetNode.style.setProperty(prop, value);
  }
  const sourceChildren = Array.from(sourceNode.children || []);
  const targetChildren = Array.from(targetNode.children || []);
  for (
    let i = 0;
    i < Math.min(sourceChildren.length, targetChildren.length);
    i += 1
  ) {
    inlineComputedDomStyles(sourceChildren[i], targetChildren[i]);
  }
}

export async function copySkillChartImageToClipboard(
  cardEl,
  label = "Grafico",
) {
  if (!cardEl) {
    alert("Card grafico non trovata.");
    return;
  }
  if (
    !navigator.clipboard ||
    !window.ClipboardItem ||
    !navigator.clipboard.write
  ) {
    alert("Copia immagine negli appunti non supportata su questo dispositivo.");
    return;
  }
  const writeBlobToClipboard = async (pngBlob) => {
    if (!pngBlob) throw new Error("blob");
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngBlob }),
    ]);
  };
  const renderSvgToPngBlob = async ({
    svgMarkup,
    width,
    height,
    bgFill = null,
  } = {}) => {
    const svgBlob = new Blob([svgMarkup], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = svgUrl;
      });
      const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (bgFill) {
        ctx.fillStyle = bgFill;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      const pngBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!pngBlob) throw new Error("blob");
      return pngBlob;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };
  try {
    const cardRect = cardEl.getBoundingClientRect();
    const width = Math.max(
      1,
      Math.round(cardRect.width || cardEl.clientWidth || 420),
    );
    const height = Math.max(
      1,
      Math.round(cardRect.height || cardEl.clientHeight || 420),
    );
    const clonedCard = cardEl.cloneNode(true);
    clonedCard
      .querySelectorAll(
        ".skill-chart-hover-line, .skill-chart-tooltip, .skill-chart-copy-btn",
      )
      .forEach((el) => el.remove());
    clonedCard.style.margin = "0";
    clonedCard.style.width = `${width}px`;
    clonedCard.style.height = `${height}px`;
    clonedCard.style.boxSizing = "border-box";
    inlineComputedDomStyles(cardEl, clonedCard);
    const xhtmlWrap = document.createElement("div");
    xhtmlWrap.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    xhtmlWrap.style.width = `${width}px`;
    xhtmlWrap.style.height = `${height}px`;
    xhtmlWrap.style.margin = "0";
    xhtmlWrap.style.padding = "0";
    xhtmlWrap.appendChild(clonedCard);
    const serializer = new XMLSerializer();
    const foreignObjectMarkup = serializer.serializeToString(xhtmlWrap);
    const svgMarkup = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject x="0" y="0" width="${width}" height="${height}">${foreignObjectMarkup}</foreignObject>
      </svg>
    `;
    const cardCs = window.getComputedStyle(cardEl);
    const cardBg =
      cardCs.backgroundColor && cardCs.backgroundColor !== "rgba(0, 0, 0, 0)"
        ? cardCs.backgroundColor
        : "#0c121e";
    const pngBlob = await renderSvgToPngBlob({
      svgMarkup,
      width,
      height,
      bgFill: cardBg,
    });
    await writeBlobToClipboard(pngBlob);
    alert(`${label} copiato negli appunti.`);
  } catch (_err) {
    try {
      const svgWrap = cardEl.querySelector(".skill-chart-card__plot");
      const svg =
        svgWrap && svgWrap.querySelector
          ? svgWrap.querySelector(".skill-chart-svg")
          : null;
      if (!svg || !svgWrap) throw new Error("plot-missing");
      const clonedSvg = svg.cloneNode(true);
      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      inlineComputedDomStyles(svg, clonedSvg);
      const serializer = new XMLSerializer();
      const plotSvgMarkup = serializer.serializeToString(clonedSvg);
      const width = Math.max(1, Math.round(svgWrap.clientWidth || 420));
      const height = Math.max(1, Math.round(svgWrap.clientHeight || 320));
      const plotBlob = await renderSvgToPngBlob({
        svgMarkup: plotSvgMarkup,
        width,
        height,
        bgFill: "#0c121e",
      });
      await writeBlobToClipboard(plotBlob);
      alert(
        `${label} copiato negli appunti (solo grafico: il browser ha bloccato titolo/legenda).`,
      );
    } catch (_err2) {
      alert(
        "Impossibile copiare immagine (browser/clipboard limita questa funzione).",
      );
    }
  }
}

export function renderAnalysisSkillChartsPanel() {
  if (!matchState.elAnalysisSkillChartGrid) return;
  if (!isAggSubtabVisible("skill-charts")) return;
  if (deferSkillChartRenderWhilePaused()) return;

  publishReactGlobalSkillCharts();
  return;
}

export function renderPlayerAnalysisSkillCharts() {
  if (!matchState.elPlayerAnalysisSkillChartGrid) return;
  if (!isAggSubtabVisible("player")) return;
  if (deferSkillChartRenderWhilePaused()) return;

  publishReactPlayerSkillCharts(getPlayerAnalysisPlayerIdx());
  return;
}
