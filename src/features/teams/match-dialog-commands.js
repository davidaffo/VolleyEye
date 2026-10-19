import { matchDialogStore } from "../../state/match-dialog-store.mjs";
import { session as archiveActionsState } from "../state/teams-storage-archive-actions.js";
import { saveMatchDetailsFromSetup, createNewMatchFromSetup, closeNewMatchModal } from "./storage/archive-actions.js";

export function submitReactMatchDialog() {
  const view = matchDialogStore.getSnapshot();
  if (!view.open) return false;
  const setup = { ...view.draft };
  archiveActionsState.matchDetailsArchiveName = view.archiveName;
  const saved =
    view.mode === "edit"
      ? saveMatchDetailsFromSetup(setup)
      : createNewMatchFromSetup(setup);
  if (saved) closeNewMatchModal();
  return saved;
}
