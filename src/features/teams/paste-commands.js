import { pastePlayersStore } from "../../state/roster-import-store.mjs";
import { teamEditorStore } from "../../state/team-editor-store.mjs";
import { setGlobalModalState } from "../layout/modals.js";
import { applyPlayersFromTextarea } from "../live/roster-entry.js";

export function closeManagedPlayersPaste() {
  pastePlayersStore.publish({ open: false });
  if (teamEditorStore.getSnapshot().open) return;
  setGlobalModalState(false);
}

export function applyManagedPlayersPaste(mode) {
  if (applyPlayersFromTextarea({ mode })) {
    closeManagedPlayersPaste();
    pastePlayersStore.publish({ text: "" });
  }
}
