/**
 * Utilities used at persistence/domain boundaries.
 * Every value crossing one of these boundaries must be detached from live state.
 */
(function attachStateIsolation(root) {
  function cloneData(value) {
    if (value === undefined || value === null) return value;
    if (typeof root.structuredClone === "function") {
      try {
        return root.structuredClone(value);
      } catch (_) {
        // The persisted VolleyEye models are JSON-safe; use the compatible fallback below.
      }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function cloneRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return {};
    return cloneData(record);
  }

  function sameNormalizedList(left, right) {
    const a = Array.isArray(left) ? left : [];
    const b = Array.isArray(right) ? right : [];
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }

  function sanitizeRosterScope(state, scope = "our") {
    if (!state || typeof state !== "object") return state;
    const opponent = scope === "opponent";
    const keys = opponent
      ? {
          players: "opponentPlayers",
          numbers: "opponentPlayerNumbers",
          liberos: "opponentLiberos",
          captains: "opponentCaptains",
          preferred: "opponentPreferredLibero",
          court: "opponentCourt",
          autoCourt: "opponentAutoRoleBaseCourt",
          liberoMap: "opponentLiberoAutoMap"
        }
      : {
          players: "players",
          numbers: "playerNumbers",
          liberos: "liberos",
          captains: "captains",
          preferred: "preferredLibero",
          court: "court",
          autoCourt: "autoRoleBaseCourt",
          liberoMap: "liberoAutoMap"
        };
    const seenPlayerKeys = new Set();
    const players = (Array.isArray(state[keys.players]) ? state[keys.players] : []).reduce(
      (result, name) => {
        if (typeof name !== "string") return result;
        const clean = name.trim().replace(/\s+/g, " ");
        const key = clean.toLowerCase();
        if (!clean || seenPlayerKeys.has(key)) return result;
        seenPlayerKeys.add(key);
        result.push(clean);
        return result;
      },
      []
    );
    const valid = new Set(players);
    const canonicalByKey = new Map(players.map(name => [name.toLowerCase(), name]));
    const resolveName = value => {
      if (typeof value !== "string") return "";
      return canonicalByKey.get(value.trim().replace(/\s+/g, " ").toLowerCase()) || "";
    };
    const numbers = state[keys.numbers] && typeof state[keys.numbers] === "object" ? state[keys.numbers] : {};
    const numbersByKey = new Map(
      Object.entries(numbers).map(([name, number]) => [
        String(name || "").trim().replace(/\s+/g, " ").toLowerCase(),
        number
      ])
    );
    const cleanNumbers = {};
    players.forEach(name => {
      if (numbersByKey.has(name.toLowerCase())) cleanNumbers[name] = numbersByKey.get(name.toLowerCase());
    });
    const liberos = Array.from(
      new Set(
        (Array.isArray(state[keys.liberos]) ? state[keys.liberos] : [])
          .map(resolveName)
          .filter(Boolean)
      )
    );
    const captains = (Array.isArray(state[keys.captains]) ? state[keys.captains] : [])
      .map(resolveName)
      .filter((name, index, list) => name && list.indexOf(name) === index)
      .slice(0, 1);
    const sanitizeCourt = source => {
      const rawCourt = Array.isArray(source) ? source : [];
      const assigned = new Set();
      return Array.from({ length: 6 }, (_, index) => {
        const raw = rawCourt[index];
        const main = typeof raw === "string" ? raw : raw && raw.main;
        const replaced = raw && typeof raw === "object" ? raw.replaced : "";
        const resolvedMain = resolveName(main);
        const resolvedReplaced = resolveName(replaced);
        const cleanMain = valid.has(resolvedMain) && !assigned.has(resolvedMain) ? resolvedMain : "";
        if (cleanMain) assigned.add(cleanMain);
        const cleanReplaced =
          cleanMain &&
          liberos.includes(cleanMain) &&
          valid.has(resolvedReplaced) &&
          resolvedReplaced !== cleanMain &&
          !assigned.has(resolvedReplaced)
            ? resolvedReplaced
            : "";
        if (cleanReplaced) assigned.add(cleanReplaced);
        return {
          main: cleanMain,
          replaced: cleanReplaced
        };
      });
    };
    const court = sanitizeCourt(state[keys.court]);
    const cleanMap = {};
    Object.entries(state[keys.liberoMap] || {}).forEach(([replaced, libero]) => {
      const cleanReplaced = resolveName(replaced);
      const cleanLibero = resolveName(libero);
      if (cleanReplaced !== cleanLibero && valid.has(cleanReplaced) && liberos.includes(cleanLibero)) {
        cleanMap[cleanReplaced] = cleanLibero;
      }
    });
    state[keys.players] = players;
    state[keys.numbers] = cleanNumbers;
    state[keys.liberos] = liberos;
    state[keys.captains] = captains;
    const preferred = resolveName(state[keys.preferred]);
    state[keys.preferred] = liberos.includes(preferred) ? preferred : liberos[0] || "";
    state[keys.court] = court;
    state[keys.autoCourt] =
      Array.isArray(state[keys.autoCourt]) && state[keys.autoCourt].length > 0
        ? sanitizeCourt(state[keys.autoCourt])
        : [];
    state[keys.liberoMap] = cleanMap;
    return state;
  }

  root.VolleyEye.stateIsolation = Object.freeze({
    cloneData,
    cloneRecord,
    sameNormalizedList,
    sanitizeRosterScope
  });
})(typeof window !== "undefined" ? window : self);
