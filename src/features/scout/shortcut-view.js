import { formatSetTypeLabelWithShortcut } from "./skill-control-model.js";
import { setTypeShortcutsStore, floatingServeErrorStore } from "../../state/roster-import-store.mjs";
import { session as matchState } from "../../../js/globals.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { getOppositeScope, isSkillEnabledForScope } from "../teams/selectors.js";
import { getAutoFlowState, getServerPlayerForScope } from "../live/flow-model.js";

export function publishReactSetTypeShortcuts() {
  setTypeShortcutsStore.publish({
    selected: normalizeSetTypeValue(matchState.state.nextSetType) || "",
    choices: liveScoreAndSetState.DEFAULT_SET_TYPE_OPTIONS.map((option) => ({
      value: option.value,
      label: formatSetTypeLabelWithShortcut(option.value, option.label),
    })),
  });
}

export function publishReactFloatingServeError(isCompactMobile) {
  const flow =
    isCompactMobile && matchState.state.useOpponentTeam && matchState.state.predictiveSkillFlow
      ? getAutoFlowState()
      : null;
  const scope =
    flow?.skillId === "pass" ? getOppositeScope(flow.teamScope) : "";
  const server =
    scope && isSkillEnabledForScope("serve", scope)
      ? getServerPlayerForScope(scope)
      : null;
  floatingServeErrorStore.publish({
    visible: !!server?.name,
    scope,
    playerIdx: server?.idx ?? null,
    playerName: server?.name || "",
  });
}
