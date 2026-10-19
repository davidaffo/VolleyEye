import { getAttackCodeFromBlockCode, getPredictedSkillIdForScope, getNetBlockPromptScope } from "./flow-model.js";
import { SKILLS } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { makePlayerKey, getTeamScopeFromEvent, getOppositeScope, getTeamNameForScope } from "../teams/selectors.js";

import { renderEventsLog } from "../video/video-events.js";
import { renderVideoAnalysis } from "../video/playback.js";

import { session as matchState } from "../../../js/globals.js";




import { resolvePlayerIdx } from "../events/player-links.js";
import { session as teamManagementState } from "../state/live-team-management.js";
import { forceNextSkill } from "./trajectories.js";

export function closeCurrentEdit({ refresh = false } = {}) {
  if (scoutUiState.currentEditControl) {
    try {
      scoutUiState.currentEditControl.blur();
    } catch (_) {
      // ignore
    }
  }
  if (scoutUiState.currentEditCell) {
    scoutUiState.currentEditCell.dataset.editing = "false";
    scoutUiState.currentEditCell = null;
    scoutUiState.currentEditControl = null;
    if (refresh) {
      renderEventsLog({ suppressScroll: true });
      renderVideoAnalysis();
    }
  }
}

export function setSelectedSkillForScope(scope, playerIdx, skillId) {
  const key = makePlayerKey(scope, playerIdx);
  if (skillId) {
    scoutUiState.selectedSkillPerPlayer[key] = skillId;
    if (skillId !== "serve") {
      delete scoutUiState.serveMetaByPlayer[key];
    }
    if (skillId === "block") {
      scoutUiState.blockConfirmByPlayer[key] = false;
      scoutUiState.blockInlinePlayer = key;
    } else {
      delete scoutUiState.blockConfirmByPlayer[key];
      if (scoutUiState.blockInlinePlayer === key) {
        scoutUiState.blockInlinePlayer = null;
      }
    }
  } else {
    delete scoutUiState.selectedSkillPerPlayer[key];
    delete scoutUiState.serveMetaByPlayer[key];
    delete scoutUiState.blockConfirmByPlayer[key];
    if (scoutUiState.blockInlinePlayer === key) {
      scoutUiState.blockInlinePlayer = null;
    }
  }
}













export function resetSetTypeState() {
  Object.keys(scoutUiState.selectedSkillPerPlayer).forEach(key => delete scoutUiState.selectedSkillPerPlayer[key]);
}





























export function updateSkillStatsForEvent(scope, playerIdx, skillId, prevCode, nextCode) {
  if (prevCode === nextCode) return;
  const bucket = scope === "our" ? matchState.state.stats : matchState.state.opponentStats;
  if (!bucket || typeof playerIdx !== "number") return;
  if (!bucket[playerIdx] || !bucket[playerIdx][skillId]) return;
  if (prevCode && bucket[playerIdx][skillId][prevCode] > 0) {
    bucket[playerIdx][skillId][prevCode] -= 1;
  }
  if (nextCode) {
    bucket[playerIdx][skillId][nextCode] = (bucket[playerIdx][skillId][nextCode] || 0) + 1;
  }
}





export function applyBlockInference(blockEvent, blockScope, blockCode) {
  if (!matchState.state.useOpponentTeam || !matchState.state.predictiveSkillFlow) return;
  if (!blockEvent || blockEvent.skillId !== "block") return;
  const attackScope = getOppositeScope(blockScope);
  const events = matchState.state.events || [];
  let attackEvent = null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (!ev || ev.skillId !== "attack") continue;
    if (getTeamScopeFromEvent(ev) !== attackScope) continue;
    if (ev.pendingBlockEval || ev.code === "/") {
      attackEvent = ev;
      break;
    }
  }
  if (!attackEvent) return null;
  if (blockCode === "/") {
    const prevCode = attackEvent.code;
    attackEvent.code = "";
    attackEvent.pendingBlockEval = false;
    attackEvent.derivedFromBlock = true;
    const attackIdx = resolvePlayerIdx(attackEvent);
    updateSkillStatsForEvent(attackScope, attackIdx, "attack", prevCode, "");
    return attackEvent;
  }
  const prevCode = attackEvent.code;
  const nextCode = getAttackCodeFromBlockCode(blockCode);
  attackEvent.code = nextCode || "";
  attackEvent.pendingBlockEval = false;
  attackEvent.derivedFromBlock = true;
  const attackIdx = resolvePlayerIdx(attackEvent);
  updateSkillStatsForEvent(attackScope, attackIdx, "attack", prevCode, attackEvent.code);
  return attackEvent;
}











export function updateNetBlockPrompt() {
  if (!teamManagementState.elBtnNetBlockPrompt || !teamManagementState.elNetActionsDefault) return;
  const scope = getNetBlockPromptScope();
  const show = !!scope;
  const netDivider = teamManagementState.elBtnNetBlockPrompt.closest(".court-net-divider");
  if (netDivider) {
    netDivider.classList.toggle("block-prompt-active", show);
  }
  teamManagementState.elBtnNetBlockPrompt.classList.toggle("hidden", !show);
  teamManagementState.elNetActionsDefault.classList.toggle("hidden", show);
  teamManagementState.elBtnNetBlockPrompt.dataset.scope = scope || "";
}

export function triggerNetBlockPrompt() {
  const scope = (teamManagementState.elBtnNetBlockPrompt && teamManagementState.elBtnNetBlockPrompt.dataset.scope) || getNetBlockPromptScope();
  if (!scope) return;
  forceNextSkill("block", scope);
}

export function updateNextSkillIndicator(skillId) {
  if (!teamManagementState.elNextSkillIndicator) return;
  updateSetTypeVisibility(skillId);
  if (!matchState.state.predictiveSkillFlow) {
    teamManagementState.elNextSkillIndicator.style.display = "none";
    teamManagementState.elNextSkillIndicator.textContent = "Prossima skill: —";
    teamManagementState.elNextSkillIndicator.classList.remove("active");
    return;
  }
  teamManagementState.elNextSkillIndicator.style.display = "";
  let scopeLabel = "";
  let resolvedSkillId = skillId;
  if (matchState.state.useOpponentTeam) {
    const ours = getPredictedSkillIdForScope("our");
    const opp = getPredictedSkillIdForScope("opponent");
    if (!resolvedSkillId) resolvedSkillId = ours || opp || null;
    if (opp && !ours) {
      scopeLabel = " (" + getTeamNameForScope("opponent") + ")";
    } else if (ours && !opp) {
      scopeLabel = " (" + getTeamNameForScope("our") + ")";
    }
  }
  const meta = SKILLS.find(s => s.id === resolvedSkillId);
  const label = meta ? meta.label : skillId || "—";
  teamManagementState.elNextSkillIndicator.textContent = "Prossima skill: " + (label || "—") + scopeLabel;
  teamManagementState.elNextSkillIndicator.classList.toggle("active", !!resolvedSkillId);
}

export function updateSetTypeVisibility(nextSkillId = null) {
  if (!teamManagementState.elSetTypeShortcuts) return;
  teamManagementState.elSetTypeShortcuts.classList.remove("set-type-inline--active");
  teamManagementState.elSetTypeShortcuts.style.display = "none";
}
