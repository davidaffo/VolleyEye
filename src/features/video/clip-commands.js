import { session as matchState, downloadBlob } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { buildSelectedSegments } from "./video-events.js";
import { stripFileExtension, sanitizeVideoOutputBase } from "./export-model.js";
import { getActiveVideoFilterPresetName } from "../analysis/video-filter-model.js";
import { videoClipStore } from "../../state/video-clip-store.mjs";

export async function downloadVideoFromSelection() {
  if (videoClipStore.getSnapshot().busy) return;
  const segments = buildSelectedSegments();
  if (!segments.length) { alert("Seleziona uno o più eventi da scaricare."); return; }
  if (matchState.state.video?.youtubeId || !workspaceLayoutState.videoLocalFile) {
    alert("Carica un file video locale per scaricare il taglio."); return;
  }
  const file = workspaceLayoutState.videoLocalFile;
  const defaultBase = stripFileExtension(file.name) || "video";
  const outputBase = prompt("Nome file output (senza estensione):", getActiveVideoFilterPresetName() || defaultBase);
  if (!outputBase) return;
  const name = sanitizeVideoOutputBase(stripFileExtension(outputBase.trim())) || "output";
  videoClipStore.publish({ busy: true, label: "Preparazione…" });
  try {
    const { exportVideoClips } = await import("./clip-export.js");
    const result = await exportVideoClips(file, segments, (done, total) => {
      videoClipStore.publish({ label: `Preparazione ${done}/${total}…` });
    });
    downloadBlob(result.blob, name + result.extension);
  } catch (error) {
    console.error("Video clip export error", error);
    alert("Impossibile scaricare il taglio. " + (error.message || "Riprova caricando il video locale."));
  } finally {
    videoClipStore.publish({ busy: false, label: "Scarica taglio" });
  }
}
