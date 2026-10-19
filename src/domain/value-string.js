

export function valueToString(val) {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val) || typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch (_) {
      return String(val);
    }
  }
  return String(val);
}

export function parseInputValue(raw) {
  const str = (raw || "").trim();
  if (str === "") return null;
  // Try JSON first (for arrays/objects/booleans/null/numbers)
  try {
    return JSON.parse(str);
  } catch (_) {
    const num = parseFloat(str);
    if (!Number.isNaN(num)) return num;
    return str;
  }
}
