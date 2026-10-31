import { getAttackCodeFromBlockCode } from "../live/flow-model.js";
import { getTeamScopeFromEvent, getOppositeScope } from "../teams/selectors.js";
import { session as matchState } from "../../../js/globals.js";
import { resolvePlayerIdx } from "./player-links.js";

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
    if (!ev || Number(ev.set || 1) !== Number(matchState.state.currentSet || 1) || ev.skillId !== "attack") continue;
    if (getTeamScopeFromEvent(ev) !== attackScope) continue;
    if (ev.pendingBlockEval || ev.code === "/") {
      attackEvent = ev;
      break;
    }
  }
  if (!attackEvent) return null;
  const undo = blockEvent.undoState;
  const keys = ["code", "pendingBlockEval", "derivedFromBlock"];
  const patch = { eventId: attackEvent.eventId, before: {}, after: {} };
  keys.forEach(key => { patch.before[key] = attackEvent[key] ?? null; });
  const finish = () => {
    keys.forEach(key => { patch.after[key] = attackEvent[key]; });
    if (undo) (undo.eventPatches || (undo.eventPatches = [])).push(patch);
    return attackEvent;
  };
  if (blockCode === "/") {
    const prevCode = attackEvent.code;
    attackEvent.code = "";
    attackEvent.pendingBlockEval = false;
    attackEvent.derivedFromBlock = true;
    const attackIdx = resolvePlayerIdx(attackEvent);
    updateSkillStatsForEvent(attackScope, attackIdx, "attack", prevCode, "");
    return finish();
  }
  const prevCode = attackEvent.code;
  const nextCode = getAttackCodeFromBlockCode(blockCode);
  attackEvent.code = nextCode || "";
  attackEvent.pendingBlockEval = false;
  attackEvent.derivedFromBlock = true;
  const attackIdx = resolvePlayerIdx(attackEvent);
  updateSkillStatsForEvent(attackScope, attackIdx, "attack", prevCode, attackEvent.code);
  return finish();
}
