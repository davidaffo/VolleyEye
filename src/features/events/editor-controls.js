import { getTeamScopeFromEvent, getPlayersForScope, getPlayerNumbersForScope } from "../teams/selectors.js";
import { getPlayerIdForScope } from "../teams/player-identity.js";
import { resolvePlayerIdx } from "./player-links.js";
import { computeEventVideoTime } from "../video/timing.js";
import { formatNameWithNumberFor, formatNameWithNumber } from "../teams/roster-data.js";
import { SKILLS, RESULT_CODES } from "../../../js/globals.js";
import { syncManualEventPointDirection } from "./point-direction.js";
import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { normalizePhaseValue } from "../analysis/values.js";
import { valueToString, parseInputValue } from "../../domain/value-string.js";

export function buildReactBulkControl(ev, key, context) {
  const empty = { value: "", label: "—" };
  const options = (list) => [
    empty,
    ...list.map((item) =>
      typeof item === "string"
        ? { value: item, label: item }
        : {
            value: String(item.value),
            label: item.label || String(item.value),
          },
    ),
  ];
  const select = (value, list, change) => ({
    type: "select",
    value: String(value ?? ""),
    options: list,
    onChange: change,
  });
  const simple = (field) => (value) => {
    ev[field] = value || null;
  };
  const numericFields = {
    set: [1, 5],
    rotation: [1, 6],
    zone: [1, 6],
    setterPosition: [1, 6],
    opponentSetterPosition: [1, 6],
    receivePosition: [1, 6],
  };
  if (numericFields[key]) {
    const [min, max] = numericFields[key];
    return select(
      ev[key],
      options(
        Array.from({ length: max - min + 1 }, (_, index) =>
          String(min + index),
        ),
      ),
      (value) => {
        const n = parseInt(value, 10);
        if (!isNaN(n) && n >= min && n <= max) ev[key] = n;
      },
    );
  }
  if (["player", "setter", "playerIn", "playerOut"].includes(key)) {
    const scope = getTeamScopeFromEvent(ev),
      players = getPlayersForScope(scope),
      numbers = getPlayerNumbersForScope(scope);
    const names = ["playerIn", "playerOut"].includes(key),
      setter = key === "setter";
    const index = setter
      ? typeof ev.setterIdx === "number"
        ? ev.setterIdx
        : typeof ev.setterName === "string"
          ? players.indexOf(ev.setterName)
          : -1
      : resolvePlayerIdx(ev);
    return select(
      names ? ev[key] : index >= 0 ? index : "",
      [
        empty,
        ...players.map((name, index) => ({
          value: names ? name : String(index),
          label:
            scope === "opponent" || names
              ? formatNameWithNumberFor(name, numbers)
              : formatNameWithNumber(name),
        })),
      ],
      (value) => {
        if (names) {
          ev[key] = value || null;
          return;
        }
        const index = parseInt(value, 10);
        if (!value) {
          if (setter) {
            ev.setterIdx = null;
            ev.setterName = null;
          } else {
            ev.playerIdx = null;
            ev.playerName = null;
            ev.playerId = null;
          }
          return;
        }
        if (!isNaN(index) && players[index]) {
          if (setter) {
            ev.setterIdx = index;
            ev.setterName = players[index];
          } else {
            ev.playerIdx = index;
            ev.playerName = players[index];
            ev.playerId = getPlayerIdForScope(scope, index, players[index]);
          }
        }
      },
    );
  }
  if (key === "skill")
    return select(
      ev.skillId || SKILLS[0]?.id || "",
      SKILLS.concat([{ id: "manual", label: "Manuale" }]).map((skill) => ({
        value: skill.id,
        label: skill.label,
      })),
      (value) => {
        if (value) {
          ev.skillId = value;
          if (value !== "manual") ev.pointDirection = null;
        }
      },
    );
  if (key === "code") {
    const codes =
      ev.skillId === "manual"
        ? [
            "for",
            "against",
            "error",
            "team-error",
            "opp-point",
            "opp-error",
            "freeball",
          ]
        : RESULT_CODES;
    return select(
      ev.code || codes[0],
      codes.map((code) => ({ value: code, label: code })),
      (value) => {
        ev.code = value;
        syncManualEventPointDirection(ev);
      },
    );
  }
  if (key === "base")
    return select(ev.base, options(liveScoreAndSetState.DEFAULT_BASE_OPTIONS), simple("base"));
  if (key === "setType") {
    const list = liveScoreAndSetState.DEFAULT_SET_TYPE_OPTIONS.some(
      (option) => String(option.value).toLowerCase() === "damp",
    )
      ? liveScoreAndSetState.DEFAULT_SET_TYPE_OPTIONS
      : liveScoreAndSetState.DEFAULT_SET_TYPE_OPTIONS.concat([{ value: "Damp", label: "Damp" }]);
    return select(ev.setType, options(list), simple("setType"));
  }
  if (key === "serveType")
    return select(ev.serveType, options(["F", "JF", "S"]), simple("serveType"));
  if (["receiveEvaluation", "attackEvaluation"].includes(key))
    return select(
      ev[key],
      options(
        key === "receiveEvaluation"
          ? RESULT_CODES.concat(["FB"])
          : RESULT_CODES,
      ),
      simple(key),
    );
  if (key === "attackBp")
    return select(
      normalizePhaseValue(ev.attackBp) || "bp",
      liveScoreAndSetState.DEFAULT_PHASE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label || option.value,
      })),
      (value) => {
        ev.attackBp = value === "bp";
      },
    );
  if (key === "videoTime") {
    const time = Math.max(
      0,
      ev.t
        ? computeEventVideoTime(
            ev,
            typeof context.baseMs === "number" ? context.baseMs : null,
          )
        : 0,
    );
    return {
      type: "time",
      value: [
        String(Math.floor(time / 3600)),
        String(Math.floor((time % 3600) / 60)),
        String(Math.floor(time % 60)),
      ],
      onChange: (parts) => {
        ev.videoTime = parts.reduce(
          (total, value, index) =>
            total +
            Math.max(0, parseInt(value || "0", 10) || 0) * [3600, 60, 1][index],
          0,
        );
      },
    };
  }
  if (["blockNumber", "durationMs"].includes(key))
    return {
      type: "number",
      min: 0,
      value: String(ev[key] ?? ""),
      onChange: (value) => {
        const n = parseFloat(value);
        if (Number.isFinite(n) && n >= 0) ev[key] = n;
      },
    };
  return {
    type: "text",
    value: valueToString(ev[key]),
    onChange: (value) => {
      ev[key] = parseInputValue(value);
    },
  };
}
