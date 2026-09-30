function getMatchSheetPageEl() {
  return document.getElementById("match-sheet-page");
}
function ensureMatchSheetNotesState() {
  if (!state.uiMatchSheetNotes || typeof state.uiMatchSheetNotes !== "object") {
    state.uiMatchSheetNotes = { individual: "", defense: "", sideout: "" };
  }
  return state.uiMatchSheetNotes;
}
function ensureMatchSheetFiltersState() {
  if (!state.uiMatchSheetFilters || typeof state.uiMatchSheetFilters !== "object") {
    state.uiMatchSheetFilters = {};
  }
  if (typeof state.uiMatchSheetFilters.includeAttackErrors !== "boolean") {
    state.uiMatchSheetFilters.includeAttackErrors = false;
  }
  return state.uiMatchSheetFilters;
}
function isMatchSheetAttackError(ev) {
  if (!ev || ev.skillId !== "attack") return false;
  return String(ev.code || ev.evaluation || "").trim() === "=";
}
function matchesMatchSheetAttackFilters(ev) {
  if (!ev || ev.skillId !== "attack") return true;
  const filters = ensureMatchSheetFiltersState();
  return filters.includeAttackErrors || !isMatchSheetAttackError(ev);
}
function getMatchSheetPoint(point, fallbackZone = null, side = "full") {
  if (point && typeof point.x === "number" && typeof point.y === "number") {
    return { x: clamp01Val(point.x) * 100, y: clamp01Val(point.y) * MATCH_SHEET_COURT_HEIGHT };
  }
  const zone = parseInt(fallbackZone, 10);
  if (side === "far") return MATCH_SHEET_FAR_COURT_ZONES[zone] || null;
  if (side === "near") return MATCH_SHEET_NEAR_COURT_ZONES[zone] || null;
  const base = MATCH_SHEET_COURT_ZONES[zone];
  return base ? { x: base.x, y: (base.y / 60) * MATCH_SHEET_COURT_HEIGHT } : null;
}
function getMatchSheetNumericZone(...values) {
  for (let i = 0; i < values.length; i += 1) {
    const zone = parseInt(values[i], 10);
    if (zone >= 1 && zone <= 6) return zone;
  }
  return null;
}
function getMatchSheetAttackStartZone(ev) {
  if (!ev) return null;
  const traj = ev.attackDirection || ev.attackTrajectory || {};
  return getMatchSheetNumericZone(
    ev.attackStartZone,
    traj.startZone,
    ev.dv && ev.dv.startZone,
    ev.originZone,
    ev.zone,
    ev.playerPosition
  );
}
function getMatchSheetAttackEndZone(ev) {
  if (!ev) return null;
  const traj = ev.attackDirection || ev.attackTrajectory || {};
  return getMatchSheetNumericZone(ev.attackEndZone, traj.endZone, ev.dv && ev.dv.endZone, ev.targetZone, ev.endZone);
}
function orientMatchSheetFromOpposite(traj) {
  if (!traj || !traj.start || !traj.end) return traj;
  const next = {
    start: Object.assign({}, traj.start),
    end: Object.assign({}, traj.end),
    code: traj.code || "",
    count: traj.count || 1
  };
  const startsFromOurSide = next.start.y > next.end.y || next.start.y > MATCH_SHEET_COURT_HEIGHT / 2;
  if (startsFromOurSide) {
    next.start.x = 100 - next.start.x;
    next.end.x = 100 - next.end.x;
    next.start.y = MATCH_SHEET_COURT_HEIGHT - next.start.y;
    next.end.y = MATCH_SHEET_COURT_HEIGHT - next.end.y;
  }
  return next;
}
function getMatchSheetAttackTrajectory(ev) {
  if (!ev) return null;
  const traj = ev.attackDirection || ev.attackTrajectory || {};
  const startZone = getMatchSheetAttackStartZone(ev);
  const endZone = getMatchSheetAttackEndZone(ev);
  const start = getMatchSheetPoint(traj.start || ev.attackStart, startZone, "far");
  const end = getMatchSheetPoint(traj.end || ev.attackEnd, endZone, "near");
  if (!start || !end) return null;
  return orientMatchSheetFromOpposite({ start, end, code: ev.code || ev.evaluation || "", count: 1 });
}
function getMatchSheetSideoutStartPoint(zone) {
  const xByZone = { 1: 18, 2: 18, 3: 50, 4: 82, 5: 82, 6: 50 };
  if (!xByZone[zone]) return null;
  const isFrontRow = zone === 2 || zone === 3 || zone === 4;
  return {
    x: xByZone[zone],
    y: isFrontRow ? 90 : 60
  };
}
function getMatchSheetSideoutTrajectory(ev) {
  if (!ev) return null;
  const startZone = getMatchSheetAttackStartZone(ev);
  const start = getMatchSheetSideoutStartPoint(startZone);
  // Attack coordinates refer to the destination court image, not a full two-sided court.
  const trajectory = ev.attackDirection || ev.attackTrajectory || {};
  const rawEnd = trajectory.end || ev.attackEnd;
  const end = rawEnd && Number.isFinite(rawEnd.x) && Number.isFinite(rawEnd.y)
    ? { x: (1 - clamp01Val(rawEnd.x)) * 100, y: 100 + (1 - clamp01Val(rawEnd.y)) * 100 }
    : getMatchSheetPoint(null, getMatchSheetAttackEndZone(ev), "near");
  if (!start || !end) return null;
  return { start, end, code: ev.code || ev.evaluation || "", count: 1 };
}
function getMatchSheetServeTrajectory(ev) {
  if (!ev) return null;
  const startRaw = ev.serveStart && typeof ev.serveStart.x === "number" && typeof ev.serveStart.y === "number"
    ? ev.serveStart
    : null;
  const endRaw = ev.serveEnd && typeof ev.serveEnd.x === "number" && typeof ev.serveEnd.y === "number"
    ? ev.serveEnd
    : null;
  const start = startRaw
    ? { x: (1 - clamp01Val(startRaw.x)) * 100, y: (1 - clamp01Val(startRaw.y)) * 80 + 4 }
    : getMatchSheetPoint(null, getServeStartZone(ev), "far");
  const end = endRaw
    ? { x: (1 - clamp01Val(endRaw.x)) * 100, y: (1 - clamp01Val(endRaw.y)) * 80 + 116 }
    : null;
  if (!start || !end) return null;
  return { start, end, code: ev.code || ev.evaluation || "", count: 1 };
}
function getMatchSheetEventColor(code, variant = "attack") {
  return getTrajectoryColorForCode(code, variant);
}
function abbreviateMatchSheetName(name = "") {
  const raw = String(name || "").trim();
  if (!raw) return "";
  return typeof formatStructuredPlayerName === "function"
    ? formatStructuredPlayerName(raw)
    : raw;
}
function getMatchSheetDefenseArrow(zone) {
  const target = MATCH_SHEET_FAR_COURT_ZONES[zone] || { x: 50, y: 76 };
  const starts = {
    4: { x: Math.max(4, target.x - 22), y: -18 },
    2: { x: Math.min(96, target.x + 22), y: -18 },
    3: { x: target.x, y: -18 },
    6: { x: target.x, y: -18 },
    1: { x: Math.min(96, target.x + 18), y: -18 }
  };
  return { start: starts[zone] || { x: 50, y: -18 }, end: { x: target.x, y: -3 } };
}
function formatMatchSheetNotes(value = "") {
  const lines = String(value || "").split(/\r?\n/).slice(0, 3);
  while (lines.length < 2) lines.push("");
  return lines.map(line => `<div class="match-sheet-note-line">${escapeDvwScoutHtml(line)}</div>`).join("");
}
function renderMatchSheetNotesBlock(key, label = "Note") {
  const notes = ensureMatchSheetNotesState();
  const value = notes[key] || "";
  return `<div class="match-sheet-notes" data-note-key="${escapeDvwScoutHtml(key)}">
    <label>${escapeDvwScoutHtml(label)}</label>
    <textarea data-match-sheet-note="${escapeDvwScoutHtml(key)}" rows="3">${escapeDvwScoutHtml(value)}</textarea>
    <div class="match-sheet-notes-print">${formatMatchSheetNotes(value)}</div>
  </div>`;
}
function renderMatchSheetArrowHead(start, end, color, size = 5) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!length) return "";
  const ux = dx / length;
  const uy = dy / length;
  const depth = Math.min(size, length);
  const bx = end.x - ux * depth;
  const by = end.y - uy * depth;
  const halfWidth = depth * 0.45;
  return `<polygon points="${end.x},${end.y} ${bx - uy * halfWidth},${by + ux * halfWidth} ${bx + uy * halfWidth},${by - ux * halfWidth}" fill="${color}" />`;
}
function renderMatchSheetCourtSvg(trajectories = [], options = {}) {
  const isFullCourt = !!options.fullCourt;
  const courtHeight = isFullCourt ? MATCH_SHEET_COURT_HEIGHT : 100;
  const viewTop = options.sourceZone ? -24 : 0;
  const viewHeight = courtHeight - viewTop;
  const scaleY = y => {
    const raw = Number(y) || 0;
    return isFullCourt ? raw : raw / 2;
  };
  const lines = (options.fullCourt ? (trajectories || []) : (trajectories || []).slice(0, 28)).map((item, idx) => {
    const color = getMatchSheetEventColor(item.code, options.variant || "attack");
    const opacity = Math.max(0.28, 0.78 - idx * 0.012);
    return `<g opacity="${opacity}">
      <line x1="${item.start.x.toFixed(1)}" y1="${scaleY(item.start.y).toFixed(1)}" x2="${item.end.x.toFixed(1)}" y2="${scaleY(item.end.y).toFixed(1)}" stroke="${color}" stroke-width="1.7" stroke-linecap="round" />
      ${renderMatchSheetArrowHead({x: item.start.x, y: scaleY(item.start.y)}, {x: item.end.x, y: scaleY(item.end.y)}, color)}
    </g>`;
  }).join("");
  const sourceArrow = options.sourceZone
    ? getMatchSheetDefenseArrow(parseInt(options.sourceZone, 10))
    : null;
  const sourceArrowSvg = sourceArrow
    ? `<line class="match-sheet-source-arrow" x1="${sourceArrow.start.x}" y1="${scaleY(sourceArrow.start.y)}" x2="${sourceArrow.end.x}" y2="${scaleY(sourceArrow.end.y)}" />${renderMatchSheetArrowHead({x: sourceArrow.start.x, y: scaleY(sourceArrow.start.y)}, {x: sourceArrow.end.x, y: scaleY(sourceArrow.end.y)}, "#111827")}`
    : "";
  const players = (options.players || []).map(slot => {
    const zone = slot.point || (
      options.playersSide === "far"
        ? MATCH_SHEET_FAR_COURT_ZONES[slot.pos]
        : options.playersSide === "near"
          ? MATCH_SHEET_NEAR_COURT_ZONES[slot.pos]
          : getMatchSheetPoint(null, slot.pos, "full"));
    if (!zone || !slot.label) return "";
    return `<g class="match-sheet-court-player">
      <circle cx="${zone.x}" cy="${scaleY(zone.y)}" r="6.5" />
      <text x="${zone.x}" y="${scaleY(zone.y) + (slot.role ? -0.5 : 2.2)}">${escapeDvwScoutHtml(slot.label)}</text>
      ${slot.role ? `<text class="match-sheet-court-player__role" x="${zone.x}" y="${scaleY(zone.y) + 4}">${escapeDvwScoutHtml(slot.role)}</text>` : ""}
    </g>`;
  }).join("");
  const title = options.title ? `<div class="match-sheet-court__title">${escapeDvwScoutHtml(options.title)}</div>` : "";
  return `<div class="match-sheet-court ${options.className || ""}">
    ${title}
    <svg viewBox="0 ${viewTop} 100 ${viewHeight}" role="img" aria-label="${escapeDvwScoutHtml(options.title || "Campo")}">
      <rect x="1" y="1" width="98" height="${courtHeight - 2}" rx="1.5" />
      <line x1="34" y1="1" x2="34" y2="${courtHeight - 1}" class="court-line-soft" />
      <line x1="66" y1="1" x2="66" y2="${courtHeight - 1}" class="court-line-soft" />
      ${isFullCourt ? `<line x1="1" y1="${courtHeight / 2}" x2="99" y2="${courtHeight / 2}" class="net" />` : ""}
      <line x1="1" y1="${courtHeight / 3}" x2="99" y2="${courtHeight / 3}" class="attack-line" />
      ${isFullCourt ? `<line x1="1" y1="${courtHeight * 2 / 3}" x2="99" y2="${courtHeight * 2 / 3}" class="attack-line" />` : ""}
      ${sourceArrowSvg}
      ${lines}
      ${players}
    </svg>
    ${options.noteKey ? renderMatchSheetNotesBlock(options.noteKey) : ""}
  </div>`;
}
function getMatchSheetPlayers(scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const liberos = new Set(getLiberosForScope(scope));
  const start = getSetStartEntryForScope(1, scope) || getDefaultSetStartForScope(scope) || { court: [], rotation: 1 };
  const rotation = typeof start.rotation === "number" ? start.rotation : 1;
  const starters = getCourtShape(start.court || [])
    .map((slot, idx) => {
      const name = slot && (slot.main || slot.replaced) ? slot.main || slot.replaced : "";
      const role = typeof getRoleLabelForRotation === "function" ? String(getRoleLabelForRotation(idx + 1, rotation)) : "";
      return { name, role, pos: idx + 1, starter: true };
    })
    .filter(item => item.name && !liberos.has(item.name));
  starters.sort((a, b) => {
    const ai = MATCH_SHEET_ROLE_ORDER.indexOf(a.role);
    const bi = MATCH_SHEET_ROLE_ORDER.indexOf(b.role);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const seen = new Set(starters.map(item => item.name));
  const bench = (players || [])
    .filter(name => name && !seen.has(name) && !liberos.has(name))
    .map(name => ({ name, role: "", pos: null, starter: false }))
    .sort((a, b) => {
      const an = parseInt(numbers[a.name], 10);
      const bn = parseInt(numbers[b.name], 10);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return String(a.name).localeCompare(String(b.name), "it", { sensitivity: "base" });
    });
  return starters.concat(bench).map((item, idx) => ({
    name: item.name,
    number: numbers[item.name] || "",
    role: item.role || (liberos.has(item.name) ? "L" : ""),
    pos: item.pos,
    starter: item.starter,
    idx: players.indexOf(item.name),
    order: idx + 1
  }));
}
function getMatchSheetEvents(scope) {
  return getAnalysisEvents()
    .filter(ev => ev && getTeamScopeFromEvent(ev) === scope)
    .filter(ev => matchesSummarySetFilter(ev));
}
function groupMatchSheetTrajectoriesByPlayer(scope, skillId) {
  const grouped = {};
  getMatchSheetEvents(scope)
    .filter(ev => ev && ev.skillId === skillId)
    .filter(matchesMatchSheetAttackFilters)
    .forEach(ev => {
      const idx = typeof ev.playerIdx === "number" ? ev.playerIdx : resolvePlayerIdxFromNameForScope(ev.playerName, scope);
      if (idx < 0) return;
      const traj = skillId === "serve" ? getMatchSheetServeTrajectory(ev) : getMatchSheetAttackTrajectory(ev);
      if (!traj) return;
      if (!grouped[idx]) grouped[idx] = [];
      grouped[idx].push(traj);
    });
  return grouped;
}
function isMatchSheetSideoutAttack(ev) {
  if (!ev || ev.skillId !== "attack") return false;
  if (!matchesMatchSheetAttackFilters(ev)) return false;
  if (ev.attackBp === false || String(ev.attackBp).toLowerCase() === "false") return true;
  if (String(ev.phase || ev.attackPhase || "").toLowerCase() === "sideout") return true;
  if (ev.receiveEvaluation) return true;
  return false;
}
function inferMatchSheetSideoutRotation(ev) {
  if (!ev) return "extra";
  const candidates = [ev.receiveRotation, ev.sideoutRotation, ev.rotation];
  for (let i = 0; i < candidates.length; i += 1) {
    const rot = parseInt(candidates[i], 10);
    if (rot >= 1 && rot <= 6) return rot;
  }
  return "extra";
}
function getMatchSheetSideoutGroups(scope) {
  const groups = {};
  MATCH_SHEET_ROTATION_ORDER.forEach(rot => {
    groups[rot] = [];
  });
  getMatchSheetSideoutEvents(scope)
    .filter(isMatchSheetSideoutAttack)
    .forEach(ev => {
      const key = inferMatchSheetSideoutRotation(ev);
      const traj = getMatchSheetSideoutTrajectory(ev);
      if (!traj) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(traj);
    });
  return groups;
}
function getMatchSheetSideoutEvents(scope) {
  const filters = ensureMatchSheetFiltersState();
  const sets = filters.sideoutSets || [];
  const players = (filters.sideoutPlayers || {})[scope] || [];
  return getMatchSheetEvents(scope).filter(ev => {
    const idx = typeof ev.playerIdx === "number" ? ev.playerIdx : resolvePlayerIdxFromNameForScope(ev.playerName, scope);
    return (!sets.length || sets.includes(String(ev.set))) &&
      (!players.length || players.includes(String(idx)));
  });
}
function getMatchSheetLatestPlayerNumbers(scope) {
  const sources = [state];
  const extras = typeof getAnalysisExtraMatchState === "function" ? getAnalysisExtraMatchState() : {};
  for (const key of extras[scope] || []) {
    const source = state.savedMatches && state.savedMatches[key];
    if (source && source.state) sources.push(source.state);
  }
  sources.sort((a, b) => String(a.match?.date || "").localeCompare(String(b.match?.date || "")));
  const numbers = new Map();
  for (const source of sources) {
    const rosterNumbers = scope === "opponent" ? source.opponentPlayerNumbers : source.playerNumbers;
    for (const [name, number] of Object.entries(rosterNumbers || {})) {
      if (number !== "" && number != null) numbers.set(name.trim().toLocaleLowerCase(), String(number));
    }
  }
  return numbers;
}
function getMatchSheetLineupPlayersForEvents(scope, rotation) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const latestNumbers = getMatchSheetLatestPlayerNumbers(scope);
  const groups = new Map();
  getMatchSheetSideoutEvents(scope).filter(isMatchSheetSideoutAttack).forEach(ev => {
    if (inferMatchSheetSideoutRotation(ev) !== rotation) return;
    const pos = getMatchSheetAttackStartZone(ev);
    if (!pos || !getMatchSheetSideoutTrajectory(ev)) return;
    const idx = typeof ev.playerIdx === "number" ? ev.playerIdx : resolvePlayerIdxFromNameForScope(ev.playerName, scope);
    const name = players[idx] || ev.playerName || "Giocatrice non identificata";
    const formation = getSetStartEntryForScope(ev.set, scope);
    const court = formation ? getCourtShape(formation.court || []) : [];
    const position = court.findIndex(slot => slot && (slot.main === name || slot.replaced === name));
    const role = position >= 0 ? String(getRoleLabelForRotation(position + 1, formation.rotation || 1)) : "";
    const key = `${pos}:${idx}:${name}:${role}`;
    if (!groups.has(key)) groups.set(key, {pos, role, name, number: latestNumbers.get(name.trim().toLocaleLowerCase()) ?? numbers[name] ?? ev.playerNumberAtEvent ?? "", count: 0, events: []});
    const group = groups.get(key);
    group.count += 1;
    group.events.push(ev);
  });
  const result = Array.from(groups.values()).sort((a, b) => a.pos - b.pos || b.count - a.count || a.name.localeCompare(b.name));
  result.forEach(group => {
    const peers = result.filter(item => item.pos === group.pos);
    const offset = peers.length > 1 ? -10 + 20 * peers.indexOf(group) / (peers.length - 1) : 0;
    const start = getMatchSheetSideoutStartPoint(group.pos);
    group.point = {x: start.x + offset, y: start.y};
    group.label = group.number !== "" ? String(group.number) : "—";
    group.description = `Zona ${group.pos} · ${group.role ? group.role + " · " : ""}${group.number ? "#" + group.number + " " : ""}${group.name} · ${group.count} attacchi`;
  });
  return result;
}

function renderMatchSheetSideoutFilters(scope) {
  const filters = ensureMatchSheetFiltersState();
  const sets = [...new Set(getMatchSheetEvents(scope).map(ev => ev.set).filter(value => value != null))].sort((a, b) => a - b);
  const selectedPlayers = (filters.sideoutPlayers || {})[scope] || [];
  const option = (kind, value, label, selected) => `<label><input type="checkbox" data-sideout-filter="${kind}" value="${escapeDvwScoutHtml(String(value))}" ${selected.includes(String(value)) ? "checked" : ""}> ${escapeDvwScoutHtml(label)}</label>`;
  return `<details class="match-sheet-sideout-filters"><summary>Filtri cambio palla · set e giocatrici</summary>
    <p>Nessuna selezione: tutti i set e tutte le giocatrici. Restano validi i filtri generali dell’analisi.</p>
    <fieldset><legend>Set</legend>${sets.map(set => option("sets", set, `Set ${set}`, filters.sideoutSets || [])).join("")}</fieldset>
    <fieldset><legend>Giocatrici</legend>${getPlayersForScope(scope).map((name, idx) => option("players", idx, name, selectedPlayers)).join("")}</fieldset>
    </details>`;
}
function getMatchSheetRelatedAttack(ev) {
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
function getMatchSheetDefenseGroups(scope) {
  const groups = {};
  MATCH_SHEET_DEFENSE_ZONES.forEach(zone => {
    groups[zone] = [];
  });
  let linkedCount = 0;
  getMatchSheetEvents(scope)
    .filter(ev => ev && ev.skillId === "defense")
    .forEach(ev => {
      const attack = getMatchSheetRelatedAttack(ev);
      if (!attack) return;
      if (!matchesMatchSheetAttackFilters(attack)) return;
      const traj = getMatchSheetAttackTrajectory(attack);
      if (!traj) return;
      traj.code = ev.code || attack.code || "";
      const zone = getMatchSheetAttackStartZone(attack);
      if (!MATCH_SHEET_DEFENSE_ZONES.includes(zone)) return;
      if (!groups[zone]) groups[zone] = [];
      groups[zone].push(traj);
      linkedCount += 1;
    });
  if (linkedCount === 0) {
    const opponentScope = getOppositeScope(scope);
    getMatchSheetEvents(opponentScope)
      .filter(ev => ev && ev.skillId === "attack")
      .filter(matchesMatchSheetAttackFilters)
      .forEach(ev => {
        const traj = getMatchSheetAttackTrajectory(ev);
        if (!traj) return;
        const zone = getMatchSheetAttackStartZone(ev);
        if (!MATCH_SHEET_DEFENSE_ZONES.includes(zone)) return;
        if (!groups[zone]) groups[zone] = [];
        groups[zone].push(traj);
      });
  }
  return groups;
}
function renderMatchSheetAnalysis() {
  const page = getMatchSheetPageEl();
  if (!page) return;
  const scope = getAnalysisTeamScope();
  const filters = ensureMatchSheetFiltersState();
  const players = getMatchSheetPlayers(scope);
  const serveByPlayer = groupMatchSheetTrajectoriesByPlayer(scope, "serve");
  const attackByPlayer = groupMatchSheetTrajectoriesByPlayer(scope, "attack");
  const defenseGroups = getMatchSheetDefenseGroups(scope);
  const sideoutGroups = getMatchSheetSideoutGroups(scope);
  const matchLabel =
    (typeof buildMatchDisplayName === "function" && buildMatchDisplayName(state.match || {})) ||
    (state.match && state.match.opponent) ||
    "Match";
  const teamLabel = getTeamNameForScope(scope);
  const playerCards = players.map(player => {
    const header = `<div class="match-sheet-player__head">
      <strong>${escapeDvwScoutHtml(player.number ? `#${player.number}` : "#")}</strong>
      <span>${escapeDvwScoutHtml(abbreviateMatchSheetName(player.name) || "-")}</span>
      <em>${escapeDvwScoutHtml(player.role || (player.starter ? "T" : "R"))}</em>
    </div>`;
    return `<div class="match-sheet-player ${player.starter ? "is-starter" : ""}">
      ${header}
      ${renderMatchSheetCourtSvg(serveByPlayer[player.idx] || [], {
        variant: "serve",
        noteKey: `player:${player.idx}:serve`
      })}
      ${renderMatchSheetCourtSvg(attackByPlayer[player.idx] || [], {
        variant: "attack",
        noteKey: `player:${player.idx}:attack`
      })}
    </div>`;
  }).join("");
  const defenseHtml = MATCH_SHEET_DEFENSE_ZONES.map(zone =>
    renderMatchSheetCourtSvg(defenseGroups[zone] || [], {
      title: `Difesa da Z${zone}`,
      variant: "attack",
      className: "match-sheet-court--defense",
      sourceZone: zone,
      noteKey: `defense:${zone}`
    })
  ).join("");
  const renderSideoutCourt = rot => {
    const attackers = getMatchSheetLineupPlayersForEvents(scope, rot);
    const trajectories = attackers.flatMap(attacker => attacker.events.map(ev => ({
      ...getMatchSheetSideoutTrajectory(ev), start: attacker.point
    })));
    return renderMatchSheetCourtSvg(trajectories, {
      title: rot === "extra" ? "CP extra" : `P${rot}`,
      variant: "attack", players: attackers, playersSide: "far",
      className: "match-sheet-court--sideout", fullCourt: true,
      noteKey: `sideout:${rot}`
    });
  };
  const sideoutHtml = MATCH_SHEET_ROTATION_ORDER.map(renderSideoutCourt).join("") +
    ((sideoutGroups.extra || []).length ? renderSideoutCourt("extra") : "");
  const controls = document.getElementById("match-sheet-controls");
  if (controls) controls.innerHTML = `
        <label class="match-sheet-filter">
          <input type="checkbox" data-match-sheet-filter="includeAttackErrors" ${filters.includeAttackErrors ? "checked" : ""}>
          <span>Includi attacchi errore</span>
        </label>
    ${renderMatchSheetSideoutFilters(scope)}
  `;
  page.innerHTML = `
    <header class="match-sheet-header">
      <div>
        <h2>${escapeDvwScoutHtml(matchLabel)}</h2>
        <p>Squadra analizzata: <strong>${escapeDvwScoutHtml(teamLabel)}</strong></p>
      </div>
      <div class="match-sheet-header__meta">
        <span>${players.length} giocatrici</span>
        <span>${getMatchSheetEvents(scope).length} eventi filtrati</span>

      </div>
    </header>
    <section class="match-sheet-section match-sheet-section--players match-sheet-section--with-label">
      <h3>Dati individuali giocatrici</h3>
      <div class="match-sheet-player-matrix">
        <div class="match-sheet-player-row-labels">
          <span></span>
          <span>Servizio</span>
          <span>Attacco</span>
        </div>
        <div class="match-sheet-player-grid" style="--match-sheet-player-count: ${Math.max(1, players.length)}">${playerCards || '<div class="players-empty">Nessuna giocatrice disponibile.</div>'}</div>
      </div>
    </section>
    <section class="match-sheet-section match-sheet-section--with-label">
      <h3>Difesa</h3>
      <div class="match-sheet-court-grid match-sheet-court-grid--defense">${defenseHtml}</div>
    </section>
    <section class="match-sheet-section match-sheet-section--with-label">
      <h3>Cambio palla</h3>
      <div class="match-sheet-court-grid match-sheet-court-grid--sideout">${sideoutHtml}</div>
    </section>
  `;
  page.querySelectorAll("[data-match-sheet-note]").forEach(input => {
    input.addEventListener("input", () => {
      const notes = ensureMatchSheetNotesState();
      notes[input.dataset.matchSheetNote] = input.value || "";
      const block = input.closest(".match-sheet-notes");
      const print = block ? block.querySelector(".match-sheet-notes-print") : null;
      if (print) print.innerHTML = formatMatchSheetNotes(input.value || "");
      saveState({ persistLocal: true });
    });
  });
  controls?.querySelectorAll("[data-sideout-filter]").forEach(input => {
    input.addEventListener("change", () => {
      const next = ensureMatchSheetFiltersState();
      const kind = input.dataset.sideoutFilter;
      const values = Array.from(controls.querySelectorAll(`[data-sideout-filter="${kind}"]:checked`), item => item.value);
      if (kind === "sets") next.sideoutSets = values;
      else {
        if (!next.sideoutPlayers) next.sideoutPlayers = {};
        next.sideoutPlayers[scope] = values;
      }
      saveState({ persistLocal: true });
      renderMatchSheetAnalysis();
      controls.querySelector(".match-sheet-sideout-filters").open = true;
    });
  });
  controls?.querySelectorAll("[data-match-sheet-filter]").forEach(input => {
    input.addEventListener("change", () => {
      const nextFilters = ensureMatchSheetFiltersState();
      nextFilters[input.dataset.matchSheetFilter] = !!input.checked;
      saveState({ persistLocal: true });
      renderMatchSheetAnalysis();
    });
  });
}
