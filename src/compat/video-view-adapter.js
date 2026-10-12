function publishReactVideoView() {
  videoViewStore.publish({
    youtubeUrl: state.video?.youtubeUrl || "",
    youtubeId: state.video?.youtubeId || "",
    localSource: videoObjectUrl || "",
    hasSource: !!(state.video?.youtubeId || videoObjectUrl),
    playByPlay: !!state.videoPlayByPlay,
  });
}
function publishReactVideoMobileReview(rows, row, index, filterCount) {
  videoViewStore.publish({
    filterCount,
    resultCount: rows.length,
    previousDisabled: !row || index <= 0,
    nextDisabled: !row || index >= rows.length - 1,
  });
}
function publishReactVideoOverlay() {
  const visible =
    !!state.videoPlayByPlay && document.body?.dataset.activeTab === "video";
  const event = visible ? getVideoOverlayEvent() : null;
  const overlay = event ? buildVideoOverlayLinesForEvent(event)[0] || "" : "";
  videoViewStore.publish({ overlay, overlayVisible: !!overlay });
}
function changeReactVideoPlayByPlay(enabled) {
  state.videoPlayByPlay = !!enabled;
  saveState();
  if (enabled) {
    if (document.body?.dataset.activeTab === "video")
      startPlayByPlayFromSelection({ preservePlayback: true });
  } else stopPlayByPlay();
  publishReactVideoView();
  updateVideoAnalysisOverlay();
}
function applyReactVideoMobileFilters() {
  focusFirstFilteredVideoEventMobile({ userAction: true });
  closeVideoMobileFilters();
}
function openReactVideoPicker(scout) {
  return openLocalVideoPicker(scout ? elVideoFileInputScout : elVideoFileInput);
}
