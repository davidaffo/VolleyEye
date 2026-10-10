import { useLayoutEffect, useSyncExternalStore } from "react";
import { playerPhotoStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../../compat/runtime.js";
export function PlayerPhotoModal() {
  const view = useSyncExternalStore(
    playerPhotoStore.subscribe,
    playerPhotoStore.getSnapshot,
    playerPhotoStore.getSnapshot,
  );
  const run = (command, ...args) =>
    invokeRuntime(command, ...args).catch(console.error);
  useLayoutEffect(() => {
    if (view.open) run("renderPlayerPhotoEditor");
  }, [view.open]);
  const close = () => run("closePlayerPhotoEditor");
  return (
    <div
      id="player-photo-modal"
      className={"settings-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-photo-title"
    >
      <div
        className="settings-modal__backdrop"
        data-close-player-photo=""
        onClick={close}
      />
      <div className="settings-modal__content player-photo-modal__content">
        <div className="settings-modal__head">
          <h3 id="player-photo-title">Ritaglia foto giocatrice</h3>
          <button
            id="player-photo-close"
            className="pill-remove"
            aria-label="Chiudi"
            data-react-managed="true"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="settings-modal__body player-photo-modal__body">
          <p className="section-note">
            Trascina la foto per spostarla e usa lo zoom per decidere
            l'inquadratura finale.
          </p>
          <div className="player-photo-cropper">
            <div
              id="player-photo-stage"
              className="player-photo-stage"
              data-react-managed="true"
              onPointerDown={(event) =>
                invokeRuntimeEvent(
                  "handlePlayerPhotoPointerDown",
                  event.nativeEvent,
                )
              }
              onPointerMove={(event) =>
                invokeRuntimeEvent(
                  "handlePlayerPhotoPointerMove",
                  event.nativeEvent,
                )
              }
              onPointerUp={(event) =>
                invokeRuntimeEvent(
                  "handlePlayerPhotoPointerUp",
                  event.nativeEvent,
                )
              }
              onPointerCancel={(event) =>
                invokeRuntimeEvent(
                  "handlePlayerPhotoPointerUp",
                  event.nativeEvent,
                )
              }
            >
              <img
                id="player-photo-image"
                data-react-managed="true"
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
              data-react-managed="true"
              type="range"
              min="1"
              max={view.maxZoom}
              step="0.01"
              value={view.zoom}
              onChange={(event) =>
                run("changePlayerPhotoZoom", event.target.value)
              }
            />
          </label>
          <div className="settings-actions">
            <button
              id="player-photo-cancel"
              className="secondary"
              type="button"
              data-react-managed="true"
              onClick={close}
            >
              Annulla
            </button>
            <button
              id="player-photo-remove"
              className={"danger" + (view.allowRemove ? "" : " hidden")}
              type="button"
              data-react-managed="true"
              onClick={() => run("removeManagedPlayerPhoto")}
            >
              Rimuovi foto
            </button>
            <button
              id="player-photo-save"
              className="primary"
              type="button"
              data-react-managed="true"
              onClick={() => run("saveManagedPlayerPhoto")}
            >
              Usa questa foto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
