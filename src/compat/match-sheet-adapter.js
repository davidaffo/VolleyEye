function buildReactMatchSheetCourt(trajectories = [], options = {}) {
  const full = !!options.fullCourt,
    height = full ? MATCH_SHEET_COURT_HEIGHT : 100,
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
        ? MATCH_SHEET_FAR_COURT_ZONES[slot.pos]
        : options.playersSide === "near"
          ? MATCH_SHEET_NEAR_COURT_ZONES[slot.pos]
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
function publishReactMatchSheet() {
  const scope = getAnalysisTeamScope(),
    filters = ensureMatchSheetFiltersState(),
    serve = groupMatchSheetTrajectoriesByPlayer(scope, "serve"),
    attack = groupMatchSheetTrajectoriesByPlayer(scope, "attack"),
    defense = getMatchSheetDefenseGroups(scope),
    sideout = getMatchSheetSideoutGroups(scope),
    events = getMatchSheetEvents(scope);
  const players = getMatchSheetPlayers(scope).map((player) => ({
    ...player,
    label: abbreviateMatchSheetName(player.name) || "-",
    serve: buildReactMatchSheetCourt(serve[player.idx] || [], {
      variant: "serve",
      noteKey: `player:${player.idx}:serve`,
    }),
    attack: buildReactMatchSheetCourt(attack[player.idx] || [], {
      variant: "attack",
      noteKey: `player:${player.idx}:attack`,
    }),
  }));
  const rotations = [
    ...MATCH_SHEET_ROTATION_ORDER,
    ...((sideout.extra || []).length ? ["extra"] : []),
  ];
  matchSheetStore.publish({
    scope,
    matchLabel:
      (typeof buildMatchDisplayName === "function" &&
        buildMatchDisplayName(state.match || {})) ||
      (state.match && state.match.opponent) ||
      "Match",
    teamLabel: getTeamNameForScope(scope),
    eventCount: events.length,
    players,
    defense: MATCH_SHEET_DEFENSE_ZONES.map((zone) =>
      buildReactMatchSheetCourt(defense[zone] || [], {
        title: `Difesa da Z${zone}`,
        variant: "attack",
        className: "match-sheet-court--defense",
        sourceZone: zone,
        noteKey: `defense:${zone}`,
      }),
    ),
    sideout: rotations.map((rot) => {
      const attackers = getMatchSheetLineupPlayersForEvents(scope, rot),
        trajectories = attackers.flatMap((attacker) =>
          attacker.events.map((ev) => ({
            ...getMatchSheetSideoutTrajectory(ev),
            start: attacker.point,
          })),
        );
      return buildReactMatchSheetCourt(trajectories, {
        title: rot === "extra" ? "CP extra" : `P${rot}`,
        variant: "attack",
        players: attackers,
        playersSide: "far",
        className: "match-sheet-court--sideout",
        fullCourt: true,
        noteKey: `sideout:${rot}`,
      });
    }),
    filters: {
      includeAttackErrors: filters.includeAttackErrors,
      sets: [...(filters.sideoutSets || [])],
      players: [...((filters.sideoutPlayers || {})[scope] || [])],
    },
    sets: [
      ...new Set(events.map((ev) => ev.set).filter((value) => value != null)),
    ].sort((a, b) => a - b),
    roster: getPlayersForScope(scope).map((name, index) => ({ name, index })),
    notes: { ...ensureMatchSheetNotesState() },
  });
}
function changeReactMatchSheetFilter(kind, value, checked) {
  const filters = ensureMatchSheetFiltersState();
  if (kind === "includeAttackErrors") filters.includeAttackErrors = !!checked;
  else {
    const scope = getAnalysisTeamScope();
    if (!filters.sideoutPlayers) filters.sideoutPlayers = {};
    const current =
        kind === "sets"
          ? filters.sideoutSets || []
          : filters.sideoutPlayers[scope] || [],
      selected = new Set(current);
    if (checked) selected.add(String(value));
    else selected.delete(String(value));
    const options =
        kind === "sets"
          ? matchSheetStore.getSnapshot().sets
          : matchSheetStore.getSnapshot().roster.map((player) => player.index),
      next = options.map(String).filter((option) => selected.has(option));
    if (kind === "sets") filters.sideoutSets = next;
    else filters.sideoutPlayers[scope] = next;
  }
  saveState({ persistLocal: true });
  renderMatchSheetAnalysis();
}
function changeReactMatchSheetNote(key, value) {
  ensureMatchSheetNotesState()[key] = value || "";
  matchSheetStore.publish({ notes: { ...ensureMatchSheetNotesState() } });
  saveState({ persistLocal: true });
}
