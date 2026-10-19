import { createViewStore } from './view-store.mjs';

// Only presentation data; event archives and media objects remain in their services.
export const videoViewStore = createViewStore({
  youtubeUrl: '',
  localSource: '',
  youtubeId: '',
  hasSource: false,
  playByPlay: false,
  filterCount: 0,
  resultCount: 0,
  previousDisabled: true,
  nextDisabled: true,
  selectionCount: 0,
  overlay: '',
  overlayVisible: false,
});
