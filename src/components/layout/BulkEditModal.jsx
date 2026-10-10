import { useSyncExternalStore } from "react";
import { EventControl } from "../EventControl.jsx";
import { bulkEditStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function BulkEditModal() {
  const view = useSyncExternalStore(
    bulkEditStore.subscribe,
    bulkEditStore.getSnapshot,
    bulkEditStore.getSnapshot,
  );
  const run = (command) => invokeRuntime(command).catch(console.error),
    close = () => run("closeBulkEditModal");
  return (
    <div
      id="bulk-edit-modal"
      className={"skill-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="skill-modal__backdrop"
        data-close-bulk=""
        onClick={close}
      />
      <div className="skill-modal__content">
        <div className="skill-modal__head">
          <div id="bulk-edit-title" className="skill-modal__title">
            {view.title}
          </div>
          <button
            id="bulk-edit-close"
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
          <p id="bulk-edit-hint" className="section-note">
            {view.hint}
          </p>
          <div id="bulk-edit-body" data-react-managed="true">
            {view.control && (
              <EventControl key={view.title} model={view.control} />
            )}
          </div>
          <div className="settings-actions">
            <button
              id="bulk-edit-cancel"
              className="secondary"
              type="button"
              data-react-managed="true"
              onClick={close}
            >
              Annulla
            </button>
            <button
              id="bulk-edit-apply"
              className="primary"
              type="button"
              data-react-managed="true"
              onClick={() => run("applyBulkEditSession")}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
