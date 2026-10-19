import { publishReactMatchSheet } from "./match-sheet-view.js";

export function getMatchSheetPageEl() {
  return document.getElementById("match-sheet-page");
}

export function renderMatchSheetAnalysis() {
  const page = getMatchSheetPageEl();
  if (!page) return;

  return publishReactMatchSheet();
}
