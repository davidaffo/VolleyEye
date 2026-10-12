import { runtimeStore } from "../state/runtime-store.mjs";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { videoViewStore } from "../state/video-view-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../compat/runtime.js";
const run = (command, ...args) =>
  invokeRuntime(command, ...args).catch(console.error);
const useVideoView = () =>
  useSyncExternalStore(
    videoViewStore.subscribe,
    videoViewStore.getSnapshot,
    videoViewStore.getSnapshot,
  );
const actions = {
  "btn-clear-video": ["clearLoadedVideo"],
  "btn-sync-first-skill": ["syncFirstSkillToVideo"],
  "btn-copy-ffmpeg": ["copyFfmpegFromSelection"],
  "btn-fix-video-score": ["openVideoScoreModal"],
  "btn-video-add-event": ["addEmptyVideoEventAfterSelection"],
  "btn-offset-skills": ["openOffsetModal"],
  "btn-unify-times": ["openUnifyTimesModal"],
  "btn-skill-duration": ["openSkillDurationModal"],
  "btn-video-undo": ["undoLastVideoEdit"],
  "btn-video-frame-prev": ["stepActiveVideoByFrame", -1],
  "btn-video-frame-next": ["stepActiveVideoByFrame", 1],
  "video-mobile-filter-open": ["openVideoMobileFilters"],
  "video-mobile-filter-close": ["closeVideoMobileFilters"],
  "video-mobile-filter-backdrop": ["closeVideoMobileFilters"],
  "video-mobile-filter-apply": ["applyReactVideoMobileFilters"],
};
export function VideoActionButton({ id, children, ...props }) {
  return (
    <button
      {...props}
      id={id}
      data-react-managed="true"
      onClick={() => run(...actions[id])}
    >
      {children}
    </button>
  );
}
export function VideoSourceControls({ scout = false }) {
  const view = useVideoView(),
    suffix = scout ? "-scout" : "";
  const controls = useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
  const [url, setUrl] = useState(view.youtubeUrl);
  useEffect(() => setUrl(view.youtubeUrl), [view.youtubeUrl]);
  const load = () => run("handleYoutubeUrlLoad", url);
  return (
    <>
      <label
        id={"video-file-picker" + suffix}
        className="file-btn"
        htmlFor={"video-file-input" + suffix}
        data-react-managed="true"
        onClick={(event) => {
          if (typeof window.showOpenFilePicker === "function") {
            event.preventDefault();
            invokeRuntimeEvent("openReactVideoPicker", scout);
          }
        }}
      >
        Carica video
      </label>
      <input
        id={"video-file-input" + suffix}
        type="file"
        accept="video/*"
        hidden
        data-react-managed="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) run("handleVideoFileChange", file);
          event.target.value = "";
        }}
      />
      {!scout && (
        <>
          <VideoActionButton
            id="btn-clear-video"
            className="danger"
            type="button"
          >
            Rimuovi video
          </VideoActionButton>
          <VideoActionButton id="btn-sync-first-skill" className="secondary">
            Sincronizza prima skill
          </VideoActionButton>
          <VideoActionButton id="btn-copy-ffmpeg" className="secondary">
            Copia ffmpeg veloce + overlay
          </VideoActionButton>
          <label className="auto-rotate-toggle">
            <input
              id="video-playbyplay-toggle"
              type="checkbox"
              data-react-managed="true"
              checked={view.playByPlay}
              onChange={(event) =>
                run("changeReactVideoPlayByPlay", event.target.checked)
              }
            />{" "}
            Play by play
          </label>
        </>
      )}
      <div className="youtube-input">
        <input
          id={"youtube-url-input" + suffix}
          type="url"
          placeholder="https://youtu.be/..."
          data-react-managed="true"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              load();
            }
          }}
        />
        <button
          id={"btn-load-youtube" + suffix}
          disabled={scout && !!controls.scoutControlsDisabled}
          className="secondary"
          data-react-managed="true"
          onClick={load}
        >
          Usa YouTube
        </button>
      </div>
    </>
  );
}
export function VideoMobileSourceButton() {
  const view = useVideoView();
  return (
    <button
      id="video-mobile-source-open"
      className="secondary video-mobile-source-open"
      type="button"
      data-react-managed="true"
      onClick={() => run("openVideoMobileSourceModal")}
    >
      {view.hasSource ? "Cambia video" : "Scegli video"}
    </button>
  );
}
export function VideoMobileNavigation({ direction, ...props }) {
  const view = useVideoView();
  return (
    <button
      {...props}
      data-react-managed="true"
      disabled={direction < 0 ? view.previousDisabled : view.nextDisabled}
      onClick={() => run("selectVideoMobileEvent", direction)}
    />
  );
}
export function VideoViewText({ kind, ...props }) {
  const view = useVideoView();
  const text =
    kind === "selection"
      ? "Selezionati: " + view.selectionCount
      : kind === "results"
        ? `${view.resultCount} ${view.resultCount === 1 ? "azione trovata" : "azioni trovate"}`
        : String(view.filterCount);
  return (
    <div {...props} data-react-managed="true">
      {text}
    </div>
  );
}
export function VideoFilterCount() {
  const view = useVideoView();
  return (
    <span
      id="video-mobile-filter-count"
      className="video-mobile-filter-count"
      data-react-managed="true"
    >
      {view.filterCount}
    </span>
  );
}
export function VideoOverlay() {
  const view = useVideoView();
  return (
    <div
      id="video-analysis-overlay"
      className={"video-overlay" + (view.overlayVisible ? "" : " hidden")}
      aria-hidden="true"
      data-react-managed="true"
    >
      <div id="video-overlay-set" className="video-overlay-line">
        {view.overlay}
      </div>
      <div id="video-overlay-player" className="video-overlay-line" />
      <div id="video-overlay-skill" className="video-overlay-line" />
      <div id="video-overlay-rotation" className="video-overlay-line" />
    </div>
  );
}
export function VideoElement({ scout = false }) {
  const view = useVideoView();
  const media = useRef(null);
  useEffect(() => {
    if (!view.localSource) media.current?.load();
  }, [view.localSource]);
  // Seeking and playback remain media effects; source and visibility belong to React.
  const update = (event) =>
    invokeRuntimeEvent(
      "updateVideoPlaybackSnapshot",
      event.currentTarget.currentTime,
    );
  return (
    <video
      ref={media}
      id={scout ? "analysis-video-scout" : "analysis-video"}
      controls
      src={view.localSource || undefined}
      style={{ display: view.youtubeId ? "none" : "block" }}
      preload="metadata"
      data-react-managed="true"
      onTimeUpdate={update}
      onPause={update}
      onSeeked={update}
      onEnded={update}
    />
  );
}
