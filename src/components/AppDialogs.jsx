import { ModalFrame, ModalHeader, ModalBody } from "./ui/Modal.jsx";
import { useViewStore } from "../hooks/useViewStore.js";
import {
  demoWelcomeStore,
  exportProgressStore,
} from "../state/roster-import-store.mjs";

export function AppDialogs() {
  const demo = useViewStore(demoWelcomeStore),
    progress = useViewStore(exportProgressStore);
  return (
    <>
      <div id="global-modal-scrim" aria-hidden="true" />
      <div
        id="export-splash"
        className={"export-splash" + (progress.open ? " is-visible" : "")}
      >
        <div className="export-splash__card">
          <span className="export-splash__spinner" aria-hidden="true" />
          <span>Esportazione in corso…</span>
        </div>
      </div>
      <ModalFrame open={demo.open} className="skill-modal force-popup">
        <ModalHeader>
          <h3>Squadre demo</h3>
        </ModalHeader>
        <ModalBody>
          <p>
            VolleyEye ha caricato un match e due squadre dimostrative. Vuoi
            conservarli per provare il programma?
          </p>
          <p className="section-note">
            I nomi sono inventati. Se scegli di non usarli, tutti i dati demo
            verranno eliminati.
          </p>
          <div className="controls-row">
            <button
              type="button"
              data-demo-choice="keep"
              onClick={() => demo.choose?.("keep")}
            >
              Usa le demo
            </button>
            <button
              type="button"
              className="danger"
              data-demo-choice="remove"
              onClick={() => demo.choose?.("remove")}
            >
              Non usare ed elimina
            </button>
          </div>
        </ModalBody>
      </ModalFrame>
    </>
  );
}
