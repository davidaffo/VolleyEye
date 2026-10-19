import { session as matchState } from '../../../js/globals.js';
import { getTeamScopeFromEvent } from '../teams/selectors.js';
export function getTimeoutCountForSet(setNum) {
  const set = Number(setNum) || 1;
  return (matchState.state.events || []).filter(
    ev => ev && ev.actionType === "timeout" && (parseInt(ev.set, 10) || 1) === set && ev.code !== "TOA"
  ).length;
}

export function getTimeoutOppCountForSet(setNum) {
  const set = Number(setNum) || 1;
  return (matchState.state.events || []).filter(
    ev => ev && ev.actionType === "timeout" && (parseInt(ev.set, 10) || 1) === set && ev.code === "TOA"
  ).length;
}

export function getSubstitutionCountForSet(setNum, scope = "our") {
  const set = Number(setNum) || 1;
  return (matchState.state.events || []).filter(
    ev =>
      ev &&
      ev.actionType === "substitution" &&
      (parseInt(ev.set, 10) || 1) === set &&
      getTeamScopeFromEvent(ev) === scope
  ).length;
}
