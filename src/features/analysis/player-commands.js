import {
  ensurePlayerAnalysisState,
  getPlayerAnalysisCompareIdx,
} from "./player-model.js";
import { saveState } from "../storage/save-state.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
export function changeReactPlayerAnalysis(field, value) {
  const prefs = ensurePlayerAnalysisState();
  if (field === "playerIdx" || field === "comparePlayerIdx") {
    const index = parseInt(value, 10);
    prefs[field] = isNaN(index) ? null : index;
    if (
      field === "playerIdx" &&
      prefs.compareEnabled &&
      prefs.comparePlayerIdx === prefs.playerIdx
    )
      prefs.comparePlayerIdx = null;
  } else if (field === "compareEnabled") {
    prefs.compareEnabled = !!value;
    if (prefs.compareEnabled) getPlayerAnalysisCompareIdx();
    else prefs.comparePlayerIdx = null;
  } else if (["showAttack", "showServe", "showSecond"].includes(field))
    prefs[field] = !!value;
  saveState();
  renderPlayerAnalysis();
}
