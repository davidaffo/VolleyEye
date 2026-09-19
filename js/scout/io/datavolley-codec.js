function parseDvwSections(text) {
  const sections = new Map();
  let current = "";
  String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .forEach(rawLine => {
      const line = rawLine.replace(/\uFEFF/g, "");
      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        current = sectionMatch[1];
        if (!sections.has(current)) sections.set(current, []);
        return;
      }
      if (!current) return;
      sections.get(current).push(line);
    });
  return sections;
}
function getDvwSectionLines(sections, name) {
  const rows = sections.get(name) || [];
  return rows.map(line => String(line || "").trimEnd()).filter(line => line.length > 0);
}
function parseDvwRow(line) {
  return String(line || "").split(";").map(part => part.trim());
}
function parseDvwAttackCombinationDefinitions(lines) {
  const map = new Map();
  (lines || []).forEach(line => {
    const row = parseDvwRow(line);
    const code = sanitizeDvField(row[0]).toUpperCase();
    if (!code) return;
    const typeLetter = sanitizeDvField(row[3]).toUpperCase();
    map.set(code, {
      code,
      zone: sanitizeDvField(row[1]),
      side: sanitizeDvField(row[2]),
      typeLetter,
      setType: decodeDvwSetType(typeLetter) || "",
      label: sanitizeDvField(row[4]) || code
    });
  });
  return map;
}
function parseDvwSetterCallDefinitions(lines) {
  const map = new Map();
  (lines || []).forEach(line => {
    const row = parseDvwRow(line);
    const code = sanitizeDvField(row[0]).toUpperCase();
    if (!code) return;
    map.set(code, {
      code,
      label: sanitizeDvField(row[2] || row[1] || row[3]) || code
    });
  });
  return map;
}
function formatDvwImportedName(lastName = "", firstName = "") {
  const raw = [String(lastName || "").trim(), String(firstName || "").trim()].filter(Boolean).join(" ");
  if (!raw) return "";
  return raw
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function buildDvwImportDateIso(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  const mdy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mdy) {
    return `${mdy[3]}-${mdy[1]}-${mdy[2]}`;
  }
  const ymd = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  }
  return raw;
}
function buildDvwTimestamp(dateIso, timeValue) {
  const datePart = buildDvwImportDateIso(dateIso) || new Date().toISOString().slice(0, 10);
  const timeMatch = String(timeValue || "").trim().match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (!timeMatch) return `${datePart}T00:00:00.000Z`;
  const local = new Date(
    Number(datePart.slice(0, 4)),
    Number(datePart.slice(5, 7)) - 1,
    Number(datePart.slice(8, 10)),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3])
  );
  return local.toISOString();
}
function buildDvwZonePoint(zone, side = "start", attackCode = "") {
  const z = parseInt(zone, 10) || 0;
  const normalizedCode = String(attackCode || "").trim().toUpperCase();
  // Mappa entro il rettangolo del campo arancione, non sull'intera immagine.
  // attack_empty_near.png: bbox campo circa x=[61,1016], y=[122,1077] su 1080.
  const startMap = {
    1: { x: 0.83, y: 0.992 },
    2: { x: 0.83, y: 0.992 },
    3: { x: 0.5, y: 0.992 },
    4: { x: 0.17, y: 0.992 },
    5: { x: 0.17, y: 0.992 },
    6: { x: 0.5, y: 0.992 },
    7: { x: 0.14, y: 0.992 },
    8: { x: 0.5, y: 0.992 },
    9: { x: 0.86, y: 0.992 }
  };
  const endMap = {
    1: { x: 0.84, y: 0.32 },
    2: { x: 0.84, y: 0.14 },
    3: { x: 0.5, y: 0.14 },
    4: { x: 0.16, y: 0.14 },
    5: { x: 0.16, y: 0.32 },
    6: { x: 0.5, y: 0.32 },
    7: { x: 0.8, y: 0.50 },
    8: { x: 0.5, y: 0.50 },
    9: { x: 0.2, y: 0.50 }
  };
  const point = Object.assign({}, side === "end" ? endMap[z] : startMap[z]);
  if (!point || point.x === undefined || point.y === undefined) return null;
  if (side === "start") {
    if (normalizedCode === "V5" || normalizedCode === "X5" || normalizedCode === "JJ" || normalizedCode === "VJ") point.x = 0.22;
    if (normalizedCode === "V6" || normalizedCode === "X6" || normalizedCode === "VI" || normalizedCode === "II") point.x = 0.78;
    if (normalizedCode === "V8" || normalizedCode === "X8" || normalizedCode === "VO" || normalizedCode === "XO") {
      point.x = 0.84;
      point.y = 0.992;
    }
    if (normalizedCode === "XP" || normalizedCode === "VP" || normalizedCode === "XB" || normalizedCode === "VB" || normalizedCode === "XR" || normalizedCode === "VR") {
      point.x = 0.5;
      point.y = 0.992;
    }
    if (normalizedCode === "VV") {
      point.x = 0.1;
      point.y = 0.992;
    }
  } else {
    if (z === 7) point.x = 0.78;
    if (z === 9) point.x = 0.22;
  }
  return point;
}
function makeImportedCourtFromNames(names = []) {
  return Array.from({ length: 6 }, (_, idx) => ({ main: String(names[idx] || "").trim(), replaced: "" }));
}
function decodeDvwSetType(typeLetter) {
  switch (String(typeLetter || "").toUpperCase()) {
    case "M":
      return "mezza";
    case "U":
      return "super";
    case "Q":
      return "quick";
    case "T":
      return "veloce";
    case "N":
      return "fast";
    case "H":
      return "alta";
    case "O":
      return "damp";
    default:
      return null;
  }
}
function decodeDvwServeType(typeLetter) {
  switch (String(typeLetter || "").toUpperCase()) {
    case "H":
      return "F";
    case "Q":
      return "S";
    case "M":
    default:
      return "JF";
  }
}
function parseDvwTailParts(tail) {
  const raw = String(tail || "").trim();
  if (!raw) {
    return {
      advancedCode: "",
      inlineCode: "",
      zonePair: null,
      suffix: "",
      raw
    };
  }
  const zoneMatch = raw.match(/~(.)?(.)?(.*)$/);
  const lead = zoneMatch ? raw.slice(0, zoneMatch.index) : raw;
  const advancedCode = lead.length >= 2 && /^[A-Z0-9]{2}/i.test(lead) ? lead.slice(0, 2).toUpperCase() : "";
  const inlineCode = advancedCode ? lead.slice(2).toUpperCase() : lead.toUpperCase();
  if (!zoneMatch) {
    return {
      advancedCode,
      inlineCode,
      zonePair: null,
      suffix: "",
      raw
    };
  }
  const startRaw = (zoneMatch[1] || "").toUpperCase();
  const endRaw = (zoneMatch[2] || "").toUpperCase();
  let suffix = String(zoneMatch[3] || "").toUpperCase();
  if (suffix.startsWith("~")) suffix = suffix.slice(1);
  return {
    advancedCode,
    inlineCode,
    zonePair: {
      startZone: startRaw && startRaw !== "~" ? startRaw : "",
      endZone: endRaw && endRaw !== "~" ? endRaw : ""
    },
    suffix,
    raw
  };
}
function refineDvwTailBySkill(skillLetter, rawTail, parsedParts) {
  const skill = String(skillLetter || "").toUpperCase();
  const raw = String(rawTail || "").trim().toUpperCase();
  const parsed = parsedParts || parseDvwTailParts(raw);
  const fallback = {
    zoneMeta: parseDvwZoneMeta(parsed.zonePair),
    suffix: parsed.suffix
  };
  if (!raw) return fallback;
  if (skill === "A") {
    const match = raw.match(/^(?:[A-Z0-9]{2})?~(\d)(\d)?([A-D]?)(?:~)?(.*)$/);
    if (match) {
      return {
        zoneMeta: {
          startZone: match[1] || "",
          endZone: match[2] || "",
          endSubzone: match[3] || "",
          endCone: ""
        },
        suffix: String(match[4] || "").toUpperCase()
      };
    }
  }
  if (skill === "E") {
    const noStartZone = raw.match(/^(?:[A-Z0-9]{2,3})?~~(\d)([A-D]?)(?:~~)?(.*)$/);
    if (noStartZone) {
      return {
        zoneMeta: {
          startZone: "",
          endZone: noStartZone[1] || "",
          endSubzone: noStartZone[2] || "",
          endCone: ""
        },
        suffix: String(noStartZone[3] || "").toUpperCase()
      };
    }
    const simpleSuffix = raw.match(/^(?:[A-Z0-9]{2,3})?~~(.*)$/);
    if (simpleSuffix) {
      return {
        zoneMeta: {
          startZone: "",
          endZone: "",
          endSubzone: "",
          endCone: ""
        },
        suffix: String(simpleSuffix[1] || "").toUpperCase()
      };
    }
    const match = raw.match(/^(?:[A-Z0-9]{2})?([A-Z0-9]*)~(\d)([A-D]?)(.*)$/);
    if (match) {
      return {
        zoneMeta: {
          startZone: "",
          endZone: match[2] || "",
          endSubzone: match[3] || "",
          endCone: ""
        },
        suffix: String(match[4] || "").toUpperCase()
      };
    }
  }
  if (skill === "S" || skill === "R" || skill === "D" || skill === "F") {
    const match = raw.match(/^~~~(\d)(\d)([A-D]?)(.*)$/);
    if (match) {
      return {
        zoneMeta: {
          startZone: match[1] || "",
          endZone: match[2] || "",
          endSubzone: match[3] || "",
          endCone: ""
        },
        suffix: String(match[4] || "").toUpperCase()
      };
    }
    const singleZone = raw.match(/^~~~(\d)(.*)$/);
    if (singleZone) {
      return {
        zoneMeta: {
          startZone: "",
          endZone: singleZone[1] || "",
          endSubzone: "",
          endCone: ""
        },
        suffix: String(singleZone[2] || "").toUpperCase()
      };
    }
    const endOnly = raw.match(/^~~~~(\d)([A-D]?)(.*)$/);
    if (endOnly) {
      return {
        zoneMeta: {
          startZone: "",
          endZone: endOnly[1] || "",
          endSubzone: endOnly[2] || "",
          endCone: ""
        },
        suffix: String(endOnly[3] || "").toUpperCase()
      };
    }
    const suffixOnly = raw.match(/^~{6,}(.*)$/);
    if (suffixOnly) {
      return {
        zoneMeta: {
          startZone: "",
          endZone: "",
          endSubzone: "",
          endCone: ""
        },
        suffix: String(suffixOnly[1] || "").toUpperCase()
      };
    }
  }
  if (skill === "B") {
    const match = raw.match(/^~~~~(\d)(.*)$/);
    if (match) {
      return {
        zoneMeta: {
          startZone: "",
          endZone: match[1] || "",
          endSubzone: "",
          endCone: ""
        },
        suffix: String(match[2] || "").toUpperCase()
      };
    }
    const suffixOnly = raw.match(/^~{6,}(.*)$/);
    if (suffixOnly) {
      return {
        zoneMeta: {
          startZone: "",
          endZone: "",
          endSubzone: "",
          endCone: ""
        },
        suffix: String(suffixOnly[1] || "").toUpperCase()
      };
    }
  }
  return fallback;
}
function parseDvwSkillCode(code) {
  const raw = String(code || "").trim();
  const substitution = raw.match(/^([*a])c(\d{1,2}):(\d{1,2})$/i);
  if (substitution) {
    return {
      kind: "substitution",
      teamScope: substitution[1] === "a" ? "opponent" : "our",
      playerInNumber: padDv(substitution[2], 2),
      playerOutNumber: padDv(substitution[3], 2)
    };
  }
  const timeout = raw.match(/^([*a])T$/i);
  if (timeout) {
    return {
      kind: "timeout",
      teamScope: timeout[1] === "a" ? "opponent" : "our"
    };
  }
  const pointMarker = raw.match(/^([*a])\$\$&([A-Z])([#=!+\-/])?$/i);
  if (pointMarker) {
    return {
      kind: "point-marker",
      teamScope: pointMarker[1] === "a" ? "opponent" : "our",
      pointType: String(pointMarker[2] || "").toUpperCase(),
      evaluation: pointMarker[3] || ""
    };
  }
  const score = raw.match(/^([*a])p(\d+):(\d+)$/i);
  if (score) {
    return {
      kind: "score",
      teamScope: score[1] === "a" ? "opponent" : "our",
      scoreOur: parseInt(score[2], 10) || 0,
      scoreOpp: parseInt(score[3], 10) || 0
    };
  }
  if (/^[*a]z\d+/i.test(raw)) {
    return { kind: "rotation" };
  }
  if (/^[*a]P\d+>LUp/i.test(raw)) {
    return { kind: "lineup" };
  }
  if (/^\*\*\d+set/i.test(raw)) {
    return { kind: "set-end" };
  }
  const skill = raw.match(/^(?:([*a]))?(\d{1,2})([SRABDEF])([HMQTUNO])([#=!+\-/])(.*)$/i);
  if (!skill) return { kind: "unknown" };
  const inferredScope = skill[1]
    ? (skill[1].toLowerCase() === "a" ? "opponent" : "our")
    : inferDvwScopeFromNumberAndFlow(skill[2], skill[3]);
  if (!inferredScope) return { kind: "unknown" };
  const tail = skill[6] || "";
  const tailParts = parseDvwTailParts(tail);
  const refinedTail = refineDvwTailBySkill(skill[3], tail, tailParts);
  return {
    kind: "skill",
    teamScope: inferredScope,
    playerNumber: padDv(skill[2], 2),
    skillLetter: skill[3].toUpperCase(),
    typeLetter: skill[4].toUpperCase(),
    evaluation: skill[5],
    tail,
    advancedCode: tailParts.advancedCode,
    inlineCode: tailParts.inlineCode,
    zonePair: tailParts.zonePair,
    zoneMeta: refinedTail.zoneMeta,
    suffix: refinedTail.suffix
  };
}
function getDvwScopeMatchesByPlayerNumber(playerNumber) {
  const normalizedNumber = padDv(playerNumber, 2);
  if (!normalizedNumber) return [];
  const matches = [];
  const ourNumbers = getPlayerNumbersForScope("our") || {};
  if (Object.values(ourNumbers).some(value => padDv(value, 2) === normalizedNumber)) {
    matches.push("our");
  }
  if (state.useOpponentTeam) {
    const oppNumbers = getPlayerNumbersForScope("opponent") || {};
    if (Object.values(oppNumbers).some(value => padDv(value, 2) === normalizedNumber)) {
      matches.push("opponent");
    }
  }
  return matches;
}
function getDvwPrefixForScope(scope) {
  return scope === "opponent" ? "a" : "*";
}
function inferDvwScopeFromNumberAndFlow(playerNumber = "", skillLetter = "") {
  if (!state.useOpponentTeam) return "our";
  const matches = getDvwScopeMatchesByPlayerNumber(playerNumber);
  if (matches.length === 1) return matches[0];
  const flowState = getAutoFlowState();
  if (flowState && flowState.teamScope) {
    return flowState.teamScope;
  }
  if (matches.length > 0) return matches[0];
  return null;
}
function inferServeEvalFromReceptionEval(receptionEval = "") {
  const map = {
    "=": "#",
    "/": "/",
    "-": "+",
    "!": "!",
    "+": "-",
    "#": "-"
  };
  return map[String(receptionEval || "")] || "";
}
function buildDvwDirectionTail(startZone = "", endZone = "", endSubzone = "") {
  const start = String(startZone || "").toUpperCase();
  const end = String(endZone || "").toUpperCase();
  const sub = String(endSubzone || "").toUpperCase();
  if (!start && !end && !sub) return "";
  return `~~~${start}${end}${sub}`;
}
function expandDvwServeReceptionCompound(rawInput) {
  const raw = String(rawInput || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!raw || !raw.includes(".")) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [left, right] = parts;
  const leftMatch = left.match(/^(?:([*A]))?(\d{1,2})S([HMQTUNO]?)([#=!+\-/]?)(\d{0,2})([A-D]?)$/);
  if (!leftMatch) return null;
  const rightMatch = right.match(/^(\d{1,2})([HMQTUNO]?)([#=!+\-/])(\d{0,2})([A-D]?)$/);
  if (!rightMatch) return null;
  const serveScope = leftMatch[1]
    ? (leftMatch[1] === "A" ? "opponent" : "our")
    : inferDvwScopeFromNumberAndFlow(leftMatch[2], "S");
  if (!serveScope) return null;
  const receiveScope = getOppositeScope(serveScope);
  if (receiveScope === "opponent" && !state.useOpponentTeam) return null;
  const serveNumber = padDv(leftMatch[2], 2);
  const receiveNumber = padDv(rightMatch[1], 2);
  const serveType = String(leftMatch[3] || "").toUpperCase() || "H";
  const receiveType = String(rightMatch[2] || "").toUpperCase() || serveType;
  const receiveEval = String(rightMatch[3] || "").toUpperCase();
  const serveEval = String(leftMatch[4] || "").toUpperCase() || inferServeEvalFromReceptionEval(receiveEval);
  if (!serveEval) return null;
  const leftDigits = String(leftMatch[5] || "");
  const rightDigits = String(rightMatch[4] || "");
  let startZone = "";
  let endZone = "";
  if (leftDigits.length >= 1) startZone = leftDigits.charAt(0);
  if (rightDigits.length >= 1) {
    endZone = rightDigits.length === 2 && !startZone ? rightDigits.charAt(1) : rightDigits.charAt(0);
    if (!startZone && rightDigits.length === 2) startZone = rightDigits.charAt(0);
  } else if (leftDigits.length >= 2) {
    endZone = leftDigits.charAt(1);
  }
  const sharedSubzone = String(rightMatch[5] || "").toUpperCase() || String(leftMatch[6] || "").toUpperCase();
  const sharedTail = buildDvwDirectionTail(startZone, endZone, sharedSubzone);
  const serveCode = `${getDvwPrefixForScope(serveScope)}${serveNumber}S${serveType}${serveEval}${sharedTail}`;
  const receiveCode = `${getDvwPrefixForScope(receiveScope)}${receiveNumber}R${receiveType}${receiveEval}${sharedTail}`;
  return [serveCode, receiveCode];
}
function expandDvwCompoundToken(rawInput) {
  const raw = String(rawInput || "").trim();
  if (!raw.includes(".")) return null;
  const serveReceive = expandDvwServeReceptionCompound(raw);
  if (serveReceive && serveReceive.length) return serveReceive;
  const parts = raw.split(".").map(part => part.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const normalizedParts = parts.map(part => normalizeDvwScoutToken(part));
  if (normalizedParts.every(item => item.parsed && item.parsed.kind !== "unknown")) {
    return normalizedParts.map(item => item.normalized || item.raw).filter(Boolean);
  }
  return null;
}
function normalizeDvwScoutToken(rawInput) {
  const raw = String(rawInput || "").trim();
  if (!raw) {
    return {
      raw,
      normalized: "",
      corrected: false,
      parsed: { kind: "unknown" },
      correctionReason: ""
    };
  }
  const directParsed = parseDvwSkillCode(raw);
  if (directParsed && directParsed.kind !== "unknown") {
    const normalizedDirect =
      directParsed.kind === "skill" && !/^[*a]/i.test(raw)
        ? `${getDvwPrefixForScope(directParsed.teamScope)}${raw.toUpperCase().replace(/\s+/g, "")}`
        : raw;
    return {
      raw,
      normalized: normalizedDirect,
      corrected: normalizedDirect !== raw,
      parsed: directParsed,
      correctionReason: normalizedDirect !== raw ? "implicit-team-prefix" : ""
    };
  }
  const upperRaw = raw.toUpperCase().replace(/\s+/g, "");
  const teamPrefix = upperRaw.startsWith("*") || upperRaw.startsWith("A") ? upperRaw.charAt(0) : "";
  const body = teamPrefix ? upperRaw.slice(1) : upperRaw;
  const evalIndex = body.search(/[#=!+\-/]/);
  if (evalIndex < 0) {
    return {
      raw,
      normalized: raw,
      corrected: false,
      parsed: directParsed,
      correctionReason: ""
    };
  }
  const mainHead = body.slice(0, evalIndex);
  const evalSymbol = body.charAt(evalIndex);
  const tail = body.slice(evalIndex + 1);
  const skillSet = new Set(["S", "R", "A", "B", "D", "E", "F"]);
  const typeSet = new Set(["H", "M", "Q", "T", "U", "N", "O"]);
  const chars = mainHead.split("");
  const skillIndices = [];
  const typeIndices = [];
  chars.forEach((ch, idx) => {
    if (skillSet.has(ch)) skillIndices.push(idx);
    if (typeSet.has(ch)) typeIndices.push(idx);
  });
  for (const skillIdx of skillIndices) {
    for (const typeIdx of typeIndices) {
      if (skillIdx === typeIdx) continue;
      const playerDigits = chars
        .filter((_, idx) => idx !== skillIdx && idx !== typeIdx)
        .join("");
      if (!/^\d{1,2}$/.test(playerDigits)) continue;
      const inferredScope = teamPrefix
        ? (teamPrefix === "A" ? "opponent" : "our")
        : inferDvwScopeFromNumberAndFlow(playerDigits, chars[skillIdx]);
      if (!inferredScope) continue;
      const normalized = `${teamPrefix || getDvwPrefixForScope(inferredScope)}${padDv(playerDigits, 2)}${chars[skillIdx]}${chars[typeIdx]}${evalSymbol}${tail}`;
      const parsed = parseDvwSkillCode(normalized);
      if (!parsed || parsed.kind === "unknown") continue;
      return {
        raw,
        normalized,
        corrected: normalized !== raw,
        parsed,
        correctionReason: "main-code-order"
      };
    }
  }
  return {
    raw,
    normalized: raw,
    corrected: false,
    parsed: directParsed,
    correctionReason: ""
  };
}
