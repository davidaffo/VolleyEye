import {
  normalizeTeamPayload,
  isTemplatePlayerName,
} from "../teams/storage/team-repository.js";
import { buildFullName } from "../../domain/player-names.js";

export function buildPlayersDbUsage(teamsMap) {
  const usage = {};
  Object.entries(teamsMap || {}).forEach(([teamName, teamData]) => {
    const normalized = normalizeTeamPayload(teamData, teamName);
    const roster =
      normalized && Array.isArray(normalized.playersDetailed)
        ? normalized.playersDetailed
        : [];
    roster.forEach((player) => {
      const id = player && (player.id || player.playerId);
      if (!id) return;
      if (!usage[id]) usage[id] = [];
      usage[id].push(teamName);
    });
  });
  Object.keys(usage).forEach((id) => {
    usage[id] = usage[id]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
  });
  return usage;
}

function buildPlayersDbOptions(entries) {
  return (entries || []).map((entry) => {
    const name =
      entry.name ||
      buildFullName(entry.lastName, entry.firstName) ||
      [entry.lastName, entry.firstName].filter(Boolean).join(" ");
    const label = (name || "Giocatrice") + " · " + entry.id;
    return { id: entry.id, label };
  });
}

export function buildPlayersDbView(db, teamsMap) {
  const usage = buildPlayersDbUsage(teamsMap);
  const entries = Object.values(db || {}).filter(
    (entry) => entry?.id && !isTemplatePlayerName(entry.name),
  );
  entries.sort((a, b) => {
    const lastA = (a.lastName || "").trim(),
      lastB = (b.lastName || "").trim(),
      firstA = (a.firstName || "").trim(),
      firstB = (b.firstName || "").trim();
    if (lastA && lastB && lastA !== lastB)
      return lastA.localeCompare(lastB, "it", { sensitivity: "base" });
    if (firstA && firstB && firstA !== firstB)
      return firstA.localeCompare(firstB, "it", { sensitivity: "base" });
    return (a.name || "")
      .trim()
      .localeCompare((b.name || "").trim(), "it", { sensitivity: "base" });
  });
  const options = Object.freeze(
    buildPlayersDbOptions(entries).map((option) => Object.freeze(option)),
  );
  const orphans = entries.filter((entry) => !usage[entry.id]?.length).length;
  return Object.freeze({
    entries: Object.freeze(
      entries.map((entry) =>
        Object.freeze({
          id: entry.id,
          lastName: entry.lastName || "",
          firstName: entry.firstName || "",
          photo: entry.photo || "",
          teams: (usage[entry.id] || []).join(", ") || "—",
        }),
      ),
    ),
    options,
    primaryId: options[0]?.id || "",
    secondaryId: options[1]?.id || options[0]?.id || "",
    countLabel:
      entries.length +
      " giocatrici" +
      (orphans ? " · " + orphans + " senza squadra" : ""),
  });
}
