

export function normalizeSetTypeValue(val) {
  if (!val) return null;
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") {
    if (val.set_type) return String(val.set_type).trim();
    if (val.setType) return String(val.setType).trim();
    if (val.type) return String(val.type).trim();
  }
  return String(val).trim();
}
