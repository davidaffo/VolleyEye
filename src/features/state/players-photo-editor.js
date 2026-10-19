import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"playerPhotoEditorState": () => ({
  resolve: null,
  image: null,
  sourceUrl: "",
  baseScale: 1,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  pointerId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
  allowRemove: false
})
}, {
"elPlayerPhotoModal": () => (document.getElementById("player-photo-modal")),
"elPlayerPhotoStage": () => (document.getElementById("player-photo-stage")),
"elPlayerPhotoImage": () => (document.getElementById("player-photo-image")),
"elPlayerPhotoZoom": () => (document.getElementById("player-photo-zoom"))
});
const photoState = session;
