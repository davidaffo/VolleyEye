function parseDvwPlayersSection(lines, teamMeta, side = "our") {
  const playersDetailed = [];
  const players = [];
  const numbers = {};
  const liberos = [];
  const captains = [];
  const numberToName = new Map();
  (lines || [])
    .map(parseDvwRow)
    .filter(row => row.some(Boolean))
    .forEach((row, idx) => {
      const shirtNumber = padDv(row[1] || idx + 1, 2);
      const lastName = row[9] || "";
      const firstName = row[10] || "";
      const name = formatDvwImportedName(lastName, firstName) || `${side === "opponent" ? "Avv." : "Gioc."} ${idx + 1}`;
      const isLibero = String(row[12] || "").toUpperCase() === "L";
      const isCaptain = String(row[13] || "").trim() === "1";
      const player = {
        id: typeof generatePlayerId === "function" ? generatePlayerId() : `dvw-${side}-${idx + 1}`,
        name,
        firstName: firstName || "",
        lastName: lastName || "",
        number: shirtNumber,
        codeOfficial: String(row[8] || "").trim(),
        role: isLibero ? "L" : "",
        isCaptain,
        out: false,
        dvSetCols: row.slice(3, 8)
      };
      playersDetailed.push(player);
      players.push(name);
      numbers[name] = shirtNumber;
      numberToName.set(shirtNumber, name);
      if (isLibero) liberos.push(name);
      if (isCaptain) captains.push(name);
    });
  return {
    name: teamMeta && teamMeta.name ? teamMeta.name : side === "opponent" ? "Avversaria" : "Squadra",
    officialCode: teamMeta && teamMeta.code ? teamMeta.code : "",
    officialId: teamMeta && teamMeta.id ? teamMeta.id : "",
    playersDetailed,
    players,
    numbers,
    liberos,
    captains: captains.slice(0, 1),
    numberToName
  };
}
function buildImportedTeamPayloadFromDvw(parsedTeam) {
  if (!parsedTeam) return null;
  const playersDetailed = (parsedTeam.playersDetailed || []).map(player =>
    Object.assign({}, player, {
      id: player && player.id ? player.id : (typeof generatePlayerId === "function" ? generatePlayerId() : ""),
      out: !!(player && player.out)
    })
  );
  const defaultLineup = playersDetailed
    .filter(player => player && !player.out && player.role !== "L")
    .slice(0, 6)
    .map(player => player.name);
  return {
    version: 3,
    name: parsedTeam.name || "",
    staff: Object.assign({}, DEFAULT_STAFF),
    officialCode: parsedTeam.officialCode || "",
    officialId: parsedTeam.officialId || "",
    playersDetailed,
    defaultLineup,
    defaultRotation: 1,
    preferredLibero: (parsedTeam.liberos && parsedTeam.liberos[0]) || ""
  };
}
function buildDvwSetStarts(homePayload, awayPayload, scoutRows) {
  const setStarts = {};
  const seenFirstSkill = new Set();
  const tryBuildFromPlayers = (payload, setNum) => {
    const lineup = Array(6).fill("");
    (payload.playersDetailed || []).forEach(player => {
      const val = player.dvSetCols && player.dvSetCols[setNum - 1] ? String(player.dvSetCols[setNum - 1]).trim() : "";
      const pos = parseInt(val, 10);
      if (pos >= 1 && pos <= 6) lineup[pos - 1] = player.name;
    });
    return lineup.some(Boolean) ? lineup : null;
  };
  [1, 2, 3, 4, 5].forEach(setNum => {
    const homeLineup = tryBuildFromPlayers(homePayload, setNum);
    const awayLineup = tryBuildFromPlayers(awayPayload, setNum);
    if (homeLineup || awayLineup) {
      setStarts[setNum] = {
        our: { court: makeImportedCourtFromNames(homeLineup || []), rotation: 1 },
        opponent: { court: makeImportedCourtFromNames(awayLineup || []), rotation: 1 },
        swapCourt: false,
        isServing: false
      };
    }
  });
  (scoutRows || []).forEach(row => {
    const cells = parseDvwRow(row);
    const code = String(cells[0] || "").trim();
    const setNum = parseInt(cells[8], 10) || 1;
    const homeRotation = parseInt(cells[9], 10) || 1;
    const awayRotation = parseInt(cells[10], 10) || 1;
    const homeLineupNums = cells.slice(14, 20);
    const awayLineupNums = cells.slice(20, 26);
    const homeLineup = homeLineupNums.map(num => homePayload.numberToName.get(padDv(num, 2)) || "");
    const awayLineup = awayLineupNums.map(num => awayPayload.numberToName.get(padDv(num, 2)) || "");
    if (!seenFirstSkill.has(setNum) && parseDvwSkillCode(code).kind === "skill" && (homeLineup.some(Boolean) || awayLineup.some(Boolean))) {
      seenFirstSkill.add(setNum);
      setStarts[setNum] = {
        our: { court: makeImportedCourtFromNames(homeLineup), rotation: homeRotation },
        opponent: { court: makeImportedCourtFromNames(awayLineup), rotation: awayRotation },
        swapCourt: false,
        isServing: /^[*]/.test(code)
      };
    }
  });
  return setStarts;
}
function parseDataVolleyDvwToMatchState(text) {
  const sections = parseDvwSections(text);
  if (!sections.has("3DATAVOLLEYSCOUT") || !sections.has("3SCOUT")) {
    throw new Error("Formato DVW non valido");
  }
  const dvwAttackCombinations = getDvwSectionLines(sections, "3ATTACKCOMBINATION");
  const dvwSetterCalls = getDvwSectionLines(sections, "3SETTERCALL");
  const dvwWinningSymbols = getDvwSectionLines(sections, "3WINNINGSYMBOLS");
  const dvwReserve = getDvwSectionLines(sections, "3RESERVE");
  const dvwVideo = getDvwSectionLines(sections, "3VIDEO");
  const matchRows = (sections.get("3MATCH") || []).filter(line => String(line || "").trim());
  const teamRows = (sections.get("3TEAMS") || []).filter(line => String(line || "").trim()).map(parseDvwRow);
  const setRows = (sections.get("3SET") || []).filter(line => String(line || "").trim()).map(parseDvwRow);
  let scoutRows = (sections.get("3SCOUT") || []).filter(line => String(line || "").trim());
  // Older VolleyEye exports included one extra flag before the clock.
  const legacyLayout = (sections.get("3DATAVOLLEYSCOUT") || []).some(line => line === "GENERATOR-PRG: VolleyEye")
    && scoutRows.some(line => /^\d{2}[.:]\d{2}[.:]\d{2}$/.test(parseDvwRow(line)[8] || ""));
  if (legacyLayout) scoutRows = scoutRows.map(line => {
    const cells = parseDvwRow(line);
    cells.splice(1, 1);
    return cells.join(";");
  });
  const matchInfo = matchRows.length ? parseDvwRow(matchRows[0]) : [];
  const homeTeamMeta = teamRows[0]
    ? { code: teamRows[0][0] || "", name: teamRows[0][1] || "Squadra", id: teamRows[0][0] || "" }
    : { code: "OUR", name: "Squadra", id: "OUR" };
  const awayTeamMeta = teamRows[1]
    ? { code: teamRows[1][0] || "", name: teamRows[1][1] || "Avversaria", id: teamRows[1][0] || "" }
    : { code: "OPP", name: "Avversaria", id: "OPP" };
  const homePayload = parseDvwPlayersSection(sections.get("3PLAYERS-H") || [], homeTeamMeta, "our");
  const awayPayload = parseDvwPlayersSection(sections.get("3PLAYERS-V") || [], awayTeamMeta, "opponent");
  const attackCombinationDefs = parseDvwAttackCombinationDefinitions(dvwAttackCombinations);
  const setterCallDefs = parseDvwSetterCallDefinitions(dvwSetterCalls);
  const setStarts = buildDvwSetStarts(homePayload, awayPayload, scoutRows);
  const setResults = {};
  setRows.forEach((row, idx) => {
    const setNum = idx + 1;
    const finalScore = String(row[4] || "").trim();
    const scoreMatch = finalScore.match(/^(\d+)-(\d+)$/);
    if (!scoreMatch) return;
    setResults[setNum] = Number(scoreMatch[1]) > Number(scoreMatch[2]) ? "our" : "opponent";
  });
  const events = [];
  const playerIdByScopeAndName = {
    our: new Map((homePayload.playersDetailed || []).map(player => [player.name, player.id])),
    opponent: new Map((awayPayload.playersDetailed || []).map(player => [player.name, player.id]))
  };
  const lastSecondByScope = { our: null, opponent: null };
  const setContexts = new Map();
  let lastHomeCourt = setStarts[1] ? cloneDvCourt(setStarts[1].our.court || []) : makeImportedCourtFromNames([]);
  let lastAwayCourt = setStarts[1] ? cloneDvCourt(setStarts[1].opponent.court || []) : makeImportedCourtFromNames([]);
  let lastHomeRotation = setStarts[1] ? setStarts[1].our.rotation || 1 : 1;
  let lastAwayRotation = setStarts[1] ? setStarts[1].opponent.rotation || 1 : 1;
  scoutRows.forEach((line, idx) => {
    const cells = parseDvwRow(line);
    const rawCode = String(cells[0] || "").trim();
    const decoded = parseDvwSkillCode(rawCode);
    const setNum = parseInt(cells[8], 10) || 1;
    const homeRotation = parseInt(cells[9], 10) || lastHomeRotation || 1;
    const awayRotation = parseInt(cells[10], 10) || lastAwayRotation || 1;
    const homeLineupNums = cells.slice(14, 20);
    const awayLineupNums = cells.slice(20, 26);
    const homeLineup = homeLineupNums.map(num => homePayload.numberToName.get(padDv(num, 2)) || "");
    const awayLineup = awayLineupNums.map(num => awayPayload.numberToName.get(padDv(num, 2)) || "");
    if (homeLineup.some(Boolean)) lastHomeCourt = makeImportedCourtFromNames(homeLineup);
    if (awayLineup.some(Boolean)) lastAwayCourt = makeImportedCourtFromNames(awayLineup);
    lastHomeRotation = homeRotation;
    lastAwayRotation = awayRotation;
    if (!setStarts[setNum] && (homeLineup.some(Boolean) || awayLineup.some(Boolean))) {
      setStarts[setNum] = {
        our: { court: cloneDvCourt(lastHomeCourt), rotation: homeRotation },
        opponent: { court: cloneDvCourt(lastAwayCourt), rotation: awayRotation },
        swapCourt: false,
        isServing: /^[*]/.test(rawCode)
      };
    }
    let setContext = setContexts.get(setNum);
    if (!setContext) {
      setContext = {
        scoreOur: 0,
        scoreOpp: 0,
        pendingPointMarker: null,
        lastEventIndex: null
      };
      setContexts.set(setNum, setContext);
    }
    if (decoded.kind === "point-marker") {
      setContext.pendingPointMarker = decoded;
      return;
    }
    if (decoded.kind === "score") {
      const prevOur = setContext.scoreOur;
      const prevOpp = setContext.scoreOpp;
      setContext.scoreOur = decoded.scoreOur;
      setContext.scoreOpp = decoded.scoreOpp;
      const targetIndex = setContext.lastEventIndex;
      if (targetIndex !== null && events[targetIndex]) {
        const targetEvent = events[targetIndex];
        const deltaOur = decoded.scoreOur - prevOur;
        const deltaOpp = decoded.scoreOpp - prevOpp;
        let direction = null;
        if (deltaOur > deltaOpp && deltaOur > 0) {
          direction = "for";
        } else if (deltaOpp > deltaOur && deltaOpp > 0) {
          direction = "against";
        } else if (setContext.pendingPointMarker && setContext.pendingPointMarker.teamScope) {
          direction = setContext.pendingPointMarker.teamScope === "our" ? "for" : "against";
        } else if (decoded.teamScope) {
          direction = decoded.teamScope === "our" ? "for" : "against";
        }
        targetEvent.homeScore = decoded.scoreOur;
        targetEvent.visitorScore = decoded.scoreOpp;
        if (direction) {
          targetEvent.pointDirection = direction;
          targetEvent.value = Math.max(deltaOur, deltaOpp, 1);
          if (direction === "for" && targetEvent.team !== "our") {
            targetEvent.dv.rallyEndReason = "opponent-point";
          } else if (direction === "against" && targetEvent.team === "our") {
            targetEvent.dv.rallyEndReason = "opponent-point";
          }
        }
        if (setContext.pendingPointMarker) {
          const marker = setContext.pendingPointMarker;
          targetEvent.dv.rallyEndReason =
            marker.pointType === "H"
              ? marker.teamScope === getTeamScopeFromEvent(targetEvent)
                ? "team-point-marker"
                : "opponent-point-marker"
              : targetEvent.dv.rallyEndReason || "";
          if (!targetEvent.dv.specialCode && marker.evaluation) {
            targetEvent.dv.specialCode = marker.evaluation;
          }
        }
      }
      setContext.pendingPointMarker = null;
      setContext.lastEventIndex = null;
      return;
    }
    if (decoded.kind === "lineup" || decoded.kind === "rotation" || decoded.kind === "set-end" || decoded.kind === "unknown") {
      return;
    }
    if (decoded.kind === "timeout") {
      events.push({
        eventId: `dvw-${idx + 1}`,
        t: buildDvwTimestamp(matchInfo[0], cells[7]),
        set: setNum,
        rotation: decoded.teamScope === "opponent" ? awayRotation : homeRotation,
        playerIdx: null,
        playerId: null,
        playerName: decoded.teamScope === "opponent" ? "Timeout Avv." : "Timeout",
        skillId: "manual",
        code: decoded.teamScope === "opponent" ? "TOA" : "TO",
        value: 1,
        team: decoded.teamScope === "opponent" ? "opponent" : "our",
        teamName: decoded.teamScope === "opponent" ? awayPayload.name : homePayload.name,
        actionType: "timeout",
        playerIn: null,
        playerOut: null,
        homeScore: setContext.scoreOur,
        visitorScore: setContext.scoreOpp,
        videoTime: 0,
        dv: normalizeDataVolleyEventMeta({})
      });
      return;
    }
    if (decoded.kind === "substitution") {
      const scope = decoded.teamScope;
      const payload = scope === "opponent" ? awayPayload : homePayload;
      const playerIn = payload.numberToName.get(decoded.playerInNumber) || "";
      const playerOut = payload.numberToName.get(decoded.playerOutNumber) || "";
      if (scope === "opponent") {
        lastAwayCourt = applyDvSubstitution(lastAwayCourt, playerIn, playerOut);
      } else {
        lastHomeCourt = applyDvSubstitution(lastHomeCourt, playerIn, playerOut);
      }
      events.push({
        eventId: `dvw-${idx + 1}`,
        t: buildDvwTimestamp(matchInfo[0], cells[7]),
        set: setNum,
        rotation: scope === "opponent" ? awayRotation : homeRotation,
        playerIdx: null,
        playerId: null,
        playerName: playerIn || "Cambio",
        skillId: "manual",
        code: "CH",
        value: 1,
        team: scope === "opponent" ? "opponent" : "our",
        teamName: payload.name,
        actionType: "substitution",
        playerIn,
        playerOut,
        homeScore: setContext.scoreOur,
        visitorScore: setContext.scoreOpp,
        videoTime: 0,
        dv: normalizeDataVolleyEventMeta({})
      });
      return;
    }
    if (decoded.kind !== "skill") return;
    const scope = decoded.teamScope;
    const payload = scope === "opponent" ? awayPayload : homePayload;
    const players = payload.players || [];
    const playerName = payload.numberToName.get(decoded.playerNumber) || "";
    const playerIdx = players.indexOf(playerName);
    const skillMap = {
      S: "serve",
      R: "pass",
      A: "attack",
      B: "block",
      D: "defense",
      E: "second",
      F: "freeball"
    };
    const skillId = skillMap[decoded.skillLetter] || "manual";
    const zoneMeta = decoded.zoneMeta || parseDvwZoneMeta(decoded.zonePair);
    const startZoneNum = zoneMeta.startZone ? Number(zoneMeta.startZone) : null;
    const endZoneNum = zoneMeta.endZone ? Number(zoneMeta.endZone) : null;
    const suffix = String(decoded.suffix || "").trim().toUpperCase();
    const suffixMeta = parseDvwSuffixMeta(decoded.skillLetter, decoded.inlineCode, suffix);
    const dvMeta = {
      skillType: decoded.typeLetter,
      attackCode: decoded.skillLetter === "A" ? decoded.advancedCode : "",
      setCode: decoded.skillLetter === "E" ? decoded.advancedCode : "",
      setType: decodeDvwSetType(decoded.typeLetter) || "",
      skillSubtype: suffixMeta.skillSubtype,
      specialCode: suffixMeta.specialCode,
      startZone: zoneMeta.startZone || "",
      endZone: zoneMeta.endZone || "",
      endSubzone: zoneMeta.endSubzone || "",
      endCone: zoneMeta.endCone || "",
      numPlayersNumeric: Number.isFinite(suffixMeta.numPlayersNumeric) ? suffixMeta.numPlayersNumeric : null,
      rallyEndReason: ""
    };
    const event = {
      eventId: `dvw-${idx + 1}`,
      t: buildDvwTimestamp(matchInfo[0], cells[7]),
      durationMs: 0,
      clockMs: idx * 1000,
      set: setNum,
      rotation: scope === "opponent" ? awayRotation : homeRotation,
      courtSideSwapped: false,
      playerIdx: playerIdx >= 0 ? playerIdx : null,
      playerId: playerIdByScopeAndName[scope].get(playerName) || null,
      playerCodeOfficial: (() => {
        const player = (payload.playersDetailed || []).find(item => item && item.name === playerName);
        return player && player.codeOfficial ? player.codeOfficial : "";
      })(),
      playerNumberAtEvent: decoded.playerNumber,
      playerName: playerName || null,
      zone: startZoneNum,
      originZone: startZoneNum,
      skillId,
      code: decoded.evaluation,
      pointDirection: null,
      dvwScoreAuthoritative: true,
      value: 1,
      autoRotationDirection: null,
      autoRotateNext: null,
      setterPosition: scope === "opponent" ? awayRotation : homeRotation,
      opponentSetterPosition: scope === "opponent" ? homeRotation : awayRotation,
      playerPosition: startZoneNum,
      receivePosition: null,
      base: decoded.skillLetter === "E" ? decoded.advancedCode || null : null,
      setType: skillId === "attack" || skillId === "second" ? decodeDvwSetType(decoded.typeLetter) : null,
      combination: null,
      serveStart: null,
      serveEnd: null,
      serveType: skillId === "serve" ? decodeDvwServeType(decoded.typeLetter) : null,
      receiveEvaluation: null,
      attackEvaluation: null,
      attackBp: null,
      attackType: decoded.skillLetter === "A" ? (decoded.advancedCode || null) : null,
      attackStartZone: startZoneNum,
      attackEndZone: endZoneNum,
      attackStart: null,
      attackEnd: null,
      attackDirection: null,
      blockNumber: skillId === "block" && Number.isFinite(suffixMeta.numPlayersNumeric) ? suffixMeta.numPlayersNumeric : null,
      errorType: null,
      playerIn: null,
      playerOut: null,
      relatedEvents: [],
      team: scope === "opponent" ? "opponent" : "our",
      teamName: payload.name,
      teamCodeOfficial: payload.officialCode || "",
      teamIdOfficial: payload.officialId || "",
      homeScore: setContext.scoreOur,
      visitorScore: setContext.scoreOpp,
      actionType: null,
      prevSet: null,
      nextSet: null,
      prevMatchFinished: null,
      nextMatchFinished: null,
      prevClock: null,
      nextClock: null,
      prevVideoClock: null,
      nextVideoClock: null,
      videoTime: 0,
      dv: normalizeDataVolleyEventMeta(dvMeta)
    };
    if (skillId === "attack" && decoded.advancedCode) {
      const combo = attackCombinationDefs.get(decoded.advancedCode);
      if (combo) {
        event.combination = {
          code: combo.code,
          label: combo.label,
          setType: combo.setType || "",
          set_type: combo.setType || ""
        };
        if (!event.setType && combo.setType) {
          event.setType = combo.setType;
        }
      }
    }
    if (skillId === "second" && decoded.advancedCode) {
      const setterCall = setterCallDefs.get(decoded.advancedCode);
      if (setterCall) {
        event.combination = {
          code: setterCall.code,
          label: setterCall.label
        };
      }
    }
    if (skillId === "attack" && startZoneNum) {
      const start = buildDvwZonePoint(startZoneNum, "start", decoded.advancedCode);
      const end = endZoneNum ? buildDvwZonePoint(endZoneNum, "end", decoded.advancedCode) : null;
      event.attackStart = start;
      event.attackEnd = end;
      if (start && end) {
        event.attackDirection = {
          start,
          end,
          startZone: startZoneNum,
          endZone: endZoneNum,
          directionDeg: computeAttackDirectionDeg(start, end)
        };
        event.attackTrajectory = event.attackDirection;
      }
    }
    if (skillId === "serve" && startZoneNum) {
      event.serveStart = buildDvwZonePoint(startZoneNum, "start");
      event.serveEnd = endZoneNum ? buildDvwZonePoint(endZoneNum, "end") : null;
    }
    if (skillId === "second") {
      lastSecondByScope[scope] = event;
    } else if (skillId === "attack" && lastSecondByScope[scope]) {
      event.relatedEvents = [lastSecondByScope[scope].eventId];
      event.setterIdx = lastSecondByScope[scope].playerIdx;
    }
    event.dv.rawCode = rawCode;
    event.dv.rawCodeSignature = computeDataVolleyEventSignature(event);
    setContext.lastEventIndex = events.length;
    events.push(event);
  });
  const playedSetNumbers = Array.from(new Set(events.map(ev => parseInt(ev.set, 10)).filter(Boolean))).sort((a, b) => a - b);
  const currentSet = playedSetNumbers.length ? playedSetNumbers[playedSetNumbers.length - 1] : 1;
  let currentIsServing = false;
  events.forEach(event => {
    if (!event || (parseInt(event.set, 10) || 1) !== currentSet) return;
    if (event.skillId === "serve") {
      currentIsServing = getTeamScopeFromEvent(event) === "our";
    }
    if (event.pointDirection === "for") currentIsServing = true;
    if (event.pointDirection === "against") currentIsServing = false;
  });
  const homeTeamPayload = buildImportedTeamPayloadFromDvw(homePayload);
  const awayTeamPayload = buildImportedTeamPayloadFromDvw(awayPayload);
  const savedTeams = {};
  if (homeTeamPayload && homeTeamPayload.name) savedTeams[homeTeamPayload.name] = homeTeamPayload;
  if (awayTeamPayload && awayTeamPayload.name) savedTeams[awayTeamPayload.name] = awayTeamPayload;
  return {
    match: {
      opponent: awayPayload.name,
      category: matchInfo[3] || "",
      date: buildDvwImportDateIso(matchInfo[0]),
      notes: "",
      leg: "",
      matchType: matchInfo[4] || "",
      teamName: homePayload.name,
      dvwAttackCombinations,
      dvwSetterCalls,
      dvwWinningSymbols,
      dvwReserve,
      dvwVideo
    },
    players: homePayload.players,
    playerNumbers: homePayload.numbers,
    captains: homePayload.captains,
    liberos: homePayload.liberos,
    opponentPlayers: awayPayload.players,
    opponentPlayerNumbers: awayPayload.numbers,
    opponentLiberos: awayPayload.liberos,
    opponentCaptains: awayPayload.captains,
    selectedTeam: homePayload.name,
    selectedOpponentTeam: awayPayload.name,
    useOpponentTeam: true,
    setStarts,
    setResults,
    currentSet,
    rotation: Math.min(6, Math.max(1, lastHomeRotation || 1)),
    opponentRotation: Math.min(6, Math.max(1, lastAwayRotation || 1)),
    court: cloneDvCourt(lastHomeCourt),
    opponentCourt: cloneDvCourt(lastAwayCourt),
    isServing: currentIsServing,
    autoRotatePending: !currentIsServing,
    opponentAutoRotatePending: currentIsServing,
    matchFinished: !!setResults[currentSet],
    events,
    savedTeams,
    savedOpponentTeams: savedTeams,
    stats: {},
    scoreOverrides: {},
    metricsConfig: state.metricsConfig || {},
    pointRules: state.pointRules || {},
    video: { offsetSeconds: 0, fileName: "", youtubeId: "", youtubeUrl: "", lastPlaybackSeconds: 0 }
  };
}
