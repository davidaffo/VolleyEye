import { session as scoutUiState } from "../state/scout-ui.js";
import { SKILLS, session as matchState } from "../../../js/globals.js";
import { getDefaultSkillDurationMs } from "./playback-model.js";
import { session as videoEventsState } from "../state/video-video-events.js";
import { videoEditStore } from "../../state/video-edit-store.mjs";
import { setGlobalModalState } from "../layout/modals.js";

export function openReactVideoEdit(kind) {
  let rows;
  if (kind === "offset")
    rows = [
      ...SKILLS.map((skill) => ({
        id: skill.id,
        label: skill.label,
        value: "0",
      })),
      { id: "__manual_error__", label: "Errori (manuale)", value: "0" },
    ];
  if (kind === "duration")
    rows = SKILLS.map((skill) => {
      const value = matchState.state.skillDurationLastApplied?.[skill.id];
      return {
        id: skill.id,
        label: skill.label,
        value: String(
          typeof value === "number" && isFinite(value) && value > 0
            ? value
            : getDefaultSkillDurationMs(),
        ),
      };
    });
  if (kind === "unify")
    rows = videoEventsState.LINK_TIME_OPTIONS.map((option) => ({
      id: option.type,
      label: option.label,
      enabled: true,
      value: option.source.id,
      options: Object.freeze([option.source, option.target]),
    }));
  videoEditStore.publish(kind, {
    open: true,
    rows: Object.freeze(rows.map((row) => Object.freeze(row))),
  });
  setGlobalModalState(true);
}

export function closeReactVideoEdit(kind) {
  videoEditStore.publish(kind, { open: false });
  setGlobalModalState(false);
}

export function readVideoEditInputs(kind) {
  return videoEditStore.getSnapshot()[kind].rows.map((row) => ({
    dataset: { skillId: row.id, linkType: row.id },
    value: row.value,
    checked: row.enabled,
  }));
}

export function clearCurrentEventEdit() {
  if (scoutUiState.currentEditControl) {
    try {
      scoutUiState.currentEditControl.blur();
    } catch (_) {
      // ignore
    }
  }
  if (!scoutUiState.currentEditCell) return false;
  scoutUiState.currentEditCell.dataset.editing = "false";
  scoutUiState.currentEditCell = null;
  scoutUiState.currentEditControl = null;
  return true;
}
