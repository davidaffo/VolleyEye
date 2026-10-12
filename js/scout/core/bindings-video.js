function bindVideoControls() {
  if (elVideoMobileSourceOpen && elVideoMobileSourceOpen.dataset?.reactManaged !== "true") elVideoMobileSourceOpen.addEventListener("click", () => openVideoMobileSourceModal());
  if (elVideoMobileSourceClose && elVideoMobileSourceClose.dataset?.reactManaged !== "true") elVideoMobileSourceClose.addEventListener("click", closeVideoMobileSourceModal);
  if (elVideoMobileSourceBackdrop && elVideoMobileSourceBackdrop.dataset?.reactManaged !== "true") elVideoMobileSourceBackdrop.addEventListener("click", closeVideoMobileSourceModal);
  if (elVideoMobileSourceLater && elVideoMobileSourceLater.dataset?.reactManaged !== "true") elVideoMobileSourceLater.addEventListener("click", closeVideoMobileSourceModal);
  if (elVideoMobileFilePicker && elVideoMobileFilePicker.dataset?.reactManaged !== "true") {
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
  if (elVideoMobileYoutubeLoad && elVideoMobileYoutubeLoad.dataset?.reactManaged !== "true") elVideoMobileYoutubeLoad.addEventListener("click", loadMobileYoutube);
  if (elVideoMobileYoutubeUrl && elVideoMobileYoutubeUrl.dataset?.reactManaged !== "true") {
    elVideoMobileYoutubeUrl.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      loadMobileYoutube();
    });
  }
  if (elVideoMobileFilterOpen && elVideoMobileFilterOpen.dataset?.reactManaged !== "true") elVideoMobileFilterOpen.addEventListener("click", openVideoMobileFilters);
  if (elVideoMobileFilterClose && elVideoMobileFilterClose.dataset?.reactManaged !== "true") elVideoMobileFilterClose.addEventListener("click", closeVideoMobileFilters);
  if (elVideoMobileFilterApply && elVideoMobileFilterApply.dataset?.reactManaged !== "true") {
    elVideoMobileFilterApply.addEventListener("click", () => {
      focusFirstFilteredVideoEventMobile({ userAction: true });
      closeVideoMobileFilters();
    });
  }
  if (elVideoMobileFilterBackdrop && elVideoMobileFilterBackdrop.dataset?.reactManaged !== "true") elVideoMobileFilterBackdrop.addEventListener("click", closeVideoMobileFilters);
  if (elVideoMobilePrev && elVideoMobilePrev.dataset?.reactManaged !== "true") elVideoMobilePrev.addEventListener("click", () => selectVideoMobileEvent(-1));
  if (elVideoMobileNext && elVideoMobileNext.dataset?.reactManaged !== "true") elVideoMobileNext.addEventListener("click", () => selectVideoMobileEvent(1));
  if (elAggTabButtons && typeof elAggTabButtons.forEach === "function") {
    Array.from(elAggTabButtons).filter(btn=>btn.dataset?.reactManaged!=="true").forEach(btn => {
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
  if (elVideoFileInput && elVideoFileInput.dataset?.reactManaged !== "true") {
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
  if (videoPicker && videoPicker.dataset?.reactManaged !== "true" && typeof window.showOpenFilePicker === "function") {
    videoPicker.addEventListener("click", event => {
      event.preventDefault();
      openLocalVideoPicker(elVideoFileInput);
    });
  }
  if (elVideoFileInputScout && elVideoFileInputScout.dataset?.reactManaged !== "true") {
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
  if (videoPickerScout && videoPickerScout.dataset?.reactManaged !== "true" && typeof window.showOpenFilePicker === "function") {
    videoPickerScout.addEventListener("click", event => {
      event.preventDefault();
      openLocalVideoPicker(elVideoFileInputScout);
    });
  }
  if (elBtnSyncFirstSkill && elBtnSyncFirstSkill.dataset?.reactManaged !== "true") {
    elBtnSyncFirstSkill.addEventListener("click", syncFirstSkillToVideo);
  }
  const videoFramePrevBtn = document.getElementById("btn-video-frame-prev");
  if (videoFramePrevBtn && videoFramePrevBtn.dataset?.reactManaged !== "true") {
    videoFramePrevBtn.addEventListener("click", () => stepActiveVideoByFrame(-1));
  }
  const videoFrameNextBtn = document.getElementById("btn-video-frame-next");
  if (videoFrameNextBtn && videoFrameNextBtn.dataset?.reactManaged !== "true") {
    videoFrameNextBtn.addEventListener("click", () => stepActiveVideoByFrame(1));
  }
  if (elBtnCopyFfmpeg && elBtnCopyFfmpeg.dataset?.reactManaged !== "true") {
    elBtnCopyFfmpeg.addEventListener("click", copyFfmpegFromSelection);
  }
  if (elBtnFixVideoScore && elBtnFixVideoScore.dataset?.reactManaged !== "true") {
    if (!elBtnFixVideoScore._fixScoreBound) {
      const handler = () => openVideoScoreModal();
      elBtnFixVideoScore.addEventListener("click", handler);
      elBtnFixVideoScore.addEventListener("pointerup", handler);
      elBtnFixVideoScore._fixScoreBound = true;
    }
  }
  if (elVideoScoreClose && elVideoScoreClose.dataset.reactManaged !== "true") {
    elVideoScoreClose.addEventListener("click", closeVideoScoreModal);
  }
  if (elVideoScoreCancel && elVideoScoreCancel.dataset.reactManaged !== "true") {
    elVideoScoreCancel.addEventListener("click", closeVideoScoreModal);
  }
  if (elVideoScoreBackdrop && elVideoScoreModal?.dataset.reactManaged !== "true") {
    elVideoScoreBackdrop.addEventListener("click", closeVideoScoreModal);
  }
  if (elVideoScoreApply && elVideoScoreApply.dataset.reactManaged !== "true") {
    elVideoScoreApply.addEventListener("click", () => {
      const homeVal = elVideoScoreHome ? elVideoScoreHome.value : "";
      const awayVal = elVideoScoreAway ? elVideoScoreAway.value : "";
      correctVideoScoresFromSelection(homeVal, awayVal);
    });
  }
  [elVideoScoreHome, elVideoScoreAway].filter(input => input?.dataset.reactManaged !== "true").forEach(input => {
    if (!input) return;
    input.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const homeVal = elVideoScoreHome ? elVideoScoreHome.value : "";
      const awayVal = elVideoScoreAway ? elVideoScoreAway.value : "";
      correctVideoScoresFromSelection(homeVal, awayVal);
    });
  });
  if (elBtnVideoAddEvent && elBtnVideoAddEvent.dataset?.reactManaged !== "true") {
    elBtnVideoAddEvent.addEventListener("click", addEmptyVideoEventAfterSelection);
  }
  if (elBtnLoadYoutube && elBtnLoadYoutube.dataset?.reactManaged !== "true") {
    elBtnLoadYoutube.addEventListener("click", () => {
      const url = (elYoutubeUrlInput && elYoutubeUrlInput.value) || "";
      handleYoutubeUrlLoad(url);
    });
  }
  if (elBtnClearVideo && elBtnClearVideo.dataset?.reactManaged !== "true") {
    elBtnClearVideo.addEventListener("click", clearLoadedVideo);
  }
  if (elBtnLoadYoutubeScout && elBtnLoadYoutubeScout.dataset?.reactManaged !== "true") {
    elBtnLoadYoutubeScout.addEventListener("click", () => {
      const url = (elYoutubeUrlInputScout && elYoutubeUrlInputScout.value) || "";
      handleYoutubeUrlLoad(url);
    });
  }
  if (elYoutubeUrlInput && elYoutubeUrlInput.dataset?.reactManaged !== "true") {
    elYoutubeUrlInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleYoutubeUrlLoad(elYoutubeUrlInput.value || "");
      }
    });
  }
  if (elYoutubeUrlInputScout && elYoutubeUrlInputScout.dataset?.reactManaged !== "true") {
    elYoutubeUrlInputScout.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleYoutubeUrlLoad(elYoutubeUrlInputScout.value || "");
      }
    });
  }
  [elAnalysisVideo, elAnalysisVideoScout].forEach(video => {
    if (!video || video.dataset?.reactManaged === "true") return;
    ["timeupdate", "pause", "seeked", "ended"].forEach(evt => {
      video.addEventListener(evt, () => updateVideoPlaybackSnapshot(video.currentTime));
    });
  });
}
