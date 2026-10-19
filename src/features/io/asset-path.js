export function resolveExportAssetPath(path) {
  if (!path) return path;
  if (typeof window === "undefined") return path;
  const map = window.__analysisAssetMap;
  return map && map[path] ? map[path] : path;
}
