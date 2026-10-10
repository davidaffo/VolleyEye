import { useEffect, useRef, useSyncExternalStore } from "react";
import { videoScoreStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function VideoScoreModal() {
  const view = useSyncExternalStore(
      videoScoreStore.subscribe,
      videoScoreStore.getSnapshot,
      videoScoreStore.getSnapshot,
    ),
    home = useRef(null);
  useEffect(() => {
    if (view.open) home.current?.focus();
  }, [view.open]);
  const run = (command, ...args) =>
      invokeRuntime(command, ...args).catch(console.error),
    close = () => run("closeVideoScoreModal"),
    apply = () => run("correctVideoScoresFromSelection", view.home, view.away);
  return (
    <div
      id="video-score-modal"
      className={"skill-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="skill-modal__backdrop"
        data-close-video-score=""
        onClick={close}
      />
      <div className="skill-modal__content">
        <div className="skill-modal__head">
          <div className="skill-modal__title">Correggi punteggio</div>
          <button
            id="video-score-close"
            className="pill-remove skill-modal__close-abs"
            aria-label="Chiudi"
            type="button"
            data-react-managed="true"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="skill-modal__body">
          <div className="video-score-form">
            {["home", "away"].map((field) => (
              <span style={{ display: "contents" }} key={field}>
                <label htmlFor={"video-score-" + field}>
                  {field === "home"
                    ? "Punteggio nostro"
                    : "Punteggio avversario"}
                </label>
                <input
                  id={"video-score-" + field}
                  ref={field === "home" ? home : undefined}
                  data-react-managed="true"
                  type="number"
                  min="0"
                  step="1"
                  value={view[field]}
                  onChange={(event) =>
                    videoScoreStore.publish({ [field]: event.target.value })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      apply();
                    }
                  }}
                />
              </span>
            ))}
          </div>
          <div className="settings-actions">
            <button
              id="video-score-cancel"
              className="secondary"
              type="button"
              data-react-managed="true"
              onClick={close}
            >
              Annulla
            </button>
            <button
              id="video-score-apply"
              className="primary"
              type="button"
              data-react-managed="true"
              onClick={apply}
            >
              Applica
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
