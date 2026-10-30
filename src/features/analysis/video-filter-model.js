import { session as matchState } from "../../../js/globals.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
export function ensureVideoFilterPresetsState() {
  if (!Array.isArray(matchState.state.videoFilterPresets)) {
    matchState.state.videoFilterPresets = [];
  }
  return matchState.state.videoFilterPresets;
}

export function getActiveVideoFilterPresetName() {
  if (!analysisFiltersState.activeVideoFilterPresetId) return "";
  const activePreset = ensureVideoFilterPresetsState().find(
    (entry) => entry.id === analysisFiltersState.activeVideoFilterPresetId,
  );
  return activePreset ? String(activePreset.name || "").trim() : "";
}

export function listFromSet(setObj, { asNumber = false } = {}) {
  const arr = Array.from(setObj || []);
  return asNumber
    ? arr.map((v) => Number(v)).filter(Number.isFinite)
    : arr.map((v) => String(v));
}

export function snapshotVideoFilters() {
  return Object.fromEntries(
    Object.entries(VIDEO_FILTER_FIELDS).map(([field, kind]) => [
      field,
      kind === "previous"
        ? analysisFiltersState.videoFilterState[field] || "any"
        : listFromSet(analysisFiltersState.videoFilterState[field], {
            asNumber: kind === "number",
          }),
    ]),
  );
}

export function countActiveVideoFilters(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return 0;
  return Object.entries(VIDEO_FILTER_FIELDS).reduce(
    (count, [field, kind]) =>
      count +
      (kind === "previous"
        ? snapshot[field] && snapshot[field] !== "any"
          ? 1
          : 0
        : Array.isArray(snapshot[field]) && snapshot[field].length
          ? 1
          : 0),
    0,
  );
}

export function applyVideoFilterSnapshot(snapshot) {
  const src = snapshot && typeof snapshot === "object" ? snapshot : {};
  for (const [field, kind] of Object.entries(VIDEO_FILTER_FIELDS)) {
    const values = Array.isArray(src[field]) ? src[field] : [];
    analysisFiltersState.videoFilterState[field] =
      kind === "previous"
        ? src[field] || "any"
        : new Set(
            kind === "number"
              ? values.map(Number).filter(Number.isFinite)
              : values.map(String),
          );
  }
}

// Property order also preserves the public snapshot field order.
export const VIDEO_FILTER_FIELDS = Object.freeze({
  teams: "string",
  players: "string",
  setters: "string",
  skills: "string",
  codes: "string",
  prevSkill: "previous",
  sets: "number",
  rotations: "number",
  zones: "number",
  bases: "string",
  setTypes: "string",
  phases: "string",
  receiveEvaluations: "string",
  receiveZones: "number",
  serveTypes: "string",
  attackTypes: "string",
});
