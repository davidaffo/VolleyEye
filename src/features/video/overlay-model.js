import { getSelectedVideoRowForInsert } from "../events/selection-model.js";
import { SKILLS, session as matchState } from "../../../js/globals.js";
import {
  getTeamScopeFromEvent,
  getPlayerNumbersForScope,
} from "../teams/selectors.js";
export function getVideoOverlayEvent() {
  return getSelectedVideoRowForInsert()?.ev ?? null;
}

export function buildVideoOverlayLinesForEvent(ev) {
  if (!ev) return [];
  const setNum = ev.set || matchState.state.currentSet || 1;
  const homeScore =
    ev.homeScore !== undefined && ev.homeScore !== null && ev.homeScore !== ""
      ? ev.homeScore
      : "-";
  const visitorScore =
    ev.visitorScore !== undefined &&
    ev.visitorScore !== null &&
    ev.visitorScore !== ""
      ? ev.visitorScore
      : "-";
  const setLine = `Set ${setNum} · ${homeScore} - ${visitorScore}`;
  const scope = getTeamScopeFromEvent(ev);
  const numbers = getPlayerNumbersForScope(scope);
  const rawName = ev.playerName || "";
  const fullName = rawName || "—";
  const numValue = rawName && numbers ? numbers[rawName] : "";
  const playerLine = numValue ? `${numValue} - ${fullName}` : fullName;
  const skillLabel =
    (SKILLS.find((s) => s.id === ev.skillId) || {}).label || ev.skillId || "";
  const skillLine =
    [skillLabel, ev.code || ""].filter(Boolean).join(" ") || "—";
  const rotationLine = ev.rotation ? `P${ev.rotation}` : "P-";
  return [
    [setLine, playerLine, skillLine, rotationLine].filter(Boolean).join(" · "),
  ];
}
