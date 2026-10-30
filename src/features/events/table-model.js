import { getEventKey } from "../../domain/event-key.js";
import {
  getTeamScopeFromEvent,
  getPlayersForScope,
  getPlayerNumbersForScope,
} from "../teams/selectors.js";
import { resolvePlayerIdx } from "./player-links.js";
import {
  computeEventVideoTime,
  formatVideoTimestamp,
} from "../video/timing.js";
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";
import { valueToString } from "../../domain/value-string.js";
import { getErrorTypeLabel } from "../analysis/player-model.js";
import { formatAttackPhaseLabel } from "../analysis/values.js";
import { getEventTeamLabel, getEventSkillLabel } from "./display-model.js";

const formatPoint = (point) =>
  point && typeof point.x === "number" && typeof point.y === "number"
    ? `${point.x.toFixed(2)},${point.y.toFixed(2)}`
    : "";
function formatAttackDirection(ev) {
  const traj = ev.attackTrajectory || {},
    direction = ev.attackDirection || traj || null;
  if (!direction || typeof direction !== "object")
    return valueToString(direction);
  const start = formatPoint(
    direction.start || traj.start || ev.attackStart || null,
  );
  const end = formatPoint(direction.end || traj.end || ev.attackEnd || null);
  return start && end ? `${start}→${end}` : start || end || "";
}

// A column defines its header, cell value and editor field in one place.
const column = (
  field,
  label,
  options = {},
  read = ({ ev }) => valueToString(ev[field]),
) => Object.freeze({ field, label, ...options, read });
const bulkSort = (field) => ({ bulkKey: field, sortKey: field });
const COLUMNS = Object.freeze([
  column(
    "eventId",
    "ID",
    { sortKey: "eventId", visible: (options) => options.showIndex !== false },
    ({ ev }) => (ev.eventId != null ? String(ev.eventId) : ""),
  ),
  column(
    "videoTime",
    "Tempo",
    {
      ...bulkSort("videoTime"),
      classes: ["event-time-cell"],
      visible: (options) => options.showVideoTime,
    },
    ({ videoTime }) => formatVideoTimestamp(videoTime),
  ),
  column("set", "Set", bulkSort("set"), ({ ev }) => ev.set || "1"),
  column("homeScore", "Pt N", { sortKey: "homeScore" }),
  column("visitorScore", "Pt A", { sortKey: "visitorScore" }),
  column("team", "Squadra", { sortKey: "team" }, ({ ev }) =>
    getEventTeamLabel(ev),
  ),
  column(
    "player",
    "Giocatrice",
    bulkSort("player"),
    ({ name, scope, numbers }) =>
      name
        ? scope === "opponent"
          ? formatNameWithNumberFor(name, numbers)
          : formatNameWithNumber(name)
        : "—",
  ),
  column("setter", "Alzatore", bulkSort("setter"), ({ setter, numbers }) =>
    setter ? formatNameWithNumberFor(setter, numbers) : "",
  ),
  column("skill", "Fondamentale", bulkSort("skill"), ({ ev }) =>
    getEventSkillLabel(ev),
  ),
  column("code", "Codice", bulkSort("code"), ({ ev }) => ev.code || ""),
  column("relatedEvents", "Link", {}, ({ ev }) =>
    Array.isArray(ev.relatedEvents)
      ? ev.relatedEvents
          .map((id) => (id != null ? String(id) : ""))
          .filter(Boolean)
          .join(" ")
      : "",
  ),
  column("errorType", "Tipo errore", {}, ({ ev }) =>
    ev.errorType && (ev.code === "error" || ev.code === "team-error")
      ? getErrorTypeLabel(ev.errorType)
      : "",
  ),
  column("fromFreeball", "FB N", {}, ({ ev }) =>
    ev.skillId === "attack" && ev.fromFreeball ? "FB" : "",
  ),
  column(
    "zone",
    "Zona",
    bulkSort("zone"),
    ({ ev }) => ev.zone || ev.playerPosition || "",
  ),
  column(
    "setterPosition",
    "Pos Palleggio",
    bulkSort("setterPosition"),
    ({ ev }) => valueToString(ev.setterPosition || ev.rotation || ""),
  ),
  column(
    "opponentSetterPosition",
    "Pos Palleggio Avv",
    bulkSort("opponentSetterPosition"),
  ),
  column("receivePosition", "Zona Rice", bulkSort("receivePosition")),
  column("base", "Base", bulkSort("base")),
  column("setType", "Tipo Alzata", bulkSort("setType")),
  column("combination", "Combinazione", bulkSort("combination")),
  column("serveType", "Tipo Servizio", bulkSort("serveType")),
  column(
    "serveStart",
    "Servizio Start",
    { trajectory: "serve", classes: ["traj-cell"] },
    ({ ev }) => formatPoint(ev.serveStart),
  ),
  column(
    "serveEnd",
    "Servizio End",
    { trajectory: "serve", classes: ["traj-cell"] },
    ({ ev }) => formatPoint(ev.serveEnd),
  ),
  column("receiveEvaluation", "Valut Rice", bulkSort("receiveEvaluation")),
  column("attackEvaluation", "Valut Att", bulkSort("attackEvaluation")),
  column("attackBp", "Att BP", bulkSort("attackBp"), ({ ev }) =>
    formatAttackPhaseLabel(ev.attackBp),
  ),
  column("attackType", "Tipo Att", bulkSort("attackType")),
  column(
    "attackDirection",
    "Direzione Att",
    { trajectory: "attack", classes: ["traj-cell"] },
    ({ ev }) => formatAttackDirection(ev),
  ),
  column("blockNumber", "Muro N", bulkSort("blockNumber")),
  column("playerIn", "In", { bulkKey: "playerIn" }),
  column("playerOut", "Out", { bulkKey: "playerOut" }),
  column("durationMs", "Dur (ms)", bulkSort("durationMs"), ({ ev }) =>
    valueToString(ev.durationMs || ""),
  ),
]);

export function buildEventTableModel(events, options = {}) {
  const showCheckbox =
    options.enableSelection !== false && options.showCheckbox !== false;
  const columns = COLUMNS.filter(
    (column) => !column.visible || column.visible(options),
  );
  const sort = options.sortState;
  const headers = [
    ...(showCheckbox ? [{ label: "✓", checkbox: true, dir: "" }] : []),
    ...columns.map(({ label, bulkKey, sortKey }) => ({
      label,
      ...(bulkKey ? { bulkKey } : {}),
      ...(sortKey ? { sortKey } : {}),
      checkbox: false,
      dir: sort && sort.key === sortKey ? sort.dir : "",
    })),
    { label: "Elimina", checkbox: false, dir: "" },
  ];
  const rows = events.map((ev, index) => {
    const videoTime = options.showVideoTime
      ? computeEventVideoTime(ev, options.baseMs || null)
      : null;
    const scope = getTeamScopeFromEvent(ev),
      players = getPlayersForScope(scope),
      numbers = getPlayerNumbersForScope(scope);
    const data = {
      ev,
      videoTime,
      scope,
      numbers,
      name: ev.playerName || players[resolvePlayerIdx(ev)],
      setter:
        ev.setterName ||
        (typeof ev.setterIdx === "number" ? players[ev.setterIdx] : ""),
    };
    const cells = columns.map(({ field, read, classes = [], trajectory }) => {
      const value = read(data);
      return Object.freeze({
        field,
        text: value != null ? String(value) : "",
        classes,
        ...(trajectory ? { trajectory } : {}),
      });
    });
    return Object.freeze({
      key: getEventKey(ev, index),
      ev,
      videoTime,
      cells: Object.freeze(cells),
    });
  });
  return {
    showCheckbox,
    headers: Object.freeze(headers.map(Object.freeze)),
    rows: Object.freeze(rows),
  };
}
