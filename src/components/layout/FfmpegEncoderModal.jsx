import { ModalDialog } from "../ui/Modal.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";
import { useEffect, useRef } from "react";
import { ffmpegEncoderStore } from "../../state/roster-import-store.mjs";
export function FfmpegEncoderModal() {
  const view = useViewStore(ffmpegEncoderStore),
    gpu = useRef(null),
    choose = (value) => view.choose?.(value);
  useEffect(() => {
    if (view.open) gpu.current?.focus();
  }, [view.open]);
  return (
    <ModalDialog
      id="ffmpeg-encoder-modal"
      className="settings-modal"
      aria-labelledby="ffmpeg-encoder-title"
      open={view.open}
      onClose={() => choose(null)}
      variant="settings"
      backdropProps={{ "data-close-ffmpeg-encoder": "" }}
      contentProps={{ className: "settings-modal__content" }}
      title={<h3 id="ffmpeg-encoder-title">Copia comando ffmpeg</h3>}
      closeProps={{
        id: "ffmpeg-encoder-close",
        className: "pill-remove",
        type: "button",
        "aria-label": "Chiudi",
        onClick: () => choose(null),
      }}
      bodyProps={{ className: "settings-modal__body" }}
    >
      <p className="section-note">
        Entrambi i comandi esportano i tagli senza audio, mantenendo overlay e compressione
        bilanciata. La GPU VAAPI riduce drasticamente il carico sulla CPU.
      </p>
      <div className="offset-actions">
        <button id="ffmpeg-copy-gpu" ref={gpu} type="button" onClick={() => choose("gpu")}>
          Copia GPU (consigliato)
        </button>
        <button
          id="ffmpeg-copy-cpu"
          className="secondary"
          type="button"
          onClick={() => choose("cpu")}
        >
          Copia CPU
        </button>
        <button
          className="secondary"
          type="button"
          data-close-ffmpeg-encoder=""
          onClick={() => choose(null)}
        >
          Annulla
        </button>
      </div>
    </ModalDialog>
  );
}
