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
  const xByZone = { 1: 82, 2: 82, 3: 50, 4: 18, 5: 18, 6: 50 };
  if (!xByZone[zone]) return null;
  const isFrontRow = zone === 2 || zone === 3 || zone === 4;
  return {
    x: xByZone[zone],
    y: isFrontRow ? MATCH_SHEET_COURT_HEIGHT / 2 : MATCH_SHEET_COURT_HEIGHT / 3
  };
}
function getMatchSheetSideoutTrajectory(ev) {
  if (!ev) return null;
  const traj = ev.attackDirection || ev.attackTrajectory || {};
  const startZone = getMatchSheetAttackStartZone(ev);
  const endZone = getMatchSheetAttackEndZone(ev);
  const start = getMatchSheetSideoutStartPoint(startZone);
  let end = getMatchSheetPoint(traj.end || ev.attackEnd, endZone, "near");
  if (end && end.y < MATCH_SHEET_COURT_HEIGHT / 2) {
    end = { x: end.x, y: MATCH_SHEET_COURT_HEIGHT - end.y };
  }
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
    ? { x: clamp01Val(startRaw.x) * 100, y: clamp01Val(startRaw.y) * 80 + 4 }
    : getMatchSheetPoint(null, getServeStartZone(ev), "far");
  const end = endRaw
    ? { x: clamp01Val(endRaw.x) * 100, y: clamp01Val(endRaw.y) * 80 + 116 }
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
function renderMatchSheetCourtSvg(trajectories = [], options = {}) {
  const isFullCourt = !!options.fullCourt;
  const courtHeight = isFullCourt ? MATCH_SHEET_COURT_HEIGHT : 100;
  const viewTop = options.sourceZone ? -24 : 0;
  const viewHeight = courtHeight - viewTop;
  const scaleY = y => {
    const raw = Number(y) || 0;
    return isFullCourt ? raw : raw / 2;
  };
  const lines = (trajectories || []).slice(0, 28).map((item, idx) => {
    const color = getMatchSheetEventColor(item.code, options.variant || "attack");
    const opacity = Math.max(0.28, 0.78 - idx * 0.012);
    return `<g opacity="${opacity}">
      <line x1="${item.start.x.toFixed(1)}" y1="${scaleY(item.start.y).toFixed(1)}" x2="${item.end.x.toFixed(1)}" y2="${scaleY(item.end.y).toFixed(1)}" stroke="${color}" stroke-width="1.7" stroke-linecap="round" marker-end="url(#matchSheetArrow)" />
      <circle cx="${item.end.x.toFixed(1)}" cy="${scaleY(item.end.y).toFixed(1)}" r="1.9" fill="${color}" />
    </g>`;
  }).join("");
  const sourceArrow = options.sourceZone
    ? getMatchSheetDefenseArrow(parseInt(options.sourceZone, 10))
    : null;
  const sourceArrowSvg = sourceArrow
    ? `<line class="match-sheet-source-arrow" x1="${sourceArrow.start.x}" y1="${scaleY(sourceArrow.start.y)}" x2="${sourceArrow.end.x}" y2="${scaleY(sourceArrow.end.y)}" marker-end="url(#matchSheetArrowBlack)" />`
    : "";
  const players = (options.players || []).map(slot => {
    const zone =
      options.playersSide === "far"
        ? MATCH_SHEET_FAR_COURT_ZONES[slot.pos]
        : options.playersSide === "near"
          ? MATCH_SHEET_NEAR_COURT_ZONES[slot.pos]
          : getMatchSheetPoint(null, slot.pos, "full");
    if (!zone || !slot.label) return "";
    return `<g class="match-sheet-court-player">
      <circle cx="${zone.x}" cy="${scaleY(zone.y)}" r="6.5" />
      <text x="${zone.x}" y="${scaleY(zone.y) + 2.2}">${escapeDvwScoutHtml(slot.label)}</text>
    </g>`;
  }).join("");
  const title = options.title ? `<div class="match-sheet-court__title">${escapeDvwScoutHtml(options.title)}</div>` : "";
  return `<div class="match-sheet-court ${options.className || ""}">
    ${title}
    <svg viewBox="0 ${viewTop} 100 ${viewHeight}" role="img" aria-label="${escapeDvwScoutHtml(options.title || "Campo")}">
      <defs>
        <marker id="matchSheetArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"></path>
        </marker>
        <marker id="matchSheetArrowBlack" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#111827"></path>
        </marker>
      </defs>
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
  getMatchSheetEvents(scope)
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
function getMatchSheetLineupPlayersForEvents(scope, rotation) {
  const events = getMatchSheetEvents(scope).filter(ev => inferMatchSheetSideoutRotation(ev) === rotation);
  const attackEvents = events.filter(isMatchSheetSideoutAttack);
  const byZone = new Map();
  attackEvents.forEach(ev => {
    const zone = getMatchSheetAttackStartZone(ev);
    if (!zone || byZone.has(zone)) return;
    const idx = typeof ev.playerIdx === "number" ? ev.playerIdx : resolvePlayerIdxFromNameForScope(ev.playerName, scope);
    const players = getPlayersForScope(scope);
    const numbers = getPlayerNumbersForScope(scope);
    const name = ev.playerName || players[idx] || "";
    if (!name) return;
    byZone.set(zone, {
      pos: zone,
      label: `${numbers[name] || ""}${numbers[name] ? " " : ""}${abbreviateMatchSheetName(name)}`
    });
  });
  return Array.from(byZone.values());
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
  const sideoutHtml = MATCH_SHEET_ROTATION_ORDER.map(rot =>
    renderMatchSheetCourtSvg(sideoutGroups[rot] || [], {
      title: `P${rot}`,
      variant: "attack",
      players: getMatchSheetLineupPlayersForEvents(scope, rot),
      playersSide: "far",
      className: "match-sheet-court--sideout",
      fullCourt: true,
      noteKey: `sideout:${rot}`
    })
  ).join("") + ((sideoutGroups.extra || []).length
    ? renderMatchSheetCourtSvg(sideoutGroups.extra, {
        title: "CP extra",
        variant: "attack",
        className: "match-sheet-court--sideout",
        fullCourt: true,
        noteKey: "sideout:extra"
      })
    : "");
  page.innerHTML = `
    <header class="match-sheet-header">
      <div>
        <h2>${escapeDvwScoutHtml(matchLabel)}</h2>
        <p>Squadra analizzata: <strong>${escapeDvwScoutHtml(teamLabel)}</strong></p>
      </div>
      <div class="match-sheet-header__meta">
        <span>${players.length} giocatrici</span>
        <span>${getMatchSheetEvents(scope).length} eventi filtrati</span>
        <label class="match-sheet-filter">
          <input type="checkbox" data-match-sheet-filter="includeAttackErrors" ${filters.includeAttackErrors ? "checked" : ""}>
          <span>Includi attacchi errore</span>
        </label>
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
  page.querySelectorAll("[data-match-sheet-filter]").forEach(input => {
    input.addEventListener("change", () => {
      const nextFilters = ensureMatchSheetFiltersState();
      nextFilters[input.dataset.matchSheetFilter] = !!input.checked;
      saveState({ persistLocal: true });
      renderMatchSheetAnalysis();
    });
  });
}
