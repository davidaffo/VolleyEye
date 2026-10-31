

export function padDv(value, size = 2) {
  const num = parseInt(value, 10);
  if (!Number.isFinite(num)) return String(value || "").padStart(size, "0").slice(-size);
  return String(Math.max(0, num)).padStart(size, "0").slice(-size);
}

export function sanitizeDvField(value) {
  return String(value || "")
    .replace(/[;\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDvwZoneMeta(zonePair) {
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

export function parseDvwSuffixMeta(skillLetter, inlineCode = "", suffix = "") {
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
