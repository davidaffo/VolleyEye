import { normalizePlayerNameCase, normalizePlayers, buildFullName, enforceSingleCaptainFlag } from "../../../domain/player-names.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { isTemplatePlayerName, findPlayersDbMatchByName, findPlayersDbMatchByFullName, generatePlayerId } from "../storage/team-repository.js";

export function parseCamp3RosterText(text) {
  if (!text || typeof text !== "string") return [];
  const beforeStaff = text.split(/\bQualifica\b/i)[0] || text;
  const lines = beforeStaff.split(/\r?\n/).map(line => line.replace(/\u00a0/g, " "));
  const players = [];
  const seenNumbers = new Set();
  const flagPattern = /^(K|L|L1|L2)$/i;
  lines.forEach(rawLine => {
    const dateMatch = rawLine.match(/\b\d{2}[/. -]\d{2}[/. -]\d{4}\b/);
    if (!dateMatch) return;
    const beforeDate = rawLine.slice(0, dateMatch.index).trim();
    const numberMatch = beforeDate.match(/^\s*(\d{1,3})\s+(.+)$/);
    if (!numberMatch) return;
    const number = numberMatch[1];
    if (seenNumbers.has(number)) return;
    let namePart = numberMatch[2].trim();
    let isCaptain = false;
    let isLibero = false;
    const spacedGroups = namePart.split(/\s{2,}/).map(part => part.trim()).filter(Boolean);
    let groups = spacedGroups.length >= 2 ? spacedGroups : namePart.split(/\s+/).filter(Boolean);
    while (groups.length > 0 && flagPattern.test(groups[groups.length - 1])) {
      const flag = groups.pop().toUpperCase();
      if (flag === "K") isCaptain = true;
      if (flag.startsWith("L")) isLibero = true;
    }
    if (groups.length < 2) return;
    const lastName = normalizePlayerNameCase(groups[0]);
    const firstName = normalizePlayerNameCase(groups.slice(1).join(" "));
    const cleanName = normalizePlayers([normalizePlayerNameCase(buildFullName(lastName, firstName))])[0];
    if (!cleanName) return;
    seenNumbers.add(number);
    players.push({
      number,
      name: cleanName,
      lastName,
      firstName,
      role: isLibero ? "L" : "",
      isCaptain
    });
  });
  return players;
}

export function findCamp3PlayerMatch(camp3Player, currentPlayers) {
  const wanted = (camp3Player.name || "").trim().toLowerCase();
  if (!wanted) return null;
  const exact = currentPlayers.find(player => (player.name || "").trim().toLowerCase() === wanted);
  if (exact) return exact;
  return currentPlayers.find(player => {
    return (
      String(player.lastName || "").trim().toLowerCase() === String(camp3Player.lastName || "").trim().toLowerCase() &&
      String(player.firstName || "").trim().toLowerCase() === String(camp3Player.firstName || "").trim().toLowerCase()
    );
  }) || null;
}

export function getCamp3ImportCurrentPlayers() {
  return (rosterLineupState.teamManagerState && rosterLineupState.teamManagerState.players ? rosterLineupState.teamManagerState.players : []).filter(player => {
    const name = player && (player.name || buildFullName(player.lastName, player.firstName));
    return !(isTemplatePlayerName(name));
  });
}

export function createCamp3ReviewDraft(camp3Players) {
  const currentPlayers = getCamp3ImportCurrentPlayers();
  const matchedIds = new Set();
  const rows = (camp3Players || []).map((player, idx) => {
    const match = findCamp3PlayerMatch(player, currentPlayers.filter(entry => !matchedIds.has(entry.id)));
    if (match && match.id) matchedIds.add(match.id);
    return {
      id: `camp3_${Date.now()}_${idx}`,
      enabled: true,
      matchId: match && match.id ? match.id : "",
      number: player.number || "",
      lastName: String(player.lastName || "").trim() || (!player.firstName ? String(player.name || "").trim() : ""),
      firstName: String(player.firstName || "").trim(),
      role: player.role === "L" ? "L" : "",
      isCaptain: !!player.isCaptain
    };
  });
  const outRows = currentPlayers
    .filter(player => player && player.id && !matchedIds.has(player.id) && !player.out)
    .map((player, idx) => ({
      id: `camp3_out_${Date.now()}_${idx}`,
      enabled: true,
      playerId: player.id,
      name: player.name || buildFullName(player.lastName, player.firstName)
    }));
  return { rows, outRows };
}

export function getCamp3RowKind(row) {
  if (!row || !row.matchId) return "added";
  const current = getCamp3ImportCurrentPlayers().find(player => player && player.id === row.matchId);
  if (!current) return "added";
  const nextName = normalizePlayers([normalizePlayerNameCase(buildFullName(row.lastName, row.firstName))])[0] || "";
  const currentName = normalizePlayers([
    normalizePlayerNameCase(current.name || buildFullName(current.lastName, current.firstName))
  ])[0] || "";
  const nextNumber = String(row.number || "").trim();
  const currentNumber = String(current.number || "").trim();
  const nextRole = row.role === "L" ? "L" : "";
  const currentRole = current.role === "L" ? "L" : "";
  const nextCaptain = !!row.isCaptain;
  const currentCaptain = !!current.isCaptain;
  return (
    nextName !== currentName ||
    nextNumber !== currentNumber ||
    nextRole !== currentRole ||
    nextCaptain !== currentCaptain ||
    !!current.out
  )
    ? "modified"
    : "unchanged";
}

export function buildCamp3ImportPlanFromDraft(draft) {
  if (!rosterLineupState.teamManagerState || !draft) return null;
  const currentPlayers = getCamp3ImportCurrentPlayers();
  const recognizedIds = new Set();
  const changes = {
    added: [],
    numberUpdated: [],
    restored: [],
    out: [],
    liberos: [],
    captains: []
  };
  const nextPlayers = currentPlayers.map(player => Object.assign({}, player));
  const enabledRows = (draft.rows || []).filter(row => row && row.enabled);
  enabledRows.forEach(row => {
    const cleanNumber = String(row.number || "").trim();
    const fullName = normalizePlayers([normalizePlayerNameCase(buildFullName(row.lastName, row.firstName))])[0];
    if (!fullName) return;
    const camp3Player = {
      number: /^[0-9]{1,3}$/.test(cleanNumber) ? cleanNumber : "",
      name: fullName,
      lastName: normalizePlayerNameCase(row.lastName || ""),
      firstName: normalizePlayerNameCase(row.firstName || ""),
      role: row.role === "L" ? "L" : "",
      isCaptain: !!row.isCaptain
    };
    let target = row.matchId ? nextPlayers.find(player => player.id === row.matchId) : null;
    if (!target) {
      target = findCamp3PlayerMatch(camp3Player, nextPlayers);
    }
    let isNewPlayer = false;
    if (!target) {
      const dbMatch =
        findPlayersDbMatchByName(camp3Player.firstName, camp3Player.lastName) ||
        findPlayersDbMatchByFullName(camp3Player.name);
      target = {
        id: dbMatch && dbMatch.id ? dbMatch.id : generatePlayerId(),
        name: camp3Player.name,
        firstName: camp3Player.firstName,
        lastName: camp3Player.lastName,
        codeOfficial: "",
        photo: dbMatch && typeof dbMatch.photo === "string" ? dbMatch.photo : "",
        number: "",
        role: "",
        isCaptain: false,
        out: false
      };
      nextPlayers.push(target);
      changes.added.push(`${camp3Player.number} ${camp3Player.name}`);
      isNewPlayer = true;
    }
    if (target.id) recognizedIds.add(target.id);
    if (!isNewPlayer && String(target.number || "") !== String(camp3Player.number || "")) {
      changes.numberUpdated.push(
        `${target.name || camp3Player.name}: ${target.number || "senza numero"} -> ${camp3Player.number}`
      );
    }
    target.number = camp3Player.number;
    if (target.out) {
      changes.restored.push(target.name || camp3Player.name);
      target.out = false;
    }
    if (camp3Player.role === "L" && target.role !== "L") {
      changes.liberos.push(target.name || camp3Player.name);
    }
    target.role = camp3Player.role === "L" ? "L" : "";
    if (camp3Player.isCaptain && !target.isCaptain) {
      changes.captains.push(target.name || camp3Player.name);
    }
    target.isCaptain = !!camp3Player.isCaptain;
    target.name = camp3Player.name;
    target.firstName = camp3Player.firstName;
    target.lastName = camp3Player.lastName;
  });
  (draft.outRows || []).filter(row => row && row.enabled).forEach(row => {
    const player = nextPlayers.find(entry => entry && entry.id === row.playerId);
    if (!player || player.out) return;
    player.out = true;
    changes.out.push(player.name || buildFullName(player.lastName, player.firstName));
  });
  const captainName = enabledRows.find(row => row.isCaptain)
    ? normalizePlayerNameCase(
        buildFullName(
          enabledRows.find(row => row.isCaptain).lastName,
          enabledRows.find(row => row.isCaptain).firstName
        )
      )
    : "";
  enforceSingleCaptainFlag(nextPlayers, captainName);
  return { nextPlayers, changes };
}

export function formatCamp3ImportPreview(changes) {
  const lines = ["Modifiche riconosciute dal CAMP3:"];
  const append = (title, list) => {
    if (!list || list.length === 0) return;
    lines.push("");
    lines.push(title + ":");
    list.slice(0, 20).forEach(item => lines.push("- " + item));
    if (list.length > 20) lines.push("- ... altre " + (list.length - 20));
  };
  append("Aggiunte", changes.added);
  append("Numeri aggiornati", changes.numberUpdated);
  append("Rimesse in rosa", changes.restored);
  append("Fuori rosa", changes.out);
  append("Liberi riconosciuti", changes.liberos);
  append("Capitana riconosciuta", changes.captains);
  if (lines.length === 1) {
    lines.push("");
    lines.push("Nessuna modifica necessaria.");
  } else {
    lines.push("");
    lines.push("Applicare queste modifiche alla tabella squadra?");
  }
  return lines.join("\n");
}
