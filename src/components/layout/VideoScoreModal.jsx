import { ModalDialog } from "../ui/Modal.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";
import { useEffect, useRef } from "react";
import { videoScoreStore } from "../../state/roster-import-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
export function VideoScoreModal() {
  const view = useViewStore(videoScoreStore),
    home = useRef(null);
  useEffect(() => {
    if (view.open) home.current?.focus();
  }, [view.open]);
  const run = (command, ...args) =>
      appActions[command]( ...args).catch(console.error),
    close = () => run("closeVideoScoreModal"),
    apply = () => run("correctVideoScoresFromSelection", view.home, view.away);
  return (
    <ModalDialog
      id="video-score-modal"
      open={view.open}
      onClose={close}
      variant="skill"
      backdropProps={{ "data-close-video-score": "" }}
      title={<div className="skill-modal__title">Correggi punteggio</div>}
      closeProps={{
        id: "video-score-close",
        className: "pill-remove skill-modal__close-abs",
      }}
    >
      <div className="video-score-form">
        {["home", "away"].map((field) => (
          <span style={{ display: "contents" }} key={field}>
            <label htmlFor={"video-score-" + field}>
              {field === "home" ? "Punteggio nostro" : "Punteggio avversario"}
            </label>
            <input
              id={"video-score-" + field}
              ref={field === "home" ? home : undefined}
              type="number"
              min="0"
              step="1"
              value={view[field]}
              onChange={(event) => videoScoreStore.publish({ [field]: event.target.value })}
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
        <button id="video-score-cancel" className="secondary" type="button" onClick={close}>
          Annulla
        </button>
        <button id="video-score-apply" className="primary" type="button" onClick={apply}>
          Applica
        </button>
      </div>
    </ModalDialog>
  );
}
