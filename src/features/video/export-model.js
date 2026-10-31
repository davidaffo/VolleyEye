export function getFileBasename(name) {
  if (!name) return "";
  const cleaned = String(name).split(/[\\/]/).pop();
  return cleaned || "";
}

export function getFileExtension(name) {
  const base = getFileBasename(name);
  const idx = base.lastIndexOf(".");
  if (idx > 0 && idx < base.length - 1) return base.slice(idx);
  return "";
}

export function stripFileExtension(name) {
  const base = getFileBasename(name);
  const idx = base.lastIndexOf(".");
  if (idx > 0) return base.slice(0, idx);
  return base;
}

export function sanitizeVideoOutputBase(name) {
  return String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 120);
}
