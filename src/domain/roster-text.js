import { normalizePlayers, buildFullName, normalizePlayerNameCase } from "./player-names.js";

export function parseDelimitedTeamText(text) {
  if (!text || typeof text !== "string") return null;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const players = [];
  const playersDetailed = [];
  const numbers = {};
  const liberos = [];
  lines.forEach(rawLine => {
    let name = "";
    let number = "";
    let liberoFlag = "";
    let lastName = "";
    let firstName = "";
    const parts = rawLine.split(/[\t;,]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const isNumberFirst = /^[0-9]{1,3}$/.test(parts[0]);
      const isNumberSecond = /^[0-9]{1,3}$/.test(parts[1]);
      if (isNumberFirst && !isNumberSecond) {
        number = parts[0];
        let tail = parts.slice(1);
        const lastPart = tail[tail.length - 1] || "";
        if (lastPart && lastPart.toLowerCase() === "l") {
          liberoFlag = lastPart;
          tail = tail.slice(0, -1);
        }
        lastName = tail[0] || "";
        firstName = tail.slice(1).join(" ").trim();
        name = buildFullName(lastName, firstName);
      } else if (isNumberSecond) {
        name = parts[0];
        lastName = name;
        number = parts[1];
        liberoFlag = parts[2] || "";
      } else {
        name = parts.join(" ").trim();
        lastName = name;
      }
    } else {
      let match = rawLine.match(/^([0-9]{1,3})\s+(.+?)(?:\s+([Ll]))?$/);
      if (match) {
        number = match[1].trim();
        name = match[2].trim();
        lastName = name;
        liberoFlag = (match[3] || "").trim();
      } else {
        match = rawLine.match(/^(.+?)\s+([0-9]{1,3})(?:\s+([Ll]))?$/);
        if (match) {
          name = match[1].trim();
          lastName = name;
          number = match[2].trim();
          liberoFlag = (match[3] || "").trim();
        }
      }
    }
    const cleanName = normalizePlayers([normalizePlayerNameCase(name)])[0];
    if (!cleanName) return;
    const cleanLastName = normalizePlayerNameCase(lastName || cleanName);
    const cleanFirstName = normalizePlayerNameCase(firstName);
    players.push(cleanName);
    playersDetailed.push({ name: cleanName, lastName: cleanLastName, firstName: cleanFirstName });
    if (number && /^[0-9]{1,3}$/.test(number)) {
      numbers[cleanName] = number;
    }
    if (liberoFlag && liberoFlag.toLowerCase() === "l") {
      liberos.push(cleanName);
    }
  });
  if (players.length === 0) return null;
  return { players, playersDetailed, numbers, liberos };
}
