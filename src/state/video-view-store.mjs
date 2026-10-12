// Only presentation data; event archives and media objects remain in their services.
let snapshot = Object.freeze({
  youtubeUrl: "",
  localSource: "",
  youtubeId: "",
  hasSource: false,
  playByPlay: false,
  filterCount: 0,
  resultCount: 0,
  previousDisabled: true,
  nextDisabled: true,
  selectionCount: 0,
  overlay: "",
  overlayVisible: false,
});
const listeners = new Set();
export const videoViewStore = {
  getSnapshot: () => snapshot,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  publish(patch) {
    if (Object.keys(patch).every((key) => Object.is(snapshot[key], patch[key])))
      return;
    snapshot = Object.freeze({ ...snapshot, ...patch });
    listeners.forEach((listener) => listener());
  },
};
