import { ModalDialog } from "../ui/Modal.jsx";
import { ModalCloseButton } from "../ui/Modal.jsx";

import { ScoutSkillControls } from "../ScoutCourt.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { skillModalStore } from "../../state/skill-modal-store.mjs";
import { runtimeStore } from "../../state/runtime-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";

function act(callback, event) {
  try {
    Promise.resolve(callback(event)).catch(report);
  } catch (error) {
    report(error);
  }
}
function report(error) {
  console.error("Fondamentale non registrato", error);
  window.alert(error.message);
}
export function SkillModal() {
  const view = useViewStore(skillModalStore);
  const controls = useViewStore(runtimeStore);
  const disabled = !!view.courtModal && !!controls.scoutControlsDisabled;
  const run = (command) => appActions[command]().catch(report);
  return (
    <ModalDialog
      id="skill-modal"
      className={"skill-modal" + (view.courtModal ? " court-modal" : "")}
      open={view.open}
      onClose={() => run("closeSkillModal")}
      variant="skill"
      backdropProps={{ "data-close-skill": "" }}
      title={
        <>
          <div id="skill-modal-title" className="skill-modal__title">
            {view.title}
          </div>
          <ModalCloseButton
            variant="skill"
            id="skill-modal-cancel"
            className={"pill-remove skill-modal__cancel-abs" + (view.cancelVisible ? "" : " hidden")}
            aria-label="Annulla fondamentale"
            type="button"
            title="Annulla fondamentale"
            disabled={disabled}
            onClick={() => run("cancelSkillModalFlow")}
          >
            ✕
          </ModalCloseButton>
        </>
      }
      closeProps={{
        id: "skill-modal-close",
        className: "pill-remove skill-modal__close-abs",
        "data-close-skill": "true",
        disabled: disabled,
      }}
      bodyProps={{ id: "skill-modal-body", className: "skill-modal__body" }}
    >
      {view.onBack && (
        <div className="modal-skill-head">
          <button
            type="button"
            className="secondary modal-skill-back"
            disabled={disabled}
            onClick={(event) => act(view.onBack, event)}
          >
            Indietro
          </button>
        </div>
      )}
      {view.choices &&
        (view.choices.length ? (
          <div className="modal-skill-grid">
            {view.choices.map((skill) => (
              <button
                key={skill.id}
                type="button"
                className="modal-skill-btn"
                disabled={disabled}
                onClick={(event) => act(skill.onChoose, event)}
              >
                <span>{skill.label}</span>
                <span className={"modal-skill-badge badge-" + skill.id}>{skill.label[0]}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="players-empty">
            Abilita almeno un fondamentale nelle impostazioni per scoutizzare.
          </div>
        ))}
      <ScoutSkillControls view={view.controls} disabled={disabled} />
    </ModalDialog>
  );
}
