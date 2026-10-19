import { clamp01Val } from "./values.js";
import { session as matchState } from "../../../js/globals.js";
import {
  getAnalysisEvents,
  matchesSummarySetFilter,
  getAnalysisExtraMatchState,
  findEventById,
} from "./filter-model.js";
import { session as trajectoryRenderingState } from "../state/analysis-trajectory-rendering.js";
import {
  getServeStartZone,
  getTrajectoryColorForCode,
  resolvePlayerIdxFromNameForScope,
} from "./trajectory-model.js";
import { formatStructuredPlayerName } from "../teams/roster-data.js";
import {
  getPlayersForScope,
  getPlayerNumbersForScope,
  getLiberosForScope,
  getTeamScopeFromEvent,
  getOppositeScope,
} from "../teams/selectors.js";
import { getSetStartEntryForScope } from "./player-model.js";
import { getDefaultSetStartForScope } from "../teams/set-start-model.js";
import { getCourtShape } from "../teams/court-model.js";
import { getRoleLabelForRotation } from "../teams/roles.js";
export function ensureMatchSheetNotesState() {
  if (
    !matchState.state.uiMatchSheetNotes ||
    typeof matchState.state.uiMatchSheetNotes !== "object"
  ) {
    matchState.state.uiMatchSheetNotes = {
      individual: "",
      defense: "",
      sideout: "",
    };
  }
  return matchState.state.uiMatchSheetNotes;
}

export function ensureMatchSheetFiltersState() {
  if (
    !matchState.state.uiMatchSheetFilters ||
    typeof matchState.state.uiMatchSheetFilters !== "object"
  ) {
    matchState.state.uiMatchSheetFilters = {};
  }
  if (
    typeof matchState.state.uiMatchSheetFilters.includeAttackErrors !==
    "boolean"
  ) {
    matchState.state.uiMatchSheetFilters.includeAttackErrors = false;
  }
  return matchState.state.uiMatchSheetFilters;
}

export function isMatchSheetAttackError(ev) {
  if (!ev || ev.skillId !== "attack") return false;
  return String(ev.code || ev.evaluation || "").trim() === "=";
}

export function matchesMatchSheetAttackFilters(ev) {
  if (!ev || ev.skillId !== "attack") return true;
  const filters = ensureMatchSheetFiltersState();
  return filters.includeAttackErrors || !isMatchSheetAttackError(ev);
}

export function getMatchSheetPoint(point, fallbackZone = null, side = "full") {
  if (point && typeof point.x === "number" && typeof point.y === "number") {
    return {
      x: clamp01Val(point.x) * 100,
      y:
        clamp01Val(point.y) * trajectoryRenderingState.MATCH_SHEET_COURT_HEIGHT,
    };
  }
  const zone = parseInt(fallbackZone, 10);
  if (side === "far")
    return trajectoryRenderingState.MATCH_SHEET_FAR_COURT_ZONES[zone] || null;
  if (side === "near")
    return trajectoryRenderingState.MATCH_SHEET_NEAR_COURT_ZONES[zone] || null;
  const base = trajectoryRenderingState.MATCH_SHEET_COURT_ZONES[zone];
  return base
    ? {
        x: base.x,
        y: (base.y / 60) * trajectoryRenderingState.MATCH_SHEET_COURT_HEIGHT,
      }
    : null;
}

export function getMatchSheetNumericZone(...values) {
  for (let i = 0; i < values.length; i += 1) {
    const zone = parseInt(values[i], 10);
    if (zone >= 1 && zone <= 6) return zone;
  }
  return null;
}

export function getMatchSheetAttackStartZone(ev) {
  if (!ev) return null;
  const traj = ev.attackDirection || ev.attackTrajectory || {};
  return getMatchSheetNumericZone(
    ev.attackStartZone,
    traj.startZone,
    ev.dv && ev.dv.startZone,
    ev.originZone,
    ev.zone,
    ev.playerPosition,
  );
}

export function getMatchSheetAttackEndZone(ev) {
  if (!ev) return null;
  const traj = ev.attackDirection || ev.attackTrajectory || {};
  return getMatchSheetNumericZone(
    ev.attackEndZone,
    traj.endZone,
    ev.dv && ev.dv.endZone,
    ev.targetZone,
    ev.endZone,
  );
}

export function orientMatchSheetFromOpposite(traj) {
  if (!traj || !traj.start || !traj.end) return traj;
  const next = {
    start: Object.assign({}, traj.start),
    end: Object.assign({}, traj.end),
    code: traj.code || "",
    count: traj.count || 1,
  };
  const startsFromOurSide =
    next.start.y > next.end.y ||
    next.start.y > trajectoryRenderingState.MATCH_SHEET_COURT_HEIGHT / 2;
  if (startsFromOurSide) {
    next.start.x = 100 - next.start.x;
    next.end.x = 100 - next.end.x;
    next.start.y =
      trajectoryRenderingState.MATCH_SHEET_COURT_HEIGHT - next.start.y;
    next.end.y = trajectoryRenderingState.MATCH_SHEET_COURT_HEIGHT - next.end.y;
  }
  return next;
}

export function getMatchSheetAttackTrajectory(ev) {
  if (!ev) return null;
  const traj = ev.attackDirection || ev.attackTrajectory || {};
  const startZone = getMatchSheetAttackStartZone(ev);
  const endZone = getMatchSheetAttackEndZone(ev);
  const start = getMatchSheetPoint(
    traj.start || ev.attackStart,
    startZone,
    "far",
  );
  const end = getMatchSheetPoint(traj.end || ev.attackEnd, endZone, "near");
  if (!start || !end) return null;
  return orientMatchSheetFromOpposite({
    start,
    end,
    code: ev.code || ev.evaluation || "",
    count: 1,
  });
}

export function getMatchSheetSideoutStartPoint(zone) {
  const xByZone = { 1: 18, 2: 18, 3: 50, 4: 82, 5: 82, 6: 50 };
  if (!xByZone[zone]) return null;
  const isFrontRow = zone === 2 || zone === 3 || zone === 4;
  return {
    x: xByZone[zone],
    y: isFrontRow ? 90 : 60,
  };
}

export function getMatchSheetSideoutTrajectory(ev) {
  if (!ev) return null;
  const startZone = getMatchSheetAttackStartZone(ev);
  const start = getMatchSheetSideoutStartPoint(startZone);
  // Attack coordinates refer to the destination court image, not a full two-sided court.
  const trajectory = ev.attackDirection || ev.attackTrajectory || {};
  const rawEnd = trajectory.end || ev.attackEnd;
  const end =
    rawEnd && Number.isFinite(rawEnd.x) && Number.isFinite(rawEnd.y)
      ? {
          x: (1 - clamp01Val(rawEnd.x)) * 100,
          y: 100 + (1 - clamp01Val(rawEnd.y)) * 100,
        }
      : getMatchSheetPoint(null, getMatchSheetAttackEndZone(ev), "near");
  if (!start || !end) return null;
  return { start, end, code: ev.code || ev.evaluation || "", count: 1 };
}

export function getMatchSheetServeTrajectory(ev) {
  if (!ev) return null;
  const startRaw =
    ev.serveStart &&
    typeof ev.serveStart.x === "number" &&
    typeof ev.serveStart.y === "number"
      ? ev.serveStart
      : null;
  const endRaw =
    ev.serveEnd &&
    typeof ev.serveEnd.x === "number" &&
    typeof ev.serveEnd.y === "number"
      ? ev.serveEnd
      : null;
  const start = startRaw
    ? {
        x: (1 - clamp01Val(startRaw.x)) * 100,
        y: (1 - clamp01Val(startRaw.y)) * 80 + 4,
      }
    : getMatchSheetPoint(null, getServeStartZone(ev), "far");
  const end = endRaw
    ? {
        x: (1 - clamp01Val(endRaw.x)) * 100,
        y: (1 - clamp01Val(endRaw.y)) * 80 + 116,
      }
    : null;
  if (!start || !end) return null;
  return { start, end, code: ev.code || ev.evaluation || "", count: 1 };
}

export function getMatchSheetEventColor(code, variant = "attack") {
  return getTrajectoryColorForCode(code, variant);
}

export function abbreviateMatchSheetName(name = "") {
  const raw = String(name || "").trim();
  if (!raw) return "";
  return formatStructuredPlayerName(raw);
}

export function getMatchSheetDefenseArrow(zone) {
  const target = trajectoryRenderingState.MATCH_SHEET_FAR_COURT_ZONES[zone] || {
    x: 50,
    y: 76,
  };
  const starts = {
    4: { x: Math.max(4, target.x - 22), y: -18 },
    2: { x: Math.min(96, target.x + 22), y: -18 },
    3: { x: target.x, y: -18 },
    6: { x: target.x, y: -18 },
    1: { x: Math.min(96, target.x + 18), y: -18 },
  };
  return {
    start: starts[zone] || { x: 50, y: -18 },
    end: { x: target.x, y: -3 },
  };
}

export function getMatchSheetPlayers(scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const liberos = new Set(getLiberosForScope(scope));
  const start = getSetStartEntryForScope(1, scope) ||
    getDefaultSetStartForScope(scope) || { court: [], rotation: 1 };
  const rotation = typeof start.rotation === "number" ? start.rotation : 1;
  const starters = getCourtShape(start.court || [])
    .map((slot, idx) => {
      const name =
        slot && (slot.main || slot.replaced) ? slot.main || slot.replaced : "";
      const role = String(getRoleLabelForRotation(idx + 1, rotation));
      return { name, role, pos: idx + 1, starter: true };
    })
    .filter((item) => item.name && !liberos.has(item.name));
  starters.sort((a, b) => {
    const ai = trajectoryRenderingState.MATCH_SHEET_ROLE_ORDER.indexOf(a.role);
    const bi = trajectoryRenderingState.MATCH_SHEET_ROLE_ORDER.indexOf(b.role);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const seen = new Set(starters.map((item) => item.name));
  const bench = (players || [])
    .filter((name) => name && !seen.has(name) && !liberos.has(name))
    .map((name) => ({ name, role: "", pos: null, starter: false }))
    .sort((a, b) => {
      const an = parseInt(numbers[a.name], 10);
      const bn = parseInt(numbers[b.name], 10);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return String(a.name).localeCompare(String(b.name), "it", {
        sensitivity: "base",
      });
    });
  return starters.concat(bench).map((item, idx) => ({
    name: item.name,
    number: numbers[item.name] || "",
    role: item.role || (liberos.has(item.name) ? "L" : ""),
    pos: item.pos,
    starter: item.starter,
    idx: players.indexOf(item.name),
    order: idx + 1,
  }));
}

export function getMatchSheetEvents(scope) {
  return getAnalysisEvents()
    .filter((ev) => ev && getTeamScopeFromEvent(ev) === scope)
    .filter((ev) => matchesSummarySetFilter(ev));
}

export function groupMatchSheetTrajectoriesByPlayer(scope, skillId) {
  const grouped = {};
  getMatchSheetEvents(scope)
    .filter((ev) => ev && ev.skillId === skillId)
    .filter(matchesMatchSheetAttackFilters)
    .forEach((ev) => {
      const idx =
        typeof ev.playerIdx === "number"
          ? ev.playerIdx
          : resolvePlayerIdxFromNameForScope(ev.playerName, scope);
      if (idx < 0) return;
      const traj =
        skillId === "serve"
          ? getMatchSheetServeTrajectory(ev)
          : getMatchSheetAttackTrajectory(ev);
      if (!traj) return;
      if (!grouped[idx]) grouped[idx] = [];
      grouped[idx].push(traj);
    });
  return grouped;
}

export function isMatchSheetSideoutAttack(ev) {
  if (!ev || ev.skillId !== "attack") return false;
  if (!matchesMatchSheetAttackFilters(ev)) return false;
  if (ev.attackBp === false || String(ev.attackBp).toLowerCase() === "false")
    return true;
  if (String(ev.phase || ev.attackPhase || "").toLowerCase() === "sideout")
    return true;
  if (ev.receiveEvaluation) return true;
  return false;
}

export function inferMatchSheetSideoutRotation(ev) {
  if (!ev) return "extra";
  const candidates = [ev.receiveRotation, ev.sideoutRotation, ev.rotation];
  for (let i = 0; i < candidates.length; i += 1) {
    const rot = parseInt(candidates[i], 10);
    if (rot >= 1 && rot <= 6) return rot;
  }
  return "extra";
}

export function getMatchSheetSideoutGroups(scope) {
  const groups = {};
  trajectoryRenderingState.MATCH_SHEET_ROTATION_ORDER.forEach((rot) => {
    groups[rot] = [];
  });
  getMatchSheetSideoutEvents(scope)
    .filter(isMatchSheetSideoutAttack)
    .forEach((ev) => {
      const key = inferMatchSheetSideoutRotation(ev);
      const traj = getMatchSheetSideoutTrajectory(ev);
      if (!traj) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(traj);
    });
  return groups;
}

export function getMatchSheetSideoutEvents(scope) {
  const filters = ensureMatchSheetFiltersState();
  const sets = filters.sideoutSets || [];
  const players = (filters.sideoutPlayers || {})[scope] || [];
  return getMatchSheetEvents(scope).filter((ev) => {
    const idx =
      typeof ev.playerIdx === "number"
        ? ev.playerIdx
        : resolvePlayerIdxFromNameForScope(ev.playerName, scope);
    return (
      (!sets.length || sets.includes(String(ev.set))) &&
      (!players.length || players.includes(String(idx)))
    );
  });
}

export function getMatchSheetLatestPlayerNumbers(scope) {
  const sources = [matchState.state];
  const extras = getAnalysisExtraMatchState();
  for (const key of extras[scope] || []) {
    const source =
      matchState.state.savedMatches && matchState.state.savedMatches[key];
    if (source && source.state) sources.push(source.state);
  }
  sources.sort((a, b) =>
    String(a.match?.date || "").localeCompare(String(b.match?.date || "")),
  );
  const numbers = new Map();
  for (const source of sources) {
    const rosterNumbers =
      scope === "opponent"
        ? source.opponentPlayerNumbers
        : source.playerNumbers;
    for (const [name, number] of Object.entries(rosterNumbers || {})) {
      if (number !== "" && number != null)
        numbers.set(name.trim().toLocaleLowerCase(), String(number));
    }
  }
  return numbers;
}

export function getMatchSheetLineupPlayersForEvents(scope, rotation) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const latestNumbers = getMatchSheetLatestPlayerNumbers(scope);
  const groups = new Map();
  getMatchSheetSideoutEvents(scope)
    .filter(isMatchSheetSideoutAttack)
    .forEach((ev) => {
      if (inferMatchSheetSideoutRotation(ev) !== rotation) return;
      const pos = getMatchSheetAttackStartZone(ev);
      if (!pos || !getMatchSheetSideoutTrajectory(ev)) return;
      const idx =
        typeof ev.playerIdx === "number"
          ? ev.playerIdx
          : resolvePlayerIdxFromNameForScope(ev.playerName, scope);
      const name =
        players[idx] || ev.playerName || "Giocatrice non identificata";
      const formation = getSetStartEntryForScope(ev.set, scope);
      const court = formation ? getCourtShape(formation.court || []) : [];
      const position = court.findIndex(
        (slot) => slot && (slot.main === name || slot.replaced === name),
      );
      const role =
        position >= 0
          ? String(
              getRoleLabelForRotation(position + 1, formation.rotation || 1),
            )
          : "";
      const key = `${pos}:${idx}:${name}:${role}`;
      if (!groups.has(key))
        groups.set(key, {
          pos,
          role,
          name,
          number:
            latestNumbers.get(name.trim().toLocaleLowerCase()) ??
            numbers[name] ??
            ev.playerNumberAtEvent ??
            "",
          count: 0,
          events: [],
        });
      const group = groups.get(key);
      group.count += 1;
      group.events.push(ev);
    });
  const result = Array.from(groups.values()).sort(
    (a, b) =>
      a.pos - b.pos || b.count - a.count || a.name.localeCompare(b.name),
  );
  result.forEach((group) => {
    const peers = result.filter((item) => item.pos === group.pos);
    const offset =
      peers.length > 1
        ? -10 + (20 * peers.indexOf(group)) / (peers.length - 1)
        : 0;
    const start = getMatchSheetSideoutStartPoint(group.pos);
    group.point = { x: start.x + offset, y: start.y };
    group.label = group.number !== "" ? String(group.number) : "—";
    group.description = `Zona ${group.pos} · ${group.role ? group.role + " · " : ""}${group.number ? "#" + group.number + " " : ""}${group.name} · ${group.count} attacchi`;
  });
  return result;
}

export function getMatchSheetRelatedAttack(ev) {
  if (!ev) return null;
  const links = Array.isArray(ev.relatedLinks) ? ev.relatedLinks : [];
  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    if (!link || link.type !== "attack-defense") continue;
    const related = findEventById(link.eventId);
    if (related && related.skillId === "attack") return related;
  }
  if (Array.isArray(ev.relatedEvents)) {
    for (let i = 0; i < ev.relatedEvents.length; i += 1) {
      const related = findEventById(ev.relatedEvents[i]);
      if (related && related.skillId === "attack") return related;
    }
  }
  return null;
}

export function getMatchSheetDefenseGroups(scope) {
  const groups = {};
  trajectoryRenderingState.MATCH_SHEET_DEFENSE_ZONES.forEach((zone) => {
    groups[zone] = [];
  });
  let linkedCount = 0;
  getMatchSheetEvents(scope)
    .filter((ev) => ev && ev.skillId === "defense")
    .forEach((ev) => {
      const attack = getMatchSheetRelatedAttack(ev);
      if (!attack) return;
      if (!matchesMatchSheetAttackFilters(attack)) return;
      const traj = getMatchSheetAttackTrajectory(attack);
      if (!traj) return;
      traj.code = ev.code || attack.code || "";
      const zone = getMatchSheetAttackStartZone(attack);
      if (!trajectoryRenderingState.MATCH_SHEET_DEFENSE_ZONES.includes(zone))
        return;
      if (!groups[zone]) groups[zone] = [];
      groups[zone].push(traj);
      linkedCount += 1;
    });
  if (linkedCount === 0) {
    const opponentScope = getOppositeScope(scope);
    getMatchSheetEvents(opponentScope)
      .filter((ev) => ev && ev.skillId === "attack")
      .filter(matchesMatchSheetAttackFilters)
      .forEach((ev) => {
        const traj = getMatchSheetAttackTrajectory(ev);
        if (!traj) return;
        const zone = getMatchSheetAttackStartZone(ev);
        if (!trajectoryRenderingState.MATCH_SHEET_DEFENSE_ZONES.includes(zone))
          return;
        if (!groups[zone]) groups[zone] = [];
        groups[zone].push(traj);
      });
  }
  return groups;
}

export function buildReactMatchSheetCourt(trajectories = [], options = {}) {
  const full = !!options.fullCourt,
    height = full ? trajectoryRenderingState.MATCH_SHEET_COURT_HEIGHT : 100,
    top = options.sourceZone ? -24 : 0,
    scale = (y) => (full ? Number(y) || 0 : (Number(y) || 0) / 2);
  const arrow = (start, end, color) => {
    const dx = end.x - start.x,
      dy = end.y - start.y,
      length = Math.hypot(dx, dy);
    if (!length) return null;
    const ux = dx / length,
      uy = dy / length,
      depth = Math.min(5, length),
      bx = end.x - ux * depth,
      by = end.y - uy * depth,
      half = depth * 0.45;
    return {
      points: `${end.x},${end.y} ${bx - uy * half},${by + ux * half} ${bx + uy * half},${by - ux * half}`,
      color,
    };
  };
  const lines = (full ? trajectories : trajectories.slice(0, 28)).map(
    (item, index) => {
      const color = getMatchSheetEventColor(
          item.code,
          options.variant || "attack",
        ),
        start = { x: item.start.x, y: scale(item.start.y) },
        end = { x: item.end.x, y: scale(item.end.y) };
      return {
        x1: start.x.toFixed(1),
        y1: start.y.toFixed(1),
        x2: end.x.toFixed(1),
        y2: end.y.toFixed(1),
        color,
        opacity: Math.max(0.28, 0.78 - index * 0.012),
        arrow: arrow(start, end, color),
      };
    },
  );
  const rawSource = options.sourceZone
      ? getMatchSheetDefenseArrow(parseInt(options.sourceZone, 10))
      : null,
    source = rawSource
      ? {
          start: { x: rawSource.start.x, y: scale(rawSource.start.y) },
          end: { x: rawSource.end.x, y: scale(rawSource.end.y) },
        }
      : null;
  if (source) source.arrow = arrow(source.start, source.end, "#111827");
  const players = (options.players || []).flatMap((slot) => {
    const zone =
      slot.point ||
      (options.playersSide === "far"
        ? trajectoryRenderingState.MATCH_SHEET_FAR_COURT_ZONES[slot.pos]
        : options.playersSide === "near"
          ? trajectoryRenderingState.MATCH_SHEET_NEAR_COURT_ZONES[slot.pos]
          : getMatchSheetPoint(null, slot.pos, "full"));
    return zone && slot.label
      ? [
          {
            x: zone.x,
            y: scale(zone.y),
            label: slot.label,
            role: slot.role || "",
          },
        ]
      : [];
  });
  return {
    full,
    height,
    top,
    viewHeight: height - top,
    title: options.title || "",
    className: options.className || "",
    noteKey: options.noteKey || "",
    lines,
    source,
    players,
  };
}
