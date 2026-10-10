import { useSyncExternalStore } from "react";
import { skillModalStore } from "../../state/skill-modal-store.mjs";
import { runtimeStore } from "../../state/runtime-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
import { ScoutSkillControls } from "../ScoutCourt.jsx";
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
  const view = useSyncExternalStore(
    skillModalStore.subscribe,
    skillModalStore.getSnapshot,
    skillModalStore.getSnapshot,
  );
  const controls = useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
  const disabled = !!view.courtModal && !!controls.scoutControlsDisabled;
  const run = (command) => invokeRuntime(command).catch(report);
  return (
    <div
      id="skill-modal"
      className={
        "skill-modal" +
        (view.courtModal ? " court-modal" : "") +
        (view.open ? "" : " hidden")
      }
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="skill-modal__backdrop"
        data-close-skill=""
        onClick={() => run("closeSkillModal")}
      ></div>
      <div className="skill-modal__content">
        <div className="skill-modal__head">
          <div id="skill-modal-title" className="skill-modal__title">
            {view.title}
          </div>
          <button
            id="skill-modal-cancel"
            className={
              "pill-remove skill-modal__cancel-abs" +
              (view.cancelVisible ? "" : " hidden")
            }
            aria-label="Annulla fondamentale"
            type="button"
            title="Annulla fondamentale"
            data-react-managed="true"
            disabled={disabled}
            onClick={() => run("cancelSkillModalFlow")}
          >
            ✕
          </button>
          <button
            id="skill-modal-close"
            className="pill-remove skill-modal__close-abs"
            aria-label="Chiudi"
            type="button"
            data-close-skill="true"
            data-react-managed="true"
            disabled={disabled}
            onClick={() => run("closeSkillModal")}
          >
            ✕
          </button>
        </div>
        <div
          id="skill-modal-body"
          className="skill-modal__body"
          data-react-managed="true"
        >
          {view.onBack && (
            <div className="modal-skill-head">
              <button
                type="button"
                className="secondary modal-skill-back"
                data-react-managed="true"
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
                    data-react-managed="true"
                    disabled={disabled}
                    onClick={(event) => act(skill.onChoose, event)}
                  >
                    <span>{skill.label}</span>
                    <span className={"modal-skill-badge badge-" + skill.id}>
                      {skill.label[0]}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="players-empty">
                Abilita almeno un fondamentale nelle impostazioni per
                scoutizzare.
              </div>
            ))}
          <ScoutSkillControls view={view.controls} disabled={disabled} />
        </div>
      </div>
    </div>
  );
}
