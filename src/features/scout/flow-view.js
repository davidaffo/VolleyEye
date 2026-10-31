import { getPredictedSkillIdForScope, getNetBlockPromptScope } from "../live/flow-model.js";
import { SKILLS, session as matchState } from "../../../js/globals.js";
import { getTeamNameForScope } from "../teams/selectors.js";
import { session as teamManagementState } from "../state/live-team-management.js";

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
