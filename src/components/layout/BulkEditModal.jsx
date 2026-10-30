import { ModalDialog } from "../ui/Modal.jsx";

import { EventControl } from "../EventControl.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { bulkEditStore } from "../../state/roster-import-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
export function BulkEditModal() {
  const view = useViewStore(bulkEditStore);
  const run = (command) => appActions[command]().catch(console.error),
    close = () => run("closeBulkEditModal");
  return (
    <ModalDialog
      id="bulk-edit-modal"
      open={view.open}
      onClose={close}
      variant="skill"
      backdropProps={{ "data-close-bulk": "" }}
      title={
        <div id="bulk-edit-title" className="skill-modal__title">
          {view.title}
        </div>
      }
      closeProps={{
        id: "bulk-edit-close",
        className: "pill-remove skill-modal__close-abs",
      }}
    >
      <p id="bulk-edit-hint" className="section-note">
        {view.hint}
      </p>
      <div id="bulk-edit-body">
        {view.control && <EventControl key={view.title} model={view.control} />}
      </div>
      <div className="settings-actions">
        <button id="bulk-edit-cancel" className="secondary" type="button" onClick={close}>
          Annulla
        </button>
        <button
          id="bulk-edit-apply"
          className="primary"
          type="button"
          onClick={() => run("applyBulkEditSession")}
        >
          Salva
        </button>
      </div>
    </ModalDialog>
  );
}
