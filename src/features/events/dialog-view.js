import { bulkEditStore, videoScoreStore, ffmpegEncoderStore } from "../../state/roster-import-store.mjs";
import { buildReactBulkControl } from "./editor-controls.js";
import { setModalOpenState } from "../layout/modals.js";

export function openReactBulkEditor(config, proxy, events, context, key) {
  bulkEditStore.publish({
    open: true,
    title: "Modifica multipla: " + config.label,
    hint: "Applica a " + events.length + " skill selezionate.",
    control: Object.freeze(buildReactBulkControl(proxy, key, context)),
  });
  setModalOpenState(true);
}

export function closeReactBulkEditor() {
  bulkEditStore.publish({ open: false, control: null, hint: "" });
}

export function openReactVideoScore(home, away) {
  videoScoreStore.publish({
    open: true,
    home: String(home),
    away: String(away),
  });
  setModalOpenState(true);
}

export function closeReactVideoScore() {
  videoScoreStore.publish({ open: false });
}

export function chooseReactFfmpegEncoder() {
  return new Promise((resolve) => {
    let settled = false;
    ffmpegEncoderStore.publish({
      open: true,
      choose: (choice) => {
        if (settled) return;
        settled = true;
        ffmpegEncoderStore.publish({ open: false, choose: null });
        setModalOpenState(false);
        resolve(choice);
      },
    });
    setModalOpenState(true);
  });
}
