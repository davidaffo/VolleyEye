

export function normalizeThemePreference(theme) {
  return theme === "light" ? "light" : "dark";
}

export function normalizeVideoFilterPresets(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry, idx) => {
      if (!entry || typeof entry !== "object") return null;
      const id = String(entry.id || ("preset_" + idx + "_" + Date.now()));
      const name = String(entry.name || "").trim() || ("Preset " + (idx + 1));
      const filters = entry.filters && typeof entry.filters === "object" ? entry.filters : {};
      return { id, name, filters };
    })
    .filter(Boolean);
}

export function getSnapshotTimestamp(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return 0;
  const ts = Number(snapshot.lastSavedAt || 0);
  return Number.isFinite(ts) ? ts : 0;
}

export function buildLocalUiSnapshot(snapshot) {
  const keys = ["theme", "selectedMatch", "loadedMatchName", "selectedTeam", "selectedOpponentTeam",
    "uiActiveTab", "uiMatchSessionActive", "uiAggTab", "uiTopBarHidden", "forceMobileLayout",
    "uiScoutColumns", "uiScoutWidgetLayout", "uiVideoLayout", "uiVideoAnalysisSort"];
  const result = { __uiOnly: true, lastSavedAt: Number(snapshot.lastSavedAt || Date.now()) };
  keys.forEach(key => { if (snapshot[key] !== undefined) result[key] = snapshot[key]; });
  return result;
}
