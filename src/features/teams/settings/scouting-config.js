

import { session } from "../../state/storage-state-db.js";


import { session as matchState } from "../../../../js/globals.js";

import { updateMatchStatusUI } from "../../live/live-score-and-set.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { getSelectedArchivedMatch } from "../../storage/match-repository.js";

import { publishRuntimeView } from "../../core/runtime-view.js";
import { syncMatchSessionUI, setActiveTab } from "../../core/app-lifecycle.js";








const stateDbState = session;

















export function updateTeamButtonsState() {
  if (!matchState.elTeamsSelect) return;
  const selected = matchState.elTeamsSelect.value || "";
  updateMatchStatusUI();
  if (matchState.elBtnDeleteTeam) {
    matchState.elBtnDeleteTeam.disabled = !selected;
  }
  if (matchState.elBtnDuplicateTeam) {
    matchState.elBtnDuplicateTeam.disabled = !selected;
  }

}

export function updateOpponentTeamButtonsState() {
  if (!rosterLineupState.elOpponentTeamsSelect) return;
  const selected = rosterLineupState.elOpponentTeamsSelect.value || "";
  if (rosterLineupState.elBtnSaveOpponentTeam) {
    rosterLineupState.elBtnSaveOpponentTeam.textContent = selected ? "Sovrascrivi" : "Salva avversaria";
  }
  if (rosterLineupState.elBtnDeleteOpponentTeam) {
    rosterLineupState.elBtnDeleteOpponentTeam.disabled = !selected;
  }
  if (rosterLineupState.elBtnRenameOpponentTeam) {
    rosterLineupState.elBtnRenameOpponentTeam.disabled = !selected;
  }
}

export function updateMatchButtonsState() {
  if (!rosterLineupState.elSavedMatchesSelect && !rosterLineupState.elSavedMatchesList) return;
  const selected = getSelectedArchivedMatch();
  publishRuntimeView();

}

export function hasUsableMatch() {
  const names = Object.keys(matchState.state.savedMatches || {});
  if (names.length === 0) return false;
  const selected = (matchState.state.selectedMatch || "").trim();
  return !!selected && names.includes(selected);
}

export function applyMatchRequirementLock() {
  const hasMatches = hasUsableMatch();
  if (!hasMatches) matchState.state.uiMatchSessionActive = false;
  if (document && document.body) {
    document.body.dataset.noMatch = hasMatches ? "false" : "true";
  }
  if (rosterLineupState.tabButtons && rosterLineupState.tabButtons.forEach) {
    rosterLineupState.tabButtons.forEach(btn => {
      const target = btn && btn.dataset ? btn.dataset.tabTarget : "";
      if (!target) return;
      btn.disabled = false;
      btn.dataset.noMatchLocked = !hasMatches && !["match", "info"].includes(target) ? "true" : "false";
    });
  }
  syncMatchSessionUI();
  if (!hasMatches && typeof setActiveTab === "function" && !["match", "info"].includes(rosterLineupState.activeTab)) {
    setActiveTab("match");
  }
}












