import { resolveExportAssetPath } from "../io/asset-path.js";
import { getTrajectoryImageForZone } from "./trajectory-assets.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { mirrorTrajectoryPoint } from "../../domain/trajectory-geometry.js";
import { clamp01Val } from "./values.js";
import { isFarSideForScope } from "../teams/selectors.js";
import { getTrajectoryColorForCode } from "./trajectory-model.js";
export function getTrajectoryBg(zone, isFarSide, cb) {
  const far = typeof isFarSide === "function" ? false : !!isFarSide;
  const onLoad = typeof isFarSide === "function" ? isFarSide : cb;
  return getCachedTrajectoryImage(
    analysisFiltersState.trajectoryBgCache,
    String(zone) + "-" + (far ? "far" : "near"),
    resolveExportAssetPath(getTrajectoryImageForZone(zone, far)),
    onLoad,
  );
}

export function getServeTrajectoryImages(cb) {
  const images = (analysisFiltersState.serveTrajectoryImgs ||= {});
  for (const [key, path] of [
    ["start", scoutUiState.SERVE_START_IMG_NEAR],
    ["end", scoutUiState.SERVE_END_IMG_NEAR],
    ["startFar", scoutUiState.SERVE_START_IMG_FAR],
    ["endFar", scoutUiState.SERVE_END_IMG_FAR],
  ])
    getCachedTrajectoryImage(images, key, resolveExportAssetPath(path), cb);
  return images;
}

export function getAttackEmptyImage(isFarSide, cb) {
  return getCachedTrajectoryImage(
    analysisFiltersState.trajectoryBgCache,
    isFarSide ? "attack-empty-far" : "attack-empty-near",
    resolveExportAssetPath(
      isFarSide
        ? scoutUiState.TRAJECTORY_IMG_FAR
        : scoutUiState.TRAJECTORY_IMG_NEAR,
    ),
    cb,
  );
}

export function drawServeTrajectoryCanvas(
  canvas,
  visual,
  events,
  { scope, isFarServe, onImagesLoad } = {},
) {
  if (!canvas || !visual) return;
  const redraw =
    onImagesLoad ||
    (() =>
      drawServeTrajectoryCanvas(canvas, visual, events, { scope, isFarServe }));
  const imgs = getServeTrajectoryImages(redraw);
  const farFlag =
    typeof isFarServe === "boolean"
      ? isFarServe
      : scope
        ? isFarSideForScope(scope)
        : false;
  const startImg = imgs && (farFlag ? imgs.startFar : imgs.start);
  const endImg = imgs && (farFlag ? imgs.endFar : imgs.end);
  const startRatio =
    startImg && startImg.naturalWidth
      ? startImg.naturalHeight / startImg.naturalWidth
      : 0.65;
  const endRatio =
    endImg && endImg.naturalWidth
      ? endImg.naturalHeight / endImg.naturalWidth
      : 0.65;
  const width =
    (canvas.parentElement && canvas.parentElement.clientWidth) ||
    (startImg && startImg.naturalWidth) ||
    (endImg && endImg.naturalWidth) ||
    320;
  const startHeight = Math.max(80, Math.round(width * startRatio));
  const endHeight = Math.max(80, Math.round(width * endRatio));
  const gapOverlapPx = Math.round(width / 9);
  const gapHeight = Math.max(0, startHeight - Math.round(startHeight / 9));
  const gapCut = Math.min(gapOverlapPx, Math.max(0, gapHeight - 1));
  const effectiveGap = Math.max(0, gapHeight - gapCut);
  const height = startHeight + effectiveGap + endHeight;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  const gapImg = getAttackEmptyImage(!farFlag, redraw);
  const overlap = gapCut;
  if (farFlag) {
    if (gapHeight > 0) {
      const gapStart = startHeight - overlap;
      if (gapImg && gapImg.complete && gapImg.naturalWidth) {
        ctx.drawImage(
          gapImg,
          0,
          0,
          gapImg.naturalWidth,
          gapImg.naturalHeight,
          0,
          gapStart,
          width,
          gapHeight,
        );
      } else {
        ctx.fillStyle = "#ffb142";
        ctx.fillRect(0, gapStart, width, Math.max(1, gapHeight));
      }
    }
    if (startImg && startImg.complete && startImg.naturalWidth) {
      ctx.drawImage(startImg, 0, 0, width, startHeight);
    }
    if (endImg && endImg.complete && endImg.naturalWidth) {
      ctx.drawImage(endImg, 0, startHeight + effectiveGap, width, endHeight);
    }
  } else {
    if (endImg && endImg.complete && endImg.naturalWidth) {
      ctx.drawImage(endImg, 0, 0, width, endHeight);
    }
    if (gapHeight > 0) {
      const gapStart = endHeight;
      if (gapImg && gapImg.complete && gapImg.naturalWidth) {
        ctx.drawImage(
          gapImg,
          0,
          0,
          gapImg.naturalWidth,
          gapImg.naturalHeight,
          0,
          gapStart,
          width,
          gapHeight,
        );
      } else {
        ctx.fillStyle = "#ffb142";
        ctx.fillRect(0, gapStart, width, Math.max(1, gapHeight));
      }
    }
    if (startImg && startImg.complete && startImg.naturalWidth) {
      ctx.drawImage(startImg, 0, endHeight + effectiveGap, width, startHeight);
    }
  }
  const netY = farFlag ? startHeight + effectiveGap : endHeight;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 8;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(0, netY);
  ctx.lineTo(width, netY);
  ctx.stroke();
  ctx.setLineDash([]);
  if (!events || events.length === 0) {
    visual.classList.add("empty");
    return;
  }
  visual.classList.remove("empty");
  events.forEach((ev) => {
    const startRaw = ev.serveStart;
    const endRaw = ev.serveEnd;
    const start =
      farFlag && startRaw ? mirrorTrajectoryPoint(startRaw) : startRaw;
    const end = farFlag && endRaw ? mirrorTrajectoryPoint(endRaw) : endRaw;
    if (!start || !end) return;
    const sx = clamp01Val(start.x) * width;
    const sy =
      clamp01Val(start.y) * startHeight +
      (farFlag ? 0 : endHeight + effectiveGap);
    const ex = clamp01Val(end.x) * width;
    const ey =
      clamp01Val(end.y) * endHeight +
      (farFlag ? startHeight + effectiveGap : 0);
    ctx.strokeStyle = getTrajectoryColorForCode(ev.code, "serve");
    ctx.lineWidth = analysisFiltersState.TRAJECTORY_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  });
}

const pendingImageCallbacks = new WeakMap();

function getCachedTrajectoryImage(cache, key, source, onLoad) {
  let image = cache[key];
  if (!image) cache[key] = image = new Image();
  if (onLoad && (!image.src || !image.complete)) {
    let callbacks = pendingImageCallbacks.get(image);
    if (!callbacks) {
      pendingImageCallbacks.set(image, (callbacks = new Set()));
      image.onload = (event) => {
        const ready = [...callbacks];
        callbacks.clear();
        ready.forEach((callback) => callback(event));
      };
    }
    callbacks.add(onLoad);
  }
  if (!image.src) image.src = source;
  return image;
}
