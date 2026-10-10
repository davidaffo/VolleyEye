import { useEffect, useRef, useSyncExternalStore } from "react";
import { ffmpegEncoderStore } from "../../state/roster-import-store.mjs";
export function FfmpegEncoderModal() {
  const view = useSyncExternalStore(
      ffmpegEncoderStore.subscribe,
      ffmpegEncoderStore.getSnapshot,
      ffmpegEncoderStore.getSnapshot,
    ),
    gpu = useRef(null),
    choose = (value) => view.choose?.(value);
  useEffect(() => {
    if (view.open) gpu.current?.focus();
  }, [view.open]);
  return (
    <div
      id="ffmpeg-encoder-modal"
      className={"settings-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ffmpeg-encoder-title"
    >
      <div
        className="settings-modal__backdrop"
        data-close-ffmpeg-encoder=""
        onClick={() => choose(null)}
      />
      <div className="settings-modal__content">
        <div className="settings-modal__head">
          <h3 id="ffmpeg-encoder-title">Copia comando ffmpeg</h3>
          <button
            id="ffmpeg-encoder-close"
            className="pill-remove"
            type="button"
            aria-label="Chiudi"
            onClick={() => choose(null)}
          >
            ✕
          </button>
        </div>
        <div className="settings-modal__body">
          <p className="section-note">
            Entrambi i comandi esportano i tagli senza audio, mantenendo overlay
            e compressione bilanciata. La GPU VAAPI riduce drasticamente il
            carico sulla CPU.
          </p>
          <div className="offset-actions">
            <button
              id="ffmpeg-copy-gpu"
              ref={gpu}
              type="button"
              onClick={() => choose("gpu")}
            >
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
        </div>
      </div>
    </div>
  );
}
