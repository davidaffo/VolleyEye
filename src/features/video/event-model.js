import { session as matchState } from "../../../js/globals.js";
import { syncEventPlayerLinks } from "../events/player-links.js";

export function getVideoSkillEvents() {
  syncEventPlayerLinks(matchState.state.events || []);
  return (matchState.state.events || [])
    .map((ev, idx) => ({ ev, idx }))
    .filter((item) => item.ev && item.ev.skillId);
}

export function getVideoBaseTimeMs(eventsList) {
  const list = eventsList || getVideoSkillEvents();
  if (!list.length) return null;
  const baseMs = new Date(list[0].ev.t).getTime();
  return isNaN(baseMs) ? null : baseMs;
}
