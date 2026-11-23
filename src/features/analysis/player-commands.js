import {
  ensurePlayerAnalysisState,
  getPlayerAnalysisCompareIdx,
} from "./player-model.js";
import { saveState } from "../storage/save-state.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
import { getAnalysisTeamScope } from "./filter-model.js";
export function changeReactPlayerAnalysis(field, value) {
  const prefs = ensurePlayerAnalysisState();
  if (field === "playerIdx" || field === "comparePlayerIdx") {
    const parts = String(value).split(':');
    const index = parseInt(parts.length === 2 ? parts[1] : value, 10);
    if (field === "comparePlayerIdx") prefs.comparePlayerScope = parts.length === 2 && ['our', 'opponent'].includes(parts[0]) ? parts[0] : getAnalysisTeamScope();
    prefs[field] = isNaN(index) ? null : index;
    if (
      field === "playerIdx" &&
      prefs.compareEnabled &&
      (prefs.comparePlayerScope || getAnalysisTeamScope()) === getAnalysisTeamScope() &&
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
