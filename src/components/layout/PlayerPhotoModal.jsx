import { ModalDialog } from "../ui/Modal.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";
import { useLayoutEffect } from "react";
import { playerPhotoStore } from "../../state/roster-import-store.mjs";
import { actions as appActions, events as appEvents } from "../../app/actions.mjs";
export function PlayerPhotoModal() {
  const view = useViewStore(playerPhotoStore);
  const run = (command, ...args) =>
    appActions[command]( ...args).catch(console.error);
  useLayoutEffect(() => {
    if (view.open) run("renderPlayerPhotoEditor");
  }, [view.open]);
  const close = () => run("closePlayerPhotoEditor");
  return (
    <ModalDialog
      id="player-photo-modal"
      className="settings-modal"
      aria-labelledby="player-photo-title"
      open={view.open}
      onClose={close}
      variant="settings"
      backdropProps={{ "data-close-player-photo": "" }}
      contentProps={{
        className: "settings-modal__content player-photo-modal__content",
      }}
      title={<h3 id="player-photo-title">Ritaglia foto giocatrice</h3>}
      closeProps={{
        id: "player-photo-close",
        className: "pill-remove",
        "aria-label": "Chiudi",
        onClick: close,
      }}
      bodyProps={{ className: "settings-modal__body player-photo-modal__body" }}
    >
      <p className="section-note">
        Trascina la foto per spostarla e usa lo zoom per decidere l'inquadratura finale.
      </p>
      <div className="player-photo-cropper">
        <div
          id="player-photo-stage"
          className="player-photo-stage"
          onPointerDown={(event) => appEvents.handlePlayerPhotoPointerDown(event.nativeEvent)}
          onPointerMove={(event) => appEvents.handlePlayerPhotoPointerMove(event.nativeEvent)}
          onPointerUp={(event) => appEvents.handlePlayerPhotoPointerUp(event.nativeEvent)}
          onPointerCancel={(event) => appEvents.handlePlayerPhotoPointerUp(event.nativeEvent)}
        >
          <img
            id="player-photo-image"
            alt="Anteprima foto giocatrice"
            draggable={false}
            src={view.source || undefined}
            style={{ transform: view.transform }}
          />
        </div>
      </div>
      <label className="player-photo-zoom">
        <span>Zoom</span>
        <input
          id="player-photo-zoom"
          type="range"
          min="1"
          max={view.maxZoom}
          step="0.01"
          value={view.zoom}
          onChange={(event) => run("changePlayerPhotoZoom", event.target.value)}
        />
      </label>
      <div className="settings-actions">
        <button id="player-photo-cancel" className="secondary" type="button" onClick={close}>
          Annulla
        </button>
        <button
          id="player-photo-remove"
          className={"danger" + (view.allowRemove ? "" : " hidden")}
          type="button"
          onClick={() => run("removeManagedPlayerPhoto")}
        >
          Rimuovi foto
        </button>
        <button
          id="player-photo-save"
          className="primary"
          type="button"
          onClick={() => run("saveManagedPlayerPhoto")}
        >
          Usa questa foto
        </button>
      </div>
    </ModalDialog>
  );
}
