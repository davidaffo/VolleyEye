// Notes belong to the match, independently of its statistical events.
export function normalizeMatchNotes(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .filter((note) => {
      if (
        !note ||
        typeof note.id !== "string" ||
        seen.has(note.id) ||
        typeof note.text !== "string" ||
        !note.text.trim()
      )
        return false;
      seen.add(note.id);
      return true;
    })
    .map((note) => ({
      id: note.id,
      text: note.text.trim(),
      t: typeof note.t === "string" ? note.t : "",
      set: Math.min(5, Math.max(1, Number(note.set) || 1)),
      homeScore: Math.max(0, Number(note.homeScore) || 0),
      visitorScore: Math.max(0, Number(note.visitorScore) || 0),
      resolved: note.resolved === true,
      precedingEventKeys: Array.isArray(note.precedingEventKeys)
        ? note.precedingEventKeys
            .filter((key) => typeof key === "string" || typeof key === "number")
            .map(String)
        : [],
      videoTime:
        typeof note.videoTime === "number" && Number.isFinite(note.videoTime)
          ? Math.max(0, note.videoTime)
          : null,
    }));
}

// If an action is deleted, keep the note after the nearest surviving predecessor.
export function findNoteAnchorKey(note, eventKeys) {
  const available = new Set(eventKeys.map(String));
  for (let index = note.precedingEventKeys.length - 1; index >= 0; index--) {
    const key = String(note.precedingEventKeys[index]);
    if (available.has(key)) return key;
  }
  return null;
}
