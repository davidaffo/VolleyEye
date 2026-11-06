import { session as matchState } from "../../../js/globals.js";
import { matchNotesStore } from "../../state/match-notes-store.mjs";
import {
  normalizeMatchNotes,
  findNoteAnchorKey,
} from "../../domain/match-notes.js";
import { getEventKey } from "../../domain/event-key.js";

export function publishMatchNotes() {
  const keys = (matchState.state.events || []).map(getEventKey);
  const notes = normalizeMatchNotes(matchState.state.notes).map((note) => ({
    ...note,
    anchorKey: findNoteAnchorKey(note, keys),
    afterEventLabel: note.precedingEventKeys.at(-1) || "",
  }));
  matchNotesStore.publish({
    notes,
    unresolved: notes.filter((note) => !note.resolved).length,
    matchKey:
      matchState.state.loadedMatchName || matchState.state.selectedMatch || "",
  });
}
