import { videoPresetsStore } from "../../state/roster-import-store.mjs";
import {
  ensureVideoFilterPresetsState,
  countActiveVideoFilters,
} from "./video-filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
export function publishReactVideoPresets() {
  videoPresetsStore.publish({
    entries: Object.freeze(
      ensureVideoFilterPresetsState().map((entry) =>
        Object.freeze({
          id: entry.id,
          name: entry.name,
          count: countActiveVideoFilters(entry.filters || {}),
          active: entry.id === analysisFiltersState.activeVideoFilterPresetId,
        }),
      ),
    ),
  });
}
