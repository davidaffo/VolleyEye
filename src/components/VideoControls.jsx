import { CommandButton } from "./ui/CommandButton.jsx";
import { FileImportInput } from "./ui/FileImportInput.jsx";

import { useViewStore } from "../hooks/useViewStore.js";
import { runtimeStore } from "../state/runtime-store.mjs";
import { useEffect, useRef, useState } from "react";
import { videoViewStore } from "../state/video-view-store.mjs";
import { actions as appActions, events as appEvents } from "../app/actions.mjs";
const run = (command, ...args) =>
  appActions[command]( ...args).catch(console.error);
const useVideoView = () => useViewStore(videoViewStore);
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
    <CommandButton
      {...props}
      id={id}
      command={actions[id][0]}
      args={actions[id].slice(1)}
    >
      {children}
    </CommandButton>
  );
}
export function VideoSourceControls({ scout = false }) {
  const view = useVideoView(),
    suffix = scout ? "-scout" : "";
  const controls = useViewStore(runtimeStore);
  const [url, setUrl] = useState(view.youtubeUrl);
  useEffect(() => setUrl(view.youtubeUrl), [view.youtubeUrl]);
  const load = () => run("handleYoutubeUrlLoad", url);
  return (
    <>
      <label
        id={"video-file-picker" + suffix}
        className="file-btn"
        htmlFor={"video-file-input" + suffix}
        onClick={(event) => {
          if (typeof window.showOpenFilePicker === "function") {
            event.preventDefault();
            appEvents.openReactVideoPicker(scout);
          }
        }}
      >
        Carica video
      </label>
      <FileImportInput
        id={"video-file-input" + suffix}
        accept="video/*"
        hidden
        clearAfter
        onFile={(file) => run("handleVideoFileChange", file)}
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
    <div {...props}>
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
    appEvents.updateVideoPlaybackSnapshot(event.currentTarget.currentTime,
    );
  return (
    <video
      ref={media}
      id={scout ? "analysis-video-scout" : "analysis-video"}
      controls
      src={view.localSource || undefined}
      style={{ display: view.youtubeId ? "none" : "block" }}
      preload="metadata"
      onTimeUpdate={update}
      onPause={update}
      onSeeked={update}
      onEnded={update}
    />
  );
}

export function YouTubeFrame({ scout = false }) {
  return <>
    <iframe id={'youtube-frame' + (scout ? '-scout' : '')} className="youtube-frame"
      title="YouTube player" tabIndex="-1"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen={true} />
    <div className="youtube-focus-guard" data-youtube-guard="" />
  </>;
}
