function bindVideoControls() {
  if (elVideoMobileSourceOpen) elVideoMobileSourceOpen.addEventListener("click", () => openVideoMobileSourceModal());
  if (elVideoMobileSourceClose) elVideoMobileSourceClose.addEventListener("click", closeVideoMobileSourceModal);
  if (elVideoMobileSourceBackdrop) elVideoMobileSourceBackdrop.addEventListener("click", closeVideoMobileSourceModal);
  if (elVideoMobileSourceLater) elVideoMobileSourceLater.addEventListener("click", closeVideoMobileSourceModal);
  if (elVideoMobileFilePicker) {
    elVideoMobileFilePicker.addEventListener("click", () => openLocalVideoPicker(elVideoFileInput));
  }
  const loadMobileYoutube = () => {
    const url = (elVideoMobileYoutubeUrl && elVideoMobileYoutubeUrl.value) || "";
    const id = parseYoutubeId(url);
    if (!id) {
      alert("Inserisci un link YouTube valido.");
      return;
    }
    handleYoutubeUrlLoad(url);
  };
  if (elVideoMobileYoutubeLoad) elVideoMobileYoutubeLoad.addEventListener("click", loadMobileYoutube);
  if (elVideoMobileYoutubeUrl) {
    elVideoMobileYoutubeUrl.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      loadMobileYoutube();
    });
  }
  if (elVideoMobileFilterOpen) elVideoMobileFilterOpen.addEventListener("click", openVideoMobileFilters);
  if (elVideoMobileFilterClose) elVideoMobileFilterClose.addEventListener("click", closeVideoMobileFilters);
  if (elVideoMobileFilterApply) {
    elVideoMobileFilterApply.addEventListener("click", () => {
      focusFirstFilteredVideoEventMobile({ userAction: true });
      closeVideoMobileFilters();
    });
  }
  if (elVideoMobileFilterBackdrop) elVideoMobileFilterBackdrop.addEventListener("click", closeVideoMobileFilters);
  if (elVideoMobilePrev) elVideoMobilePrev.addEventListener("click", () => selectVideoMobileEvent(-1));
  if (elVideoMobileNext) elVideoMobileNext.addEventListener("click", () => selectVideoMobileEvent(1));
  if (elAggTabButtons && typeof elAggTabButtons.forEach === "function") {
    elAggTabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.aggTabTarget) {
          setActiveAggTab(btn.dataset.aggTabTarget);
        }
      });
    });
  }
  if (elBtnScoreForPlusModal) elBtnScoreForPlusModal.addEventListener("click", () => handleManualScore("for", 1));
  if (elBtnScoreForMinusModal) elBtnScoreForMinusModal.addEventListener("click", () => handleManualScore("for", -1));
  if (elBtnScoreAgainstPlusModal) elBtnScoreAgainstPlusModal.addEventListener("click", () => handleManualScore("against", 1));
  if (elBtnScoreAgainstMinusModal) elBtnScoreAgainstMinusModal.addEventListener("click", () => handleManualScore("against", -1));
  if (elBtnScoreTeamPointModal) {
    elBtnScoreTeamPointModal.addEventListener("click", () => startPointPickMode("our"));
  }
  if (elVideoFileInput) {
    elVideoFileInput.addEventListener("change", e => {
      const input = e.target;
      const file = input && input.files && input.files[0];
      if (file) {
        handleVideoFileChange(file);
      }
      if (input) {
        input.value = "";
      }
    });
  }
  const videoPicker = document.getElementById("video-file-picker");
  if (videoPicker && typeof window.showOpenFilePicker === "function") {
    videoPicker.addEventListener("click", event => {
      event.preventDefault();
      openLocalVideoPicker(elVideoFileInput);
    });
  }
  if (elVideoFileInputScout) {
    elVideoFileInputScout.addEventListener("change", e => {
      const input = e.target;
      const file = input && input.files && input.files[0];
      if (file) {
        handleVideoFileChange(file);
      }
      if (input) {
        input.value = "";
      }
    });
  }
  const videoPickerScout = document.getElementById("video-file-picker-scout");
  if (videoPickerScout && typeof window.showOpenFilePicker === "function") {
    videoPickerScout.addEventListener("click", event => {
      event.preventDefault();
      openLocalVideoPicker(elVideoFileInputScout);
    });
  }
  if (elBtnSyncFirstSkill) {
    elBtnSyncFirstSkill.addEventListener("click", syncFirstSkillToVideo);
  }
  const videoFramePrevBtn = document.getElementById("btn-video-frame-prev");
  if (videoFramePrevBtn) {
    videoFramePrevBtn.addEventListener("click", () => stepActiveVideoByFrame(-1));
  }
  const videoFrameNextBtn = document.getElementById("btn-video-frame-next");
  if (videoFrameNextBtn) {
    videoFrameNextBtn.addEventListener("click", () => stepActiveVideoByFrame(1));
  }
  if (elBtnCopyFfmpeg) {
    elBtnCopyFfmpeg.addEventListener("click", copyFfmpegFromSelection);
  }
  if (elBtnFixVideoScore) {
    if (!elBtnFixVideoScore._fixScoreBound) {
      const handler = () => openVideoScoreModal();
      elBtnFixVideoScore.addEventListener("click", handler);
      elBtnFixVideoScore.addEventListener("pointerup", handler);
      elBtnFixVideoScore._fixScoreBound = true;
    }
  }
  if (elVideoScoreClose) {
    elVideoScoreClose.addEventListener("click", closeVideoScoreModal);
  }
  if (elVideoScoreCancel) {
    elVideoScoreCancel.addEventListener("click", closeVideoScoreModal);
  }
  if (elVideoScoreBackdrop) {
    elVideoScoreBackdrop.addEventListener("click", closeVideoScoreModal);
  }
  if (elVideoScoreApply) {
    elVideoScoreApply.addEventListener("click", () => {
      const homeVal = elVideoScoreHome ? elVideoScoreHome.value : "";
      const awayVal = elVideoScoreAway ? elVideoScoreAway.value : "";
      correctVideoScoresFromSelection(homeVal, awayVal);
    });
  }
  [elVideoScoreHome, elVideoScoreAway].forEach(input => {
    if (!input) return;
    input.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const homeVal = elVideoScoreHome ? elVideoScoreHome.value : "";
      const awayVal = elVideoScoreAway ? elVideoScoreAway.value : "";
      correctVideoScoresFromSelection(homeVal, awayVal);
    });
  });
  if (elBtnVideoAddEvent) {
    elBtnVideoAddEvent.addEventListener("click", addEmptyVideoEventAfterSelection);
  }
  if (elBtnLoadYoutube) {
    elBtnLoadYoutube.addEventListener("click", () => {
      const url = (elYoutubeUrlInput && elYoutubeUrlInput.value) || "";
      handleYoutubeUrlLoad(url);
    });
  }
  if (elBtnClearVideo) {
    elBtnClearVideo.addEventListener("click", clearLoadedVideo);
  }
  if (elBtnLoadYoutubeScout) {
    elBtnLoadYoutubeScout.addEventListener("click", () => {
      const url = (elYoutubeUrlInputScout && elYoutubeUrlInputScout.value) || "";
      handleYoutubeUrlLoad(url);
    });
  }
  if (elYoutubeUrlInput) {
    elYoutubeUrlInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleYoutubeUrlLoad(elYoutubeUrlInput.value || "");
      }
    });
  }
  if (elYoutubeUrlInputScout) {
    elYoutubeUrlInputScout.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleYoutubeUrlLoad(elYoutubeUrlInputScout.value || "");
      }
    });
  }
  [elAnalysisVideo, elAnalysisVideoScout].forEach(video => {
    if (!video) return;
    ["timeupdate", "pause", "seeked", "ended"].forEach(evt => {
      video.addEventListener(evt, () => updateVideoPlaybackSnapshot(video.currentTime));
    });
  });
}
