import { snapshotVideoFilters } from "./video-filter-model.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { publishReactVideoPresets } from "./video-preset-view.js";

import {
  ensureVideoFilterPresetsState,
  applyVideoFilterSnapshot,
} from "./video-filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { session as matchState } from "../../../js/globals.js";
import {
  renderVideoAnalysis,
  focusFirstFilteredVideoEventMobile,
} from "../video/playback.js";
import { saveState } from "../storage/save-state.js";

export function applyReactVideoPreset(id) {
  const entry = ensureVideoFilterPresetsState().find(
    (entry) => entry.id === id,
  );
  if (!entry) return;
  analysisFiltersState.activeVideoFilterPresetId = id;
  applyVideoFilterSnapshot(entry.filters || {});
  renderVideoAnalysis();
  focusFirstFilteredVideoEventMobile();
  saveState({ persistLocal: true });
}

export function renameReactVideoPreset(id, value) {
  const entry = ensureVideoFilterPresetsState().find(
    (entry) => entry.id === id,
  );
  if (!entry) return;
  const name = typeof value === "string" ? value.trim() : "";
  if (name) {
    entry.name = name.slice(0, 40);
    saveState({ persistLocal: true });
  }
  publishReactVideoPresets();
}

export function removeReactVideoPreset(id) {
  if (analysisFiltersState.activeVideoFilterPresetId === id)
    analysisFiltersState.activeVideoFilterPresetId = null;
  matchState.state.videoFilterPresets = ensureVideoFilterPresetsState().filter(
    (entry) => entry.id !== id,
  );
  saveState({ persistLocal: true });
  publishReactVideoPresets();
}

export function reorderReactVideoPresets(ids) {
  const presets = ensureVideoFilterPresetsState(),
    order = ids
      .map((id) => presets.find((entry) => entry.id === id))
      .filter(Boolean);
  presets.forEach((entry) => {
    if (!ids.includes(entry.id)) order.push(entry);
  });
  matchState.state.videoFilterPresets = order;
  saveState({ persistLocal: true });
}

export function saveCurrentVideoFilterPreset(nameOverride) {
  const presets = ensureVideoFilterPresetsState();
  const rawName =
    typeof nameOverride === "string"
      ? nameOverride.trim()
      : scoutUiState.elVideoFilterPresetName
        ? String(scoutUiState.elVideoFilterPresetName.value || "").trim()
        : "";
  const name = rawName || "Preset " + (presets.length + 1);
  const entry = {
    id:
      "vf_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 7),
    name,
    filters: snapshotVideoFilters(),
  };
  presets.push(entry);

  saveState({ persistLocal: true });
  publishReactVideoPresets();
}
