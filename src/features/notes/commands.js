import { session as matchState } from "../../../js/globals.js";
import { getEventKey } from "../../domain/event-key.js";
import {
  normalizeMatchNotes,
  findNoteAnchorKey,
} from "../../domain/match-notes.js";
import { computePointsSummary } from "../analysis/scores.js";
import { saveState } from "../storage/save-state.js";
import { renderEventsLog } from "../events/log-view.js";
import {
  getActiveVideoPlaybackSeconds,
  seekVideoToTime,
} from "../video/media-state.js";
import { computeEventVideoTime } from "../video/timing.js";
import { getVideoBaseTimeMs } from "../video/event-model.js";

function saveNotes(notes, suppressScroll = true) {
  matchState.state.notes = notes;
  saveState({ persistLocal: true });
  renderEventsLog({ suppressScroll });
}

export function addMatchNote(text) {
  if (typeof text !== "string" || !text.trim()) return false;
  const notes = normalizeMatchNotes(matchState.state.notes);
  const score = computePointsSummary(matchState.state.currentSet || 1);
  notes.push({
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: text.trim(),
    t: new Date().toISOString(),
    set: matchState.state.currentSet || 1,
    homeScore: score.totalFor,
    visitorScore: score.totalAgainst,
    resolved: false,
    precedingEventKeys: (matchState.state.events || []).map((event, index) =>
      String(getEventKey(event, index)),
    ),
    videoTime: matchState.state.videoScoutMode
      ? getActiveVideoPlaybackSeconds()
      : null,
  });
  saveNotes(notes, false);
  return true;
}

export function resolveMatchNote(id, resolved) {
  saveNotes(
    normalizeMatchNotes(matchState.state.notes).map((note) =>
      note.id === id ? { ...note, resolved: !!resolved } : note,
    ),
  );
}

export function deleteMatchNote(id) {
  saveNotes(
    normalizeMatchNotes(matchState.state.notes).filter(
      (note) => note.id !== id,
    ),
  );
}

export function seekMatchNote(id) {
  const note = normalizeMatchNotes(matchState.state.notes).find(
    (note) => note.id === id,
  );
  if (!note) return;
  const events = matchState.state.events || [];
  const key = findNoteAnchorKey(note, events.map(getEventKey));
  const anchor = events.find(
    (event, index) => String(getEventKey(event, index)) === key,
  );
  if (note.videoTime !== null)
    seekVideoToTime(note.videoTime, { preservePlayback: true });
  else if (anchor)
    seekVideoToTime(computeEventVideoTime(anchor, getVideoBaseTimeMs()), {
      preservePlayback: true,
    });
}
