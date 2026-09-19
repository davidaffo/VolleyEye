function padDv(value, size = 2) {
  const num = parseInt(value, 10);
  if (!Number.isFinite(num)) return String(value || "").padStart(size, "0").slice(-size);
  return String(Math.max(0, num)).padStart(size, "0").slice(-size);
}
const DEFAULT_DVW_ATTACK_COMBINATIONS = [
  "V5;4;R;H;High set in 4;;255;4912;F;;",
  "V6;2;L;H;High set in 2;;255;4988;B;;",
  "V8;9;C;H;High set in 1;;255;4186;B;1;",
  "VV;7;R;H;Emerg 4 high;;0;3627;F;;",
  "X1;3;R;Q;Quick;;16711680;4956;C;;",
  "X5;4;R;T;Shoot in 4;;16711680;4912;F;;",
  "X6;2;L;T;Shoot in 2;;16711680;4988;B;;",
  "XP;8;C;M;Pipe;;16711680;4150;P;1;",
  "PR;3;C;O;Attack on opponent freeball;;255;4949;-;;",
  "PP;3;L;O;Setter tip;;16711680;4964;S;;",
  "CF;2;L;N;Slide close to setter;;16711680;4976;C;;",
  "CD;2;L;N;Slide away from setter;;16711680;4986;C;;",
  "CB;2;L;N;Slide next to setter;;16711680;4970;C;;"
];
const DEFAULT_DVW_SETTER_CALLS = [
  "K1;;Front Quick;;16711680;3949;4454;4958;;;",
  "K2;;Back Quick;;16711680;3864;4278;4974;;;",
  "K7;;Seven;;16711680;3923;4426;4930;;;",
  "KC;;Quick in 3;;16711680;3849;4449;5049;;;",
  "KM;;shifted to 2;;16711680;0000;0000;0000;4924,5524,5530,6332,6312,5012,5024,;12632256;",
  "KP;;Shifted to 4;;16711680;0000;0000;0000;5457,5057,5557,5552,6352,6364,5377,5077,5058,5058,;12632256;",
  "KE;;No First Tempo;;0;0000;0000;0000;5858,5826,6426,6458,6458,;12632256;"
];
const DEFAULT_DVW_WINNING_SYMBOLS = ["=~~~#~~~=~~~~~~~=/~~#~~~=/~~#~~~=~~~~~~~=~~~~~~~=~~~~~~~"];
function sanitizeDvField(value) {
  return String(value || "")
    .replace(/[;\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function getStoredDvwSectionLines(sectionKey, fallback = []) {
  const raw = state && state.match ? state.match[sectionKey] : null;
  if (!Array.isArray(raw)) return fallback.slice();
  return raw.map(line => String(line || "").trimEnd()).filter(Boolean);
}
function buildDvTeamCode(name = "", fallback = "TM") {
  const cleaned = sanitizeDvField(name).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned) return cleaned.slice(0, 4);
  return fallback;
}
function formatDvDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return sanitizeDvField(value);
  const mm = padDv(date.getMonth() + 1);
  const dd = padDv(date.getDate());
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
function formatDvDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return formatDvDate(new Date()) + " 00.00.00";
  return (
    `${padDv(date.getMonth() + 1)}/${padDv(date.getDate())}/${date.getFullYear()} ` +
    `${padDv(date.getHours())}.${padDv(date.getMinutes())}.${padDv(date.getSeconds())}`
  );
}
function formatDvRowTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${padDv(date.getHours())}.${padDv(date.getMinutes())}.${padDv(date.getSeconds())}`;
}
function getDataVolleyTeamPayload(scope = "our") {
  if (scope === "opponent" && typeof getCurrentOpponentPayload === "function") {
    return getCurrentOpponentPayload();
  }
  if (scope !== "opponent" && typeof getCurrentTeamPayload === "function") {
    return getCurrentTeamPayload();
  }
  const players = scope === "opponent" ? state.opponentPlayers || [] : state.players || [];
  const numbers = scope === "opponent" ? state.opponentPlayerNumbers || {} : state.playerNumbers || {};
  const liberos = scope === "opponent" ? state.opponentLiberos || [] : state.liberos || [];
  const captains = scope === "opponent" ? state.opponentCaptains || [] : state.captains || [];
  return {
    name: getTeamNameForScope(scope),
    officialCode: "",
    officialId: "",
    staff: Object.assign({}, DEFAULT_STAFF),
    playersDetailed: players.map((name, idx) => ({
      id: typeof generatePlayerId === "function" ? generatePlayerId() : `p-${scope}-${idx + 1}`,
      name,
      codeOfficial: "",
      number: numbers[name] || "",
      role: liberos.includes(name) ? "L" : "",
      isCaptain: captains.includes(name),
      out: false
    }))
  };
}
function getDvPlayerNumber(player, fallbackIndex = 0) {
  const raw =
    player && player.number !== undefined && player.number !== null && String(player.number).trim() !== ""
      ? String(player.number).trim()
      : String(fallbackIndex + 1);
  return padDv(raw, 2);
}
function getDvEventPlayerNumber(scope, playerIdx, playerName, teamPayload = null) {
  const numbers = typeof getPlayerNumbersForScope === "function" ? getPlayerNumbersForScope(scope) || {} : {};
  const players = typeof getPlayersForScope === "function" ? getPlayersForScope(scope) || [] : [];
  const name =
    String(playerName || "").trim() ||
    (typeof playerIdx === "number" && players[playerIdx] ? String(players[playerIdx]).trim() : "");
  if (name && numbers[name] !== undefined && numbers[name] !== null && String(numbers[name]).trim() !== "") {
    return padDv(numbers[name], 2);
  }
  const detailed = (teamPayload && teamPayload.playersDetailed) || [];
  const player = detailed.find(item => item && item.name === name);
  if (player) return getDvPlayerNumber(player, typeof playerIdx === "number" ? playerIdx : 0);
  if (typeof playerIdx === "number") return padDv(playerIdx + 1, 2);
  return "00";
}
function buildDvPlayerCode(teamCode, player, fallbackIndex = 0) {
  const official = sanitizeDvField(player && player.codeOfficial);
  if (official) return official.toUpperCase();
  return `${teamCode}${getDvPlayerNumber(player, fallbackIndex)}`;
}
function buildDvSetParticipationMap(teamPayload, setNumbers, scope = "our") {
  const playerStates = new Map();
  const players = (teamPayload && teamPayload.playersDetailed) || [];
  players.forEach((player, idx) => {
    playerStates.set(player.name, {
      player,
      index: idx,
      perSet: {}
    });
  });
  (setNumbers || []).forEach(setNum => {
    const startEntry = getSetStartEntryForScope(setNum, scope);
    const startCourt = startEntry && Array.isArray(startEntry.court) ? startEntry.court : [];
    startCourt.forEach((slot, idx) => {
      const name = typeof slot === "string" ? slot : slot && typeof slot === "object" ? slot.main || "" : "";
      if (!name || !playerStates.has(name)) return;
      playerStates.get(name).perSet[setNum] = String(idx + 1);
    });
  });
  (state.events || []).forEach(ev => {
    if (!ev || ev.actionType !== "substitution") return;
    if (getTeamScopeFromEvent(ev) !== scope) return;
    const setNum = parseInt(ev.set, 10) || 1;
    const playerIn = (ev.playerIn || "").trim();
    if (!playerIn || !playerStates.has(playerIn)) return;
    if (!playerStates.get(playerIn).perSet[setNum]) {
      playerStates.get(playerIn).perSet[setNum] = "*";
    }
  });
  return playerStates;
}
function cloneDvCourt(entry) {
  return ensureCourtShapeFor(entry || []).map(slot => ({
    main: (slot && slot.main) || "",
    replaced: (slot && slot.replaced) || ""
  }));
}
function rotateDvCourt(court, direction) {
  const base = cloneDvCourt(court);
  if (direction === "cw") {
    return [base[5], base[0], base[1], base[2], base[3], base[4]];
  }
  return [base[1], base[2], base[3], base[4], base[5], base[0]];
}
function applyDvSubstitution(court, playerIn, playerOut) {
  const nextCourt = cloneDvCourt(court);
  const inName = String(playerIn || "").trim();
  const outName = String(playerOut || "").trim();
  if (!inName || !outName) return nextCourt;
  const outIdx = nextCourt.findIndex(slot => slot && slot.main === outName);
  const inIdx = nextCourt.findIndex(slot => slot && slot.main === inName);
  if (outIdx >= 0 && inIdx >= 0) {
    const tmp = nextCourt[inIdx].main;
    nextCourt[inIdx].main = nextCourt[outIdx].main;
    nextCourt[outIdx].main = tmp;
    return nextCourt;
  }
  if (outIdx >= 0) {
    nextCourt[outIdx].main = inName;
  }
  return nextCourt;
}
function getDvSetterPosition(rotation = 1) {
  for (let pos = 1; pos <= 6; pos += 1) {
    if (typeof getRoleLabelForRotation === "function" && String(getRoleLabelForRotation(pos, rotation)).toUpperCase() === "P") {
      return pos;
    }
  }
  return 1;
}
function getDvSetterNumber(court, teamPayload, rotation) {
  const setterPos = getDvSetterPosition(rotation);
  const slot = ensureCourtShapeFor(court || [])[setterPos - 1];
  const name = slot && slot.main ? slot.main : "";
  const players = (teamPayload && teamPayload.playersDetailed) || [];
  const player = players.find(item => item && item.name === name);
  return getDvPlayerNumber(player || { number: "" }, setterPos);
}
function getDvLineupNumbers(court, teamPayload) {
  const players = (teamPayload && teamPayload.playersDetailed) || [];
  return ensureCourtShapeFor(court || []).map((slot, idx) => {
    const name = slot && slot.main ? slot.main : "";
    const player = players.find(item => item && item.name === name);
    return getDvPlayerNumber(player || { number: "" }, idx);
  });
}
function buildDvRow(code, options = {}) {
  const {
    setNum = 1,
    time = "",
    ourRotation = 1,
    opponentRotation = 1,
    ourCourt = [],
    opponentCourt = [],
    ourTeam = null,
    opponentTeam = null,
    flags = []
  } = options;
  const normalizedFlags = Array.from({ length: 7 }, (_, idx) => sanitizeDvField(flags[idx] || ""));
  return [
    sanitizeDvField(code),
    ...normalizedFlags,
    sanitizeDvField(time),
    String(setNum || 1),
    String(getDvSetterPosition(ourRotation)),
    String(getDvSetterPosition(opponentRotation)),
    "",
    "",
    "",
    ...getDvLineupNumbers(ourCourt, ourTeam),
    ...getDvLineupNumbers(opponentCourt, opponentTeam),
    ""
  ].join(";");
}
function mapOurSetTypeToDvType(value, fallback = "H") {
  const normalized = normalizeSetTypeValue ? normalizeSetTypeValue(value) : String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "mezza":
      return "M";
    case "super":
      return "U";
    case "quick":
      return "Q";
    case "veloce":
    case "fast":
      return "N";
    case "alta":
      return "H";
    case "damp":
      return "O";
    default:
      return fallback;
  }
}
function mapServeTypeToDvType(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "F") return "H";
  if (normalized === "S") return "Q";
  return "M";
}
function getDvEvaluationCode(ev) {
  const code = String((ev && ev.code) || "").trim();
  if (RESULT_CODES.includes(code)) return code;
  if (code === "for" || code === "opp-error") return "#";
  if (code === "opp-point" || code === "error" || code === "team-error") return "=";
  return "#";
}
function computeDataVolleyEventSignature(ev, teamPayload = null) {
  if (!ev) return "";
  const scope = getTeamScopeFromEvent(ev);
  const skillMap = {
    serve: "S",
    pass: "R",
    attack: "A",
    block: "B",
    defense: "D",
    second: "E",
    freeball: "F"
  };
  const skill = skillMap[ev.skillId] || "";
  const playerNumber = ev.playerNumberAtEvent
    ? padDv(ev.playerNumberAtEvent, 2)
    : getDvEventPlayerNumber(scope, ev.playerIdx, ev.playerName, teamPayload);
  let type = sanitizeDvField(ev.dv && ev.dv.skillType).toUpperCase();
  if (!type) {
    if (ev.skillId === "serve" || ev.skillId === "pass") {
      type = mapServeTypeToDvType(ev.serveType);
    } else if (ev.skillId === "freeball") {
      type = "O";
    } else if (ev.skillId === "attack" || ev.skillId === "second") {
      type = mapOurSetTypeToDvType(ev.setType, ev.skillId === "second" ? "H" : "H");
    } else {
      type = "H";
    }
  }
  return JSON.stringify({
    team: ev.team === "opponent" ? "a" : "*",
    playerNumber,
    skill,
    type,
    evaluation: getDvEvaluationCode(ev),
    attackCode: sanitizeDvField((ev.dv && ev.dv.attackCode) || ev.attackType || (ev.combination && (ev.combination.code || ev.combination.attackCode)) || ""),
    setCode: sanitizeDvField((ev.dv && ev.dv.setCode) || ev.base || (ev.combination && ev.combination.code) || ""),
    skillSubtype: sanitizeDvField(ev.dv && ev.dv.skillSubtype),
    specialCode: sanitizeDvField(ev.dv && ev.dv.specialCode),
    startZone: sanitizeDvField(ev.dv && ev.dv.startZone),
    endZone: sanitizeDvField(ev.dv && ev.dv.endZone),
    endSubzone: sanitizeDvField(ev.dv && ev.dv.endSubzone),
    endCone: sanitizeDvField(ev.dv && ev.dv.endCone),
    numPlayersNumeric:
      ev && ev.dv && Number.isFinite(ev.dv.numPlayersNumeric)
        ? ev.dv.numPlayersNumeric
        : Number.isFinite(parseInt(ev.blockNumber, 10))
          ? parseInt(ev.blockNumber, 10)
          : null,
    serveType: sanitizeDvField(ev.serveType)
  });
}
function sanitizeDvZoneChar(value) {
  const raw = sanitizeDvField(value).toUpperCase();
  if (!raw) return "";
  const char = raw.charAt(0);
  return /[0-9A-Z]/.test(char) ? char : "";
}
function buildDataVolleyZoneTail(ev, skill) {
  if (!ev || !skill) return "";
  const meta = ev.dv && typeof ev.dv === "object" ? ev.dv : {};
  const startZoneAttack = sanitizeDvZoneChar(meta.startZone || ev.attackStartZone || ev.originZone || ev.zone);
  const startZoneGeneral = sanitizeDvZoneChar(meta.startZone || ev.originZone || ev.zone);
  const endZone = sanitizeDvZoneChar(meta.endZone || ev.attackEndZone);
  const endSubzone = sanitizeDvZoneChar(meta.endSubzone);

  if (skill === "A") {
    if (!startZoneAttack && !endZone && !endSubzone) return "";
    if (startZoneAttack && !endZone && !endSubzone) {
      return `~${startZoneAttack}~`;
    }
    return `~${startZoneAttack || ""}${endZone || ""}${endSubzone || ""}`;
  }
  if (skill === "E") {
    const inline = sanitizeDvField(meta.skillSubtype).toUpperCase();
    if (!endZone && !endSubzone) return "";
    return `${inline ? "~" : "~~"}${endZone || ""}${endSubzone || ""}`;
  }
  if (skill === "S" || skill === "R" || skill === "D" || skill === "F") {
    if (startZoneGeneral) {
      return `~~~${startZoneGeneral}${endZone || ""}${endSubzone || ""}`;
    }
    if (endZone || endSubzone) {
      return `~~~~${endZone || ""}${endSubzone || ""}`;
    }
    return "";
  }
  if (skill === "B") {
    if (!endZone) return "";
    return `~~~~${endZone}`;
  }
  return "";
}
function parseDvwZoneMeta(zonePair) {
  const rawStart = String((zonePair && zonePair.startZone) || "").toUpperCase();
  const rawEnd = String((zonePair && zonePair.endZone) || "").toUpperCase();
  const startZone = /^\d$/.test(rawStart) ? rawStart : "";
  const endZone = /^\d$/.test(rawEnd) ? rawEnd : "";
  const endSubzone = !endZone && /^[A-Z]$/.test(rawEnd) ? rawEnd : "";
  return {
    startZone,
    endZone,
    endSubzone,
    endCone: ""
  };
}
function parseDvwSuffixMeta(skillLetter, inlineCode = "", suffix = "") {
  const skill = String(skillLetter || "").toUpperCase();
  const inline = String(inlineCode || "").trim().toUpperCase();
  const rawSuffix = String(suffix || "").trim().toUpperCase();
  const cleanedSuffix = rawSuffix.replace(/^~+/, "");
  const base = {
    skillSubtype: "",
    specialCode: "",
    numPlayersNumeric: null
  };
  if (skill === "A") {
    const match = cleanedSuffix.match(/^([A-Z])(\d*)(.*)$/);
    if (match) {
      return {
        skillSubtype: match[1] || "",
        numPlayersNumeric: match[2] !== "" ? parseInt(match[2], 10) : null,
        specialCode: match[3] || ""
      };
    }
    return {
      skillSubtype: cleanedSuffix ? cleanedSuffix.charAt(0) : "",
      specialCode: cleanedSuffix ? cleanedSuffix.slice(1) : "",
      numPlayersNumeric: null
    };
  }
  if (skill === "B") {
    const match = cleanedSuffix.match(/^(\d*)(.*)$/);
    if (match) {
      return {
        skillSubtype: "",
        numPlayersNumeric: match[1] !== "" ? parseInt(match[1], 10) : null,
        specialCode: match[2] || ""
      };
    }
    return {
      skillSubtype: "",
      numPlayersNumeric: null,
      specialCode: cleanedSuffix
    };
  }
  if (skill === "E") {
    return {
      skillSubtype: inline || "",
      specialCode: cleanedSuffix,
      numPlayersNumeric: null
    };
  }
  if (skill === "R") {
    if (/^~~/.test(rawSuffix)) {
      return Object.assign({}, base, {
        specialCode: cleanedSuffix
      });
    }
    if (/^[A-Z]/.test(cleanedSuffix)) {
      return {
        skillSubtype: cleanedSuffix.charAt(0),
        specialCode: cleanedSuffix.slice(1),
        numPlayersNumeric: null
      };
    }
    return Object.assign({}, base, {
      specialCode: cleanedSuffix
    });
  }
  if (skill === "S" || skill === "D" || skill === "F") {
    return Object.assign({}, base, {
      specialCode: cleanedSuffix
    });
  }
  return Object.assign({}, base, {
    skillSubtype: inline || (cleanedSuffix ? cleanedSuffix.charAt(0) : ""),
    specialCode: inline ? cleanedSuffix : cleanedSuffix.slice(1)
  });
}
function buildDataVolleyPostZoneTail(ev, skill) {
  if (!ev) return "";
  const meta = ev.dv && typeof ev.dv === "object" ? ev.dv : {};
  if (skill === "A") {
    const subtype = sanitizeDvField(meta.skillSubtype).toUpperCase();
    const rawNum = Number.isFinite(meta.numPlayersNumeric) ? meta.numPlayersNumeric : null;
    const num = rawNum !== null ? String(Math.max(0, Math.min(9, rawNum))) : "";
    const special = sanitizeDvField(meta.specialCode).toUpperCase();
    const hasSubzone = Boolean(sanitizeDvZoneChar(meta.endSubzone));
    return subtype || num || special ? `${hasSubzone ? "" : "~"}${subtype}${num}${special}` : "";
  }
  if (skill === "B") {
    const rawNum = Number.isFinite(meta.numPlayersNumeric)
      ? meta.numPlayersNumeric
      : Number.isFinite(parseInt(ev.blockNumber, 10))
        ? parseInt(ev.blockNumber, 10)
        : null;
    const num = rawNum !== null ? String(Math.max(0, Math.min(9, rawNum))) : "";
    const special = sanitizeDvField(meta.specialCode).toUpperCase();
    const hasZone = Boolean(buildDataVolleyZoneTail(ev, skill));
    if (num || special) {
      if (!num && special) {
        if (hasZone) return `~~~${special}`;
        return `~~~~~~~~~${special}`;
      }
      return hasZone ? `~~${num}${special}` : `~~~~~~~~${num}${special}`;
    }
    return "";
  }
  if (skill === "R") {
    const subtype = sanitizeDvField(meta.skillSubtype).toUpperCase();
    const special = sanitizeDvField(meta.specialCode).toUpperCase();
    const hasSubzone = Boolean(sanitizeDvZoneChar(meta.endSubzone));
    if (subtype) return `${hasSubzone ? "" : "~"}${subtype}${special}`;
    if (special) return `~~${special}`;
    return "";
  }
  if (skill === "E") {
    const special = sanitizeDvField(meta.specialCode).toUpperCase();
    if (!special) return "";
    const hasZone = Boolean(buildDataVolleyZoneTail(ev, skill));
    const hasSetLead = Boolean(sanitizeDvField(meta.setCode) || sanitizeDvField(meta.skillSubtype));
    if (!hasZone && !hasSetLead && /^(U|I|0)$/.test(special)) {
      return `~~~~~~~~${special}`;
    }
    return /^[0-9~]/.test(special) ? special : `~~${special}`;
  }
  if (skill === "S") {
    const special = sanitizeDvField(meta.specialCode).toUpperCase();
    if (!special) return "";
    const hasZone = Boolean(buildDataVolleyZoneTail(ev, skill));
    if (!hasZone) return `~~~~~~~~~${special}`;
    return `~~${special}`;
  }
  if (skill === "D") {
    const special = sanitizeDvField(meta.specialCode).toUpperCase();
    if (!special) return "";
    const hasZone = Boolean(buildDataVolleyZoneTail(ev, skill));
    const hasSubzone = Boolean(sanitizeDvZoneChar(meta.endSubzone));
    return hasZone ? `${hasSubzone ? "" : "~"}${special}` : `~~~~~~${special}`;
  }
  if (skill === "F") {
    const special = sanitizeDvField(meta.specialCode).toUpperCase();
    if (!special) return "";
    const hasZone = Boolean(buildDataVolleyZoneTail(ev, skill));
    const hasSubzone = Boolean(sanitizeDvZoneChar(meta.endSubzone));
    return hasZone ? `${hasSubzone ? "" : "~"}${special}` : `~~~~~~~~${special}`;
  }
  return sanitizeDvField(meta.specialCode).toUpperCase();
}
function buildDataVolleySkillCode(ev, teamPayload) {
  if (!ev) return "";
  if (ev.dv && ev.dv.rawCode) {
    const currentSignature = computeDataVolleyEventSignature(ev, teamPayload);
    if (currentSignature && currentSignature === (ev.dv.rawCodeSignature || "")) {
      return ev.dv.rawCode;
    }
  }
  const scope = getTeamScopeFromEvent(ev);
  if (ev.actionType === "timeout") {
    return `${ev.team === "opponent" ? "a" : "*"}T`;
  }
  if (ev.actionType === "substitution") {
    const playerInNumber = getDvEventPlayerNumber(scope, null, ev.playerIn, teamPayload);
    const playerOutNumber = getDvEventPlayerNumber(scope, null, ev.playerOut, teamPayload);
    return `${ev.team === "opponent" ? "a" : "*"}c${playerInNumber}:${playerOutNumber}`;
  }
  if (ev.skillId === "manual") return "";
  const prefix = ev.team === "opponent" ? "a" : "*";
  const skillMap = {
    serve: "S",
    pass: "R",
    attack: "A",
    block: "B",
    defense: "D",
    second: "E",
    freeball: "F"
  };
  const skill = skillMap[ev.skillId] || "A";
  const playerNumber = ev.playerNumberAtEvent
    ? padDv(ev.playerNumberAtEvent, 2)
    : getDvEventPlayerNumber(scope, ev.playerIdx, ev.playerName, teamPayload);
  let type = sanitizeDvField(ev.dv && ev.dv.skillType).toUpperCase();
  if (!type) {
    if (ev.skillId === "serve" || ev.skillId === "pass") {
      type = mapServeTypeToDvType(ev.serveType);
    } else if (ev.skillId === "freeball") {
      type = "O";
    } else if (ev.skillId === "attack" || ev.skillId === "second") {
      type = mapOurSetTypeToDvType(ev.setType, ev.skillId === "second" ? "H" : "H");
    } else if (ev.skillId === "block" || ev.skillId === "defense") {
      type = "H";
    } else {
      type = "H";
    }
  }
  const evaluation = getDvEvaluationCode(ev);
  let tail = "";
  if (skill === "E") {
    const setCode = sanitizeDvField((ev.dv && ev.dv.setCode) || ev.base || (ev.combination && ev.combination.code) || "");
    if (setCode) tail += setCode.toUpperCase();
    if (ev.dv && ev.dv.skillSubtype) {
      tail += sanitizeDvField(ev.dv.skillSubtype).toUpperCase();
    }
  }
  if (skill === "A") {
    const attackCode = sanitizeDvField(
      (ev.dv && ev.dv.attackCode) ||
      ev.attackType ||
      (ev.combination && (ev.combination.code || ev.combination.attackCode)) ||
      ""
    );
    if (attackCode) tail += attackCode.toUpperCase();
  }
  tail += buildDataVolleyZoneTail(ev, skill);
  tail += buildDataVolleyPostZoneTail(ev, skill);
  return `${prefix}${playerNumber}${skill}${type}${evaluation}${tail}`;
}
function buildDataVolleyPointMarkerCode(ev, direction) {
  if (!ev || !direction) return "";
  const scoringScope = direction === "for" ? "our" : "opponent";
  const eventScope = getTeamScopeFromEvent(ev);
  const evalCode = getDvEvaluationCode(ev);
  if (ev.skillId === "manual" || ev.actionType === "timeout" || ev.actionType === "substitution") {
    return `${scoringScope === "opponent" ? "a" : "*"}$$&H#`;
  }
  if (eventScope === scoringScope && evalCode === "#") {
    return `${scoringScope === "opponent" ? "*" : "a"}$$&H=`;
  }
  if (eventScope !== scoringScope && evalCode === "=") {
    return `${scoringScope === "opponent" ? "a" : "*"}$$&H#`;
  }
  if (eventScope === scoringScope && (evalCode === "+" || evalCode === "!")) {
    return `${scoringScope === "opponent" ? "*" : "a"}$$&H=`;
  }
  return `${scoringScope === "opponent" ? "a" : "*"}$$&H#`;
}
function buildDataVolleyScoutRows(events, ourTeam, opponentTeam, setNumbers) {
  const lines = [];
  const eventsBySet = new Map();
  (setNumbers || []).forEach(setNum => eventsBySet.set(setNum, []));
  (events || []).forEach(ev => {
    const setNum = parseInt(ev && ev.set, 10) || 1;
    if (!eventsBySet.has(setNum)) eventsBySet.set(setNum, []);
    eventsBySet.get(setNum).push(ev);
  });
  const sortedSets = Array.from(eventsBySet.keys()).sort((a, b) => a - b);
  sortedSets.forEach(setNum => {
    const ourStart = getSetStartEntryForScope(setNum, "our") || getDefaultSetStartForScope("our") || { court: [], rotation: 1 };
    const oppStart =
      getSetStartEntryForScope(setNum, "opponent") || getDefaultSetStartForScope("opponent") || { court: [], rotation: 1 };
    const setEntry = state.setStarts && state.setStarts[setNum] ? state.setStarts[setNum] : {};
    const context = {
      setNum,
      ourCourt: cloneDvCourt(ourStart.court || []),
      opponentCourt: cloneDvCourt(oppStart.court || []),
      ourRotation: typeof ourStart.rotation === "number" ? ourStart.rotation : 1,
      opponentRotation: typeof oppStart.rotation === "number" ? oppStart.rotation : 1,
      scoreOur: 0,
      scoreOpp: 0
    };
    lines.push(
      buildDvRow(`*P${getDvSetterNumber(context.ourCourt, ourTeam, context.ourRotation)}>LUp`, {
        setNum,
        ourRotation: context.ourRotation,
        opponentRotation: context.opponentRotation,
        ourCourt: context.ourCourt,
        opponentCourt: context.opponentCourt,
        ourTeam,
        opponentTeam
      })
    );
    lines.push(
      buildDvRow(`*z${context.ourRotation}>LUp`, {
        setNum,
        ourRotation: context.ourRotation,
        opponentRotation: context.opponentRotation,
        ourCourt: context.ourCourt,
        opponentCourt: context.opponentCourt,
        ourTeam,
        opponentTeam
      })
    );
    lines.push(
      buildDvRow(`aP${getDvSetterNumber(context.opponentCourt, opponentTeam, context.opponentRotation)}>LUp`, {
        setNum,
        ourRotation: context.ourRotation,
        opponentRotation: context.opponentRotation,
        ourCourt: context.ourCourt,
        opponentCourt: context.opponentCourt,
        ourTeam,
        opponentTeam
      })
    );
    lines.push(
      buildDvRow(`az${context.opponentRotation}>LUp`, {
        setNum,
        ourRotation: context.ourRotation,
        opponentRotation: context.opponentRotation,
        ourCourt: context.ourCourt,
        opponentCourt: context.opponentCourt,
        ourTeam,
        opponentTeam
      })
    );
    (eventsBySet.get(setNum) || []).forEach(ev => {
      if (!ev) return;
      if (ev.actionType === "set-change" || ev.actionType === "match-end") return;
      const code = buildDataVolleySkillCode(ev, ev.team === "opponent" ? opponentTeam : ourTeam);
      const time = formatDvRowTime(ev.t);
      if (code) {
        lines.push(
          buildDvRow(code, {
            setNum,
            time,
            ourRotation: context.ourRotation,
            opponentRotation: context.opponentRotation,
            ourCourt: context.ourCourt,
            opponentCourt: context.opponentCourt,
            ourTeam,
            opponentTeam
          })
        );
      }
      if (ev.actionType === "substitution") {
        if (getTeamScopeFromEvent(ev) === "opponent") {
          context.opponentCourt = applyDvSubstitution(context.opponentCourt, ev.playerIn, ev.playerOut);
        } else {
          context.ourCourt = applyDvSubstitution(context.ourCourt, ev.playerIn, ev.playerOut);
        }
      }
      const direction = getPointDirection(ev);
      if (direction) {
        const scoringScope = direction === "for" ? "our" : "opponent";
        const markerCode = buildDataVolleyPointMarkerCode(ev, direction);
        if (markerCode) {
          lines.push(
            buildDvRow(markerCode, {
              setNum,
              time,
              ourRotation: context.ourRotation,
              opponentRotation: context.opponentRotation,
              ourCourt: context.ourCourt,
              opponentCourt: context.opponentCourt,
              ourTeam,
              opponentTeam
            })
          );
        }
        if (direction === "for") {
          context.scoreOur += getEventPointValue(ev);
        } else {
          context.scoreOpp += getEventPointValue(ev);
        }
        lines.push(
          buildDvRow(
            `${direction === "for" ? "*" : "a"}p${padDv(context.scoreOur)}:${padDv(context.scoreOpp)}`,
            {
              setNum,
              time,
              ourRotation: context.ourRotation,
              opponentRotation: context.opponentRotation,
              ourCourt: context.ourCourt,
              opponentCourt: context.opponentCourt,
              ourTeam,
              opponentTeam
            }
          )
        );
      }
      if (ev.autoRotationDirection && ev.autoRotationScope) {
        if (ev.autoRotationScope === "opponent") {
          context.opponentCourt = rotateDvCourt(context.opponentCourt, ev.autoRotationDirection);
          context.opponentRotation = ev.autoRotationDirection === "ccw"
            ? (context.opponentRotation === 1 ? 6 : context.opponentRotation - 1)
            : ((context.opponentRotation % 6) || 0) + 1;
          lines.push(
            buildDvRow(`az${context.opponentRotation}`, {
              setNum,
              time,
              ourRotation: context.ourRotation,
              opponentRotation: context.opponentRotation,
              ourCourt: context.ourCourt,
              opponentCourt: context.opponentCourt,
              ourTeam,
              opponentTeam
            })
          );
        } else {
          context.ourCourt = rotateDvCourt(context.ourCourt, ev.autoRotationDirection);
          context.ourRotation = ev.autoRotationDirection === "ccw"
            ? (context.ourRotation === 1 ? 6 : context.ourRotation - 1)
            : ((context.ourRotation % 6) || 0) + 1;
          lines.push(
            buildDvRow(`*z${context.ourRotation}`, {
              setNum,
              time,
              ourRotation: context.ourRotation,
              opponentRotation: context.opponentRotation,
              ourCourt: context.ourCourt,
              opponentCourt: context.opponentCourt,
              ourTeam,
              opponentTeam
            })
          );
        }
      }
    });
    const winner = (state.setResults && state.setResults[setNum]) || null;
    if (winner) {
      lines.push(
        buildDvRow(`**${setNum}set`, {
          setNum,
          ourRotation: context.ourRotation,
          opponentRotation: context.opponentRotation,
          ourCourt: context.ourCourt,
          opponentCourt: context.opponentCourt,
          ourTeam,
          opponentTeam
        })
      );
    }
  });
  return lines;
}
function buildDataVolleyPlayersRows(teamPayload, sideFlag, setNumbers, scope) {
  const rows = [];
  const players = ((teamPayload && teamPayload.playersDetailed) || []).filter(player => player && !player.out);
  const perSetMap = buildDvSetParticipationMap(teamPayload, setNumbers, scope);
  players.forEach((player, idx) => {
    const dvCode = buildDvPlayerCode(
      sanitizeDvField(teamPayload && teamPayload.officialCode) || buildDvTeamCode(teamPayload && teamPayload.name, scope === "opponent" ? "OPP" : "OUR"),
      player,
      idx
    );
    const lastName = sanitizeDvField(player.lastName).toUpperCase();
    const firstName = sanitizeDvField(player.firstName).toUpperCase();
    const playerState = perSetMap.get(player.name);
    const setCols = Array.from({ length: 5 }, (_, setIdx) => {
      const setNum = setIdx + 1;
      return sanitizeDvField(playerState && playerState.perSet ? playerState.perSet[setNum] || "" : "");
    });
    rows.push(
      [
        String(sideFlag),
        getDvPlayerNumber(player, idx),
        String(idx + 1),
        ...setCols,
        "",
        "",
        dvCode,
        lastName,
        firstName,
        "",
        player.role === "L" ? "L" : "",
        player.isCaptain ? "1" : "",
        "False",
        "",
        "",
        ""
      ].join(";")
    );
  });
  return rows;
}
function buildDataVolleySetRows(setNumbers) {
  return Array.from({ length: 5 }, (_, idx) => {
    const setNum = idx + 1;
    if (!(setNumbers || []).includes(setNum)) return "True;;;;;;";
    const score = computePointsSummary(setNum, { includeOverrides: true });
    const finalLabel = `${score.totalFor || 0}-${score.totalAgainst || 0}`;
    return `True;;;;${finalLabel};`;
  });
}
function buildDataVolleyDvwString() {
  syncEventPlayerLinks(state.events || []);
  const ourTeam = getDataVolleyTeamPayload("our");
  const opponentTeam = getDataVolleyTeamPayload("opponent");
  const setNumbers = Array.from(
    new Set(
      []
        .concat(getPlayedSetNumbers ? getPlayedSetNumbers() : [])
        .concat(Object.keys(state.setStarts || {}).map(key => parseInt(key, 10)).filter(Boolean))
        .concat(Object.keys(state.setResults || {}).map(key => parseInt(key, 10)).filter(Boolean))
    )
  ).sort((a, b) => a - b);
  const ourCode = sanitizeDvField(ourTeam.officialCode).toUpperCase() || buildDvTeamCode(ourTeam.name, "OUR");
  const oppCode = sanitizeDvField(opponentTeam.officialCode).toUpperCase() || buildDvTeamCode(opponentTeam.name, "OPP");
  const matchDate = formatDvDate(state.match && state.match.date);
  const season = (() => {
    const raw = sanitizeDvField(state.match && state.match.date);
    const date = raw ? new Date(raw) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const next = year + 1;
    return `${year}/${next}`;
  })();
  const scoutRows = buildDataVolleyScoutRows(state.events || [], ourTeam, opponentTeam, setNumbers);
  const sections = [];
  sections.push("[3DATAVOLLEYSCOUT]");
  sections.push("FILEFORMAT: 2.0");
  sections.push(`GENERATOR-DAY: ${formatDvDateTime(new Date())}`);
  sections.push("GENERATOR-IDP: DVW");
  sections.push("GENERATOR-PRG: VolleyEye");
  sections.push(`GENERATOR-REL: ${window.__APP_VERSION__ && window.__APP_VERSION__.version ? window.__APP_VERSION__.version : "custom"}`);
  sections.push("GENERATOR-VER: Custom");
  sections.push(`GENERATOR-NAM: ${sanitizeDvField(ourTeam.staff && ourTeam.staff.manager) || "VolleyEye"}`);
  sections.push(`LASTCHANGE-DAY: ${formatDvDateTime(new Date())}`);
  sections.push("LASTCHANGE-IDP: datavolley");
  sections.push("LASTCHANGE-PRG: volleyeye");
  sections.push(`LASTCHANGE-REL: ${window.__APP_VERSION__ && window.__APP_VERSION__.version ? window.__APP_VERSION__.version : "custom"}`);
  sections.push("LASTCHANGE-VER: ");
  sections.push("LASTCHANGE-NAM: ");
  sections.push("[3MATCH]");
  sections.push(
    [
      matchDate,
      "",
      season,
      sanitizeDvField(state.match && state.match.category),
      sanitizeDvField(state.match && state.match.matchType),
      "",
      "",
      "",
      "UTF-8",
      "1",
      "Z",
      "0",
      ""
    ].join(";")
  );
  sections.push(["", "", sanitizeDvField(state.selectedMatch || ""), "", "", "", "", "", ""].join(";"));
  sections.push("[3TEAMS]");
  sections.push(
    [
      ourCode,
      sanitizeDvField(ourTeam.name),
      String(computeSetWinScore().for || 0),
      sanitizeDvField(ourTeam.staff && ourTeam.staff.headCoach),
      sanitizeDvField(ourTeam.staff && ourTeam.staff.assistantCoach),
      "16777215",
      ""
    ].join(";")
  );
  sections.push(
    [
      oppCode,
      sanitizeDvField(opponentTeam.name),
      String(computeSetWinScore().against || 0),
      sanitizeDvField(opponentTeam.staff && opponentTeam.staff.headCoach),
      sanitizeDvField(opponentTeam.staff && opponentTeam.staff.assistantCoach),
      "16777215",
      ""
    ].join(";")
  );
  sections.push("[3MORE]");
  sections.push(
    [
      sanitizeDvField(ourTeam.staff && ourTeam.staff.assistantCoach),
      sanitizeDvField(ourTeam.staff && ourTeam.staff.manager),
      "",
      "",
      sanitizeDvField(ourTeam.name),
      sanitizeDvField(state.match && state.match.notes),
      sanitizeDvField(ourTeam.staff && ourTeam.staff.manager),
      ""
    ].join(";")
  );
  sections.push(";0;0;");
  sections.push("[3COMMENTS]");
  sections.push(sanitizeDvField((state.match && state.match.notes) || "no comments") || "no comments");
  sections.push("[3SET]");
  buildDataVolleySetRows(setNumbers).forEach(row => sections.push(row));
  sections.push("[3PLAYERS-H]");
  buildDataVolleyPlayersRows(ourTeam, 0, setNumbers, "our").forEach(row => sections.push(row));
  sections.push("[3PLAYERS-V]");
  buildDataVolleyPlayersRows(opponentTeam, 1, setNumbers, "opponent").forEach(row => sections.push(row));
  sections.push("[3ATTACKCOMBINATION]");
  getStoredDvwSectionLines("dvwAttackCombinations", DEFAULT_DVW_ATTACK_COMBINATIONS).forEach(row => sections.push(row));
  sections.push("[3SETTERCALL]");
  getStoredDvwSectionLines("dvwSetterCalls", DEFAULT_DVW_SETTER_CALLS).forEach(row => sections.push(row));
  sections.push("[3WINNINGSYMBOLS]");
  getStoredDvwSectionLines("dvwWinningSymbols", DEFAULT_DVW_WINNING_SYMBOLS).forEach(row => sections.push(row));
  sections.push("[3RESERVE]");
  getStoredDvwSectionLines("dvwReserve", []).forEach(row => sections.push(row));
  sections.push("[3VIDEO]");
  getStoredDvwSectionLines("dvwVideo", []).forEach(row => sections.push(row));
  sections.push("[3SCOUT]");
  scoutRows.forEach(row => sections.push(row));
  return sections.join("\n");
}
async function exportDataVolleyToFile() {
  const dvw = buildDataVolleyDvwString();
  if (!dvw.trim()) {
    alert("Nessun dato da esportare in formato DataVolley.");
    return;
  }
  const blob = new Blob([dvw], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, "match_" + safeMatchSlug() + ".dvw");
  if (typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("match_exported", { export_format: "datavolley" });
  }
}
