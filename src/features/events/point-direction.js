import { getTeamScopeFromEvent } from '../teams/selectors.js';

export function syncManualEventPointDirection(ev) {
  if (!ev || ev.skillId !== "manual") return;
  const scope = getTeamScopeFromEvent(ev);
  switch (ev.code) {
    case "for":
      ev.pointDirection = "for";
      break;
    case "against":
    case "error":
    case "team-error":
      ev.pointDirection = "against";
      break;
    case "opp-point":
      ev.pointDirection = scope === "opponent" ? "for" : "against";
      break;
    case "opp-error":
      ev.pointDirection = scope === "opponent" ? "against" : "for";
      break;
    default:
      ev.pointDirection = null;
  }
}
