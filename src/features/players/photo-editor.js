import { session } from "../state/players-photo-editor.js";

import { PLAYER_PHOTO_EXPORT_SIZE, loadImageElement } from '../../../js/globals.js';
import { playerPhotoStore } from '../../state/roster-import-store.mjs';


const photoState = session;

export function syncPlayerPhotoBaseScale() {
  if (!photoState.playerPhotoEditorState.image || !photoState.elPlayerPhotoStage) return;
  const cropSize = Math.max(1, photoState.elPlayerPhotoStage.clientWidth || 320);
  photoState.playerPhotoEditorState.baseScale = Math.max(
    cropSize / photoState.playerPhotoEditorState.image.naturalWidth,
    cropSize / photoState.playerPhotoEditorState.image.naturalHeight
  );
}

export function setPlayerPhotoModalOpen(isOpen) {
  if (!photoState.elPlayerPhotoModal) return;
  setReactPlayerPhotoOpen(isOpen);
}

export function clampPlayerPhotoOffsets() {
  if (!photoState.playerPhotoEditorState.image || !photoState.elPlayerPhotoStage) return;
  const cropSize = Math.max(1, photoState.elPlayerPhotoStage.clientWidth || 320);
  const scale = photoState.playerPhotoEditorState.baseScale * photoState.playerPhotoEditorState.zoom;
  const imgWidth = photoState.playerPhotoEditorState.image.naturalWidth * scale;
  const imgHeight = photoState.playerPhotoEditorState.image.naturalHeight * scale;
  const maxOffsetX = Math.max(0, (imgWidth - cropSize) / 2);
  const maxOffsetY = Math.max(0, (imgHeight - cropSize) / 2);
  photoState.playerPhotoEditorState.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, photoState.playerPhotoEditorState.offsetX));
  photoState.playerPhotoEditorState.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, photoState.playerPhotoEditorState.offsetY));
}

export function renderPlayerPhotoEditor() {
  if (!photoState.elPlayerPhotoImage || !photoState.elPlayerPhotoStage || !photoState.playerPhotoEditorState.image) return;
  syncPlayerPhotoBaseScale();
  clampPlayerPhotoOffsets();

  publishPlayerPhotoView();
}

export function closePlayerPhotoEditor(result = null) {
  if (photoState.playerPhotoEditorState.sourceUrl && photoState.playerPhotoEditorState.sourceUrl.startsWith("blob:")) {
    URL.revokeObjectURL(photoState.playerPhotoEditorState.sourceUrl);
  }
  const resolve = photoState.playerPhotoEditorState.resolve;
  photoState.playerPhotoEditorState.resolve = null;
  photoState.playerPhotoEditorState.image = null;
  photoState.playerPhotoEditorState.sourceUrl = "";
  photoState.playerPhotoEditorState.baseScale = 1;
  photoState.playerPhotoEditorState.zoom = 1;
  photoState.playerPhotoEditorState.offsetX = 0;
  photoState.playerPhotoEditorState.offsetY = 0;
  photoState.playerPhotoEditorState.pointerId = null;
  photoState.playerPhotoEditorState.allowRemove = false;

  setPlayerPhotoModalOpen(false);
  if (typeof resolve === "function") {
    resolve(result);
  }
}

export function exportPlayerPhotoDataUrl(options = {}) {
  if (!photoState.playerPhotoEditorState.image || !photoState.elPlayerPhotoStage) {
    throw new Error("player-photo-not-ready");
  }
  const size = Number(options.size) > 0 ? Number(options.size) : PLAYER_PHOTO_EXPORT_SIZE;
  const quality = Number(options.quality) > 0 ? Math.min(0.9, Number(options.quality)) : 0.72;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unavailable");
  const cropSize = Math.max(1, photoState.elPlayerPhotoStage.clientWidth || 320);
  const img = photoState.playerPhotoEditorState.image;
  const scale = photoState.playerPhotoEditorState.baseScale * photoState.playerPhotoEditorState.zoom;
  const displayWidth = img.naturalWidth * scale;
  const displayHeight = img.naturalHeight * scale;
  const left = cropSize / 2 - displayWidth / 2 + photoState.playerPhotoEditorState.offsetX;
  const top = cropSize / 2 - displayHeight / 2 + photoState.playerPhotoEditorState.offsetY;
  const sourceX = Math.max(0, (-left / displayWidth) * img.naturalWidth);
  const sourceY = Math.max(0, (-top / displayHeight) * img.naturalHeight);
  const sourceW = Math.min(img.naturalWidth, (cropSize / displayWidth) * img.naturalWidth);
  const sourceH = Math.min(img.naturalHeight, (cropSize / displayHeight) * img.naturalHeight);
  ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function openPlayerPhotoEditor(sourceUrl, options = {}) {
  if (!sourceUrl) return null;
  if (!photoState.elPlayerPhotoModal || !photoState.elPlayerPhotoStage || !photoState.elPlayerPhotoImage || !photoState.elPlayerPhotoZoom) {
    throw new Error("player-photo-modal-missing");
  }
  if (typeof photoState.playerPhotoEditorState.resolve === "function") {
    closePlayerPhotoEditor(null);
  }
  const img = await loadImageElement(sourceUrl);
  photoState.playerPhotoEditorState.image = img;
  photoState.playerPhotoEditorState.sourceUrl = sourceUrl;
  photoState.playerPhotoEditorState.baseScale = 1;
  photoState.playerPhotoEditorState.zoom = 1;
  photoState.playerPhotoEditorState.offsetX = 0;
  photoState.playerPhotoEditorState.offsetY = 0;
  photoState.playerPhotoEditorState.allowRemove = !!options.allowRemove;

  setReactPlayerPhotoOpen(true,options);
  requestAnimationFrame(() => renderPlayerPhotoEditor());
  return new Promise(resolve => {
    photoState.playerPhotoEditorState.resolve = resolve;
  });
}

export async function preparePlayerPhotoDataUrl(file, options = {}) {
  if (!file) return "";
  const type = String(file.type || "").toLowerCase();
  if (!type.startsWith("image/")) {
    throw new Error("invalid-image");
  }
  const sourceUrl = URL.createObjectURL(file);
  try {
    const edited = await openPlayerPhotoEditor(sourceUrl, options);
    return edited || "";
  } catch (error) {
    URL.revokeObjectURL(sourceUrl);
    throw error;
  }
}

export function handlePlayerPhotoPointerDown(ev) {
  if (!photoState.playerPhotoEditorState.image || !photoState.elPlayerPhotoStage || !(ev.target instanceof HTMLElement)) return;
  photoState.playerPhotoEditorState.pointerId = ev.pointerId;
  photoState.playerPhotoEditorState.dragStartX = ev.clientX;
  photoState.playerPhotoEditorState.dragStartY = ev.clientY;
  photoState.playerPhotoEditorState.dragOriginX = photoState.playerPhotoEditorState.offsetX;
  photoState.playerPhotoEditorState.dragOriginY = photoState.playerPhotoEditorState.offsetY;
  photoState.elPlayerPhotoStage.classList.add("dragging");
  if (photoState.elPlayerPhotoStage.setPointerCapture) {
    photoState.elPlayerPhotoStage.setPointerCapture(ev.pointerId);
  }
  ev.preventDefault();
}

export function handlePlayerPhotoPointerMove(ev) {
  if (photoState.playerPhotoEditorState.pointerId !== ev.pointerId) return;
  photoState.playerPhotoEditorState.offsetX = photoState.playerPhotoEditorState.dragOriginX + (ev.clientX - photoState.playerPhotoEditorState.dragStartX);
  photoState.playerPhotoEditorState.offsetY = photoState.playerPhotoEditorState.dragOriginY + (ev.clientY - photoState.playerPhotoEditorState.dragStartY);
  renderPlayerPhotoEditor();
}

export function handlePlayerPhotoPointerUp(ev) {
  if (photoState.playerPhotoEditorState.pointerId !== ev.pointerId) return;
  photoState.playerPhotoEditorState.pointerId = null;
  if (photoState.elPlayerPhotoStage && photoState.elPlayerPhotoStage.releasePointerCapture) {
    try {
      photoState.elPlayerPhotoStage.releasePointerCapture(ev.pointerId);
    } catch (_) {}
  }
  if (photoState.elPlayerPhotoStage) {
    photoState.elPlayerPhotoStage.classList.remove("dragging");
  }
}

export function publishPlayerPhotoView() {
  const model = photoState.playerPhotoEditorState;
  playerPhotoStore.publish({
    source: model.sourceUrl,
    zoom: model.zoom,
    allowRemove: model.allowRemove,
    transform: model.image
      ? `translate(calc(-50% + ${model.offsetX}px), calc(-50% + ${model.offsetY}px)) scale(${model.baseScale * model.zoom})`
      : "",
  });
}

export function setReactPlayerPhotoOpen(open, options = {}) {
  publishPlayerPhotoView();
  playerPhotoStore.publish({ open, maxZoom: options.maxZoom || 3 });
}
