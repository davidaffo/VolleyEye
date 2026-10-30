import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import {
  getTeamScopeFromEvent,
  getTeamNameForScope,
} from "../teams/selectors.js";
import { syncManualEventPointDirection } from "./point-direction.js";
import { buildReactBulkControl } from "./editor-controls.js";

export function buildEventEditControl(ev, field, baseMs, videoTime) {
  let model;
  const empty = { value: "", label: "—" };
  if (field === "team")
    model = {
      type: "select",
      value: getTeamScopeFromEvent(ev),
      options: [
        { value: "our", label: matchState.state.selectedTeam || "Squadra" },
        {
          value: "opponent",
          label: matchState.state.selectedOpponentTeam || "Avversaria",
        },
      ],
      onChange: (value) => {
        const scope = value === "opponent" ? "opponent" : "our";
        ev.team = scope;
        ev.teamName = getTeamNameForScope(scope);
        ev.playerIdx = null;
        ev.playerId = null;
        ev.playerName = null;
        ev.setterIdx = null;
        ev.setterName = null;
        syncManualEventPointDirection(ev);
      },
    };
  else if (field === "errorType")
    model = {
      type: "select",
      value: ev.errorType || "",
      options: [
        empty,
        ...scoutUiState.ERROR_TYPES.map((item) => ({
          value: item.id,
          label: item.label,
        })),
      ],
      onChange: (value) => {
        ev.errorType = value || null;
      },
    };
  else if (field === "fromFreeball")
    model = {
      type: "checkbox",
      value: !!ev.fromFreeball,
      onChange: (value) => {
        ev.fromFreeball = !!value;
      },
    };
  else if (field === "relatedEvents")
    model = {
      type: "text",
      value: Array.isArray(ev.relatedEvents) ? ev.relatedEvents.join(" ") : "",
      onChange: (value) => {
        ev.relatedEvents = String(value || "")
          .split(/[\s,;]+/)
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => (/^\d+$/.test(value) ? Number(value) : value));
      },
    };
  else if (["eventId", "homeScore", "visitorScore"].includes(field))
    model = {
      type: "number",
      min: field === "eventId" ? 1 : 0,
      value: ev[field] == null ? "" : String(ev[field]),
      onChange: (value) => {
        const number = parseFloat(value);
        if (!Number.isNaN(number) && number >= (field === "eventId" ? 1 : 0))
          ev[field] = number;
      },
    };
  else model = buildReactBulkControl(ev, field, { baseMs });
  if (field === "videoTime") {
    const time = Math.max(0, Number.isFinite(videoTime) ? videoTime : 0);
    model.value = [
      String(Math.floor(time / 3600)),
      String(Math.floor((time % 3600) / 60)),
      String(Math.floor(time % 60)),
    ];
  }
  return model;
}
