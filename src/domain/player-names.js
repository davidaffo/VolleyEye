
export function normalizePlayers(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const names = [];
  list.forEach(name => {
    const clean = (name || "").trim().replace(/\s+/g, " ");
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      names.push(clean);
    }
  });
  return names;
}

export function normalizeNumbersMap(map = {}) {
  const normalized = {};
  Object.entries(map || {}).forEach(([key, value]) => {
    const cleanKey = (key || "").trim().replace(/\s+/g, " ");
    if (!cleanKey) return;
    normalized[cleanKey] = value;
  });
  return normalized;
}

export function normalizePlayerNameCase(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "";
  const capitalize = chunk => {
    if (!chunk) return "";
    const lower = chunk.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };
  return trimmed
    .split(/\s+/)
    .map(part =>
      part
        .split(/([-'’])/)
        .map(token => {
          if (token === "-" || token === "'" || token === "’") return token;
          return capitalize(token);
        })
        .join("")
    )
    .join(" ");
}

export function buildFullName(lastName = "", firstName = "") {
  return [lastName, firstName].map(s => (s || "").trim()).filter(Boolean).join(" ").trim();
}

export function enforceSingleCaptainFlag(players, preferredName = "") {
  if (!Array.isArray(players)) return [];
  let chosenIdx = -1;
  const preferred = (preferredName || "").toLowerCase();
  if (preferred) {
    players.forEach((player, idx) => {
      if (!player || !player.name) return;
      if (player.name.toLowerCase() === preferred && chosenIdx === -1) {
        chosenIdx = idx;
      }
    });
  }
  if (chosenIdx === -1) {
    players.forEach((player, idx) => {
      if (player && player.isCaptain && chosenIdx === -1) {
        chosenIdx = idx;
      }
    });
  }
  players.forEach((player, idx) => {
    if (!player) return;
    player.isCaptain = idx === chosenIdx && chosenIdx !== -1;
  });
  return players;
}

export function stripCourtReplacements(court) {
  return (court || []).map(slot => ({ main: typeof slot === 'string' ? slot : (slot && slot.main) || '', replaced: '' }));
}
