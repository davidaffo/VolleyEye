import { eventLogSummaryStore } from "../../state/event-table-store.mjs";
import { SKILLS, session as matchState } from "../../../js/globals.js";
import { getPlayerNumbersForScope, getTeamScopeFromEvent } from "../teams/selectors.js";
import { publishReactEventTable } from "./table-view.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { getVideoBaseTimeMs, getVideoSkillEvents } from "../video/event-model.js";
import { formatNameWithNumberFor } from "../teams/roster-data.js";
import { publishRuntimeView } from "../core/runtime-view.js";
import { publishReactLogServeTrajectories } from "../analysis/trajectory-view.js";
import { updateLiveDvwMirror } from "../io/datavolley-entry-view.js";
import { getErrorTypeLabel } from "../analysis/player-model.js";
import { handleSeekForSelection } from "./selection-commands.js";

export function renderEventsLog(options = {}) {
  let summaryText = "Nessun evento";
  const suppressScroll = !!options.suppressScroll;
  if (!matchState.state.events || matchState.state.events.length === 0) {
    publishReactEventTable("events-log",[],{contextKey:"log",empty:"Nessun evento ancora registrato."});
    eventLogSummaryStore.publish({ text: summaryText });
    updateLiveDvwMirror();
    return;
  }
  const recent = matchState.state.events.slice(-40).sort((a, b) => {
    const at = new Date(a.t || 0).getTime();
    const bt = new Date(b.t || 0).getTime();
    if (isFinite(at) && isFinite(bt) && at !== bt) return at - bt; // oldest first
    return (a.eventId || 0) - (b.eventId || 0);
  });
  const latest = recent[recent.length - 1];
  const getEventSkillLabel = ev => {
    if (ev.actionType === "timeout") return "Timeout";
    if (ev.actionType === "substitution") return "Cambio";
    const meta = SKILLS.find(s => s.id === ev.skillId);
    return meta ? meta.label : ev.skillId || "";
  };
  const formatEv = ev => {
    const dateObj = new Date(ev.t);
    const timeStr = isNaN(dateObj.getTime())
      ? ""
      : dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
    const errorTypeLabel =
      ev.errorType && (ev.code === "error" || ev.code === "team-error")
        ? getErrorTypeLabel(ev.errorType)
        : "";
    const scope = getTeamScopeFromEvent(ev);
    const numbers = getPlayerNumbersForScope(scope);
    const nameLabel = ev.playerName ? formatNameWithNumberFor(ev.playerName, numbers) : null;
    const leftText =
      "[S" +
      ev.set +
      "] " +
      (nameLabel || "#" + ev.playerIdx) +
      " - " +
      getEventSkillLabel(ev) +
      " " +
      ev.code +
      (errorTypeLabel ? " · " + errorTypeLabel : "");
    return { leftText, timeStr };
  };
  const latestFmt = formatEv(latest);
  summaryText = latestFmt.leftText;
  const skillEvents = getVideoSkillEvents();
  const baseMs = getVideoBaseTimeMs(skillEvents);
  publishReactEventTable("events-log", recent, {
    showSeek: false,
    showVideoTime: true,
    baseMs,
    enableSelection: true,
    contextKey: "log",
    onSelectionChange: (_rows, _ctx, opts) => handleSeekForSelection("log", opts),
  });
  if (rosterLineupState.elEventsLog && !suppressScroll) {
    requestAnimationFrame(() => {
      rosterLineupState.elEventsLog.scrollTop = rosterLineupState.elEventsLog.scrollHeight;
      rosterLineupState.elEventsLog.querySelector("tbody tr:last-child")?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    });
  }
  eventLogSummaryStore.publish({ text: summaryText });
  publishRuntimeView();
  publishReactLogServeTrajectories();
  updateLiveDvwMirror();
}
