import { ModalDialog } from "../ui/Modal.jsx";
import { SelectOptions } from "../ui/SelectOptions.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { setStartStore } from "../../state/set-start-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
function run(command, ...args) {
  appActions[command]( ...args).catch((error) => {
    console.error("Formazione di partenza non salvata", error);
    window.alert(error.message);
  });
}
export function SetStartModal() {
  const view = useViewStore(setStartStore);
  const close = () => run("closeSetStartModal");
  return (
    <ModalDialog
      id="set-start-modal"
      aria-labelledby="set-start-modal-title"
      open={view.open}
      onClose={close}
      variant="skill"
      backdropProps={{}}
      backdrop={false}
      title={<h3 id="set-start-modal-title">{view.title}</h3>}
      closeProps={{
        id: "set-start-modal-close",
        className: "pill-remove skill-modal__close-abs",
      }}
      bodyProps={{ id: "set-start-modal-body", className: "skill-modal__body" }}
      footer={
        <div className="skill-modal__foot">
          <button
            id="set-start-modal-cancel"
            className="secondary"
            onClick={close}
          >
            Chiudi
          </button>
          <button
            id="set-start-modal-save"
            className="primary"
            type="button"
            onClick={() => run("applySetStartDraft")}
          >
            Salva
          </button>
        </div>
      }
    >
      <div className="set-start-list">
        {view.rows.map((row) => (
          <div key={row.name} className="set-start-row">
            <span className="set-start-name">{row.label}</span>
            <select
              className="set-start-select"
              aria-label={"Posizione " + row.label}
              value={row.value}
              onChange={(event) => run("changeSetStartSelection", row.name, event.target.value)}
            >
              <SelectOptions
                options={[
                  ["", "-"],
                  ["in", "in"],
                ]}
              />
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </ModalDialog>
  );
}
