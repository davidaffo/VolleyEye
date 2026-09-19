function isTeamManagerPasteTarget() {
  return (
    typeof elTeamManagerModal !== "undefined" &&
    elTeamManagerModal &&
    !elTeamManagerModal.classList.contains("hidden") &&
    typeof teamManagerState !== "undefined" &&
    !!teamManagerState
  );
}
function applyPlayersToTeamManagerDraft(names, numbers, liberos, mode = "append", playersDetailed = []) {
  if (!isTeamManagerPasteTarget()) return false;
  const normalizedNames = normalizePlayers(names || []);
  const numberMap = numbers && typeof numbers === "object" ? numbers : {};
  const liberoSet = new Set(normalizePlayers(liberos || []));
  const existing = Array.isArray(teamManagerState.players) ? teamManagerState.players : [];
  const existingByName = new Map(
    existing.map(player => [String(player.name || "").trim().toLowerCase(), player])
  );
  const importedByName = new Map(
    (playersDetailed || []).map(player => [String(player.name || "").trim().toLowerCase(), player])
  );
  const buildPlayer = name => {
    const previous = existingByName.get(name.toLowerCase()) || null;
    const dbEntry =
      (typeof findPlayersDbMatchByFullName === "function" && findPlayersDbMatchByFullName(name)) ||
      null;
    const imported = importedByName.get(name.toLowerCase()) || null;
    const firstName = String(
      (imported && imported.firstName) || (previous && previous.firstName) || (dbEntry && dbEntry.firstName) || ""
    ).trim();
    const lastName = String(
      (imported && imported.lastName) || (previous && previous.lastName) || (dbEntry && dbEntry.lastName) || ""
    ).trim() || (!firstName ? name : "");
    const hasImportedNumber = Object.prototype.hasOwnProperty.call(numberMap, name);
    return Object.assign({}, previous || {}, {
      id:
        (previous && isValidPlayerId(previous.id) && previous.id) ||
        (dbEntry && isValidPlayerId(dbEntry.id) && dbEntry.id) ||
        generatePlayerId(),
      name,
      firstName,
      lastName,
      number: hasImportedNumber
        ? String(numberMap[name])
        : previous && previous.number
          ? String(previous.number)
          : "",
      role: liberoSet.has(name) ? "L" : mode === "append" && previous?.role === "L" ? "L" : "",
      isCaptain: !!(previous && previous.isCaptain),
      out: false,
      photo:
        previous && typeof previous.photo === "string"
          ? previous.photo
          : dbEntry && typeof dbEntry.photo === "string"
            ? dbEntry.photo
            : ""
    });
  };
  let nextPlayers;
  if (mode === "replace") {
    const ok = confirm(
      "Sostituire tutte le giocatrici della squadra in modifica con l'elenco incollato?"
    );
    if (!ok) return false;
    nextPlayers = normalizedNames.map(buildPlayer);
  } else {
    nextPlayers = existing.slice();
    normalizedNames.forEach(name => {
      const idx = nextPlayers.findIndex(
        player => String(player.name || "").trim().toLowerCase() === name.toLowerCase()
      );
      const player = buildPlayer(name);
      if (idx >= 0) nextPlayers[idx] = player;
      else nextPlayers.push(player);
    });
  }
  teamManagerState.players = nextPlayers;
  const validLineupNames = new Set(
    nextPlayers.filter(player => !player.out && player.role !== "L").map(player => player.name)
  );
  teamManagerState.defaultLineup = normalizePlayers(teamManagerState.defaultLineup || []).filter(name =>
    validLineupNames.has(name)
  );
  const nextLiberos = nextPlayers
    .filter(player => !player.out && player.role === "L")
    .map(player => player.name);
  if (!nextLiberos.includes(teamManagerState.preferredLibero)) {
    teamManagerState.preferredLibero = nextLiberos[0] || "";
  }
  renderTeamManagerTable();
  return true;
}
function applyPlayersFromTextarea(options = {}) {
  if (!elPlayersInput) return false;
  const { mode = "append" } = options;
  const raw = elPlayersInput.value;
  const parsed = parseDelimitedTeamText(raw);
  const currentPlayers = normalizePlayers(state.players || []);
  const appendPlayers = parsed && parsed.players && parsed.players.length > 0
    ? normalizePlayers(parsed.players)
    : raw
        .split("\n")
        .map(l => {
          const trimmed = l.trim();
          if (!trimmed) return "";
          if (typeof normalizePlayerNameCase === "function") {
            return normalizePlayerNameCase(trimmed);
          }
          return trimmed;
        })
        .filter(l => l.length > 0);
  if (appendPlayers.length === 0) {
    alert("Nessuna giocatrice valida trovata.");
    return false;
  }
  const dbMatchResult = (() => {
    if (
      !Array.isArray(appendPlayers) ||
      appendPlayers.length === 0 ||
      typeof findPlayersDbMatchByName !== "function" ||
      typeof findPlayersDbMatchByFullName !== "function"
    ) {
      return { players: appendPlayers, numbers: parsed?.numbers || null, liberos: parsed?.liberos || null };
    }
    const replacements = new Map();
    let matchCount = 0;
    appendPlayers.forEach(name => {
      const match = findPlayersDbMatchByFullName(name);
      if (match && match.name) {
        matchCount += 1;
        const mapped = String(match.name || "").trim();
        if (mapped && mapped !== name) {
          replacements.set(name, mapped);
        }
      }
    });
    if (!matchCount) {
      return { players: appendPlayers, numbers: parsed?.numbers || null, liberos: parsed?.liberos || null };
    }
    const ok = confirm(
      "Trovate " + matchCount + " giocatrici già in archivio. Vuoi usare i dati dell'archivio?"
    );
    if (!ok) {
      return { players: appendPlayers, numbers: parsed?.numbers || null, liberos: parsed?.liberos || null };
    }
    const mappedPlayers = appendPlayers.map(name => replacements.get(name) || name);
    let mappedNumbers = parsed?.numbers || null;
    if (parsed && parsed.numbers && typeof parsed.numbers === "object") {
      mappedNumbers = {};
      Object.entries(parsed.numbers).forEach(([name, value]) => {
        const nextName = replacements.get(name) || name;
        if (value !== undefined && value !== null && value !== "") {
          if (mappedNumbers[nextName] === undefined) mappedNumbers[nextName] = value;
        }
      });
    }
    let mappedLiberos = parsed?.liberos || null;
    if (Array.isArray(parsed?.liberos)) {
      mappedLiberos = parsed.liberos.map(name => replacements.get(name) || name);
    }
    return { players: mappedPlayers, numbers: mappedNumbers, liberos: mappedLiberos };
  })();
  const appendPlayersFinal = normalizePlayers(dbMatchResult.players);
  const isReplace = mode === "replace";
  if (isTeamManagerPasteTarget()) {
    return applyPlayersToTeamManagerDraft(
      appendPlayersFinal,
      dbMatchResult.numbers || {},
      dbMatchResult.liberos || [],
      mode,
      parsed?.playersDetailed || []
    );
  }
  if (isReplace) {
    const ok = confirm(
      "Sostituire tutta la squadra con l'elenco incollato?\nVerranno rimossi roster, liberi e numeri attuali."
    );
    if (!ok) return false;
    const applied = updatePlayersList(appendPlayersFinal, {
      askReset: true,
      preserveCourt: false,
      liberos: dbMatchResult.liberos || [],
      playerNumbers: dbMatchResult.numbers || {}
    });
    if (applied === false) return false;
    if (typeof refreshTeamManagerPlayersFromState === "function") {
      refreshTeamManagerPlayersFromState();
    }
    return true;
  }
  const mergedPlayers = currentPlayers.concat(
    appendPlayersFinal.filter(name => !currentPlayers.some(p => p.toLowerCase() === name.toLowerCase()))
  );
  if (mergedPlayers.length === 0) {
    alert("Nessuna giocatrice valida trovata.");
    return false;
  }
  if (parsed && parsed.players && parsed.players.length > 0) {
    const applied = updatePlayersList(mergedPlayers, {
      askReset: true,
      preserveCourt: true,
      liberos: [...new Set([...(state.liberos || []), ...(dbMatchResult.liberos || [])])],
      playerNumbers: Object.assign({}, state.playerNumbers || {}, dbMatchResult.numbers || {})
    });
    if (applied === false) return false;
    if (typeof refreshTeamManagerPlayersFromState === "function") {
      refreshTeamManagerPlayersFromState();
    }
    return true;
  }
  const applied = updatePlayersList(mergedPlayers, { askReset: true, preserveCourt: true });
  if (applied === false) return false;
  if (typeof refreshTeamManagerPlayersFromState === "function") {
    refreshTeamManagerPlayersFromState();
  }
  return true;
}
