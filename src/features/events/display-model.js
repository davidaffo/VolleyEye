import { SKILLS, session as matchState } from "../../../js/globals.js";
export function getEventTeamLabel(ev) {
  if (ev.team === "opponent")
    return matchState.state.selectedOpponentTeam || "Avversaria";
  if (ev.team && ev.team !== "opponent")
    return ev.teamName || matchState.state.selectedTeam || "Squadra";
  if (
    ev.code === "opp-error" ||
    ev.code === "opp-point" ||
    ev.playerName === "Avversari"
  )
    return matchState.state.selectedOpponentTeam || "Avversaria";
  return matchState.state.selectedTeam || "Squadra";
}
export function getEventSkillLabel(ev) {
  return ev.actionType === "timeout"
    ? "Timeout"
    : ev.actionType === "substitution"
      ? "Cambio"
      : (SKILLS.find((skill) => skill.id === ev.skillId) || {}).label ||
        ev.skillId ||
        "";
}
