
import { ModalFrame, ModalHeader, ModalBody } from "./ui/Modal.jsx";
import { useViewStore } from "../hooks/useViewStore.js";
import { attackShortcutStore } from "../state/attack-shortcut-store.mjs";
import { actions as appActions } from "../app/actions.mjs";

const configs = {
  base: {
    prefix: "base",
    title: "Base centrale",
    note: "Seleziona la base da assegnare all'ultimo attacco.",
    command: "applyBaseToTarget",
    attribute: "data-base",
    hint: "Scorciatoie: 1, 2, C, B, 7, F.",
    choices: ["K1", "K2", "KC", "KB", "K7", "KF"].map((value) => ({
      value,
      label: value,
      key: value.slice(1),
    })),
  },
  type: {
    prefix: "attack-type",
    title: "Tipo attacco",
    note: "Seleziona il tipo di attacco da assegnare all'ultimo attacco.",
    command: "applyAttackTypeToTarget",
    attribute: "data-attack-type",
    hint: "Scorciatoie: R, P, Z, S.",
    choices: [
      ["Regolare", "R"],
      ["Pallonetto", "P"],
      ["Piazzata", "Z"],
      ["Spinta", "S"],
    ].map(([value, key]) => ({ value, key, label: `${value} (${key})` })),
  },
  block: {
    prefix: "block-number",
    title: "N° muro",
    note: "Seleziona il numero di giocatrici a muro per l'ultimo attacco.",
    command: "applyBlockNumberToTarget",
    attribute: "data-block-number",
    hint: "Scorciatoie: 0, 1, 2, 3.",
    choices: [0, 1, 2, 3].map((value) => ({
      value,
      key: String(value),
      label: String(value),
    })),
  },
  setter: {
    prefix: "attack-setter",
    title: "Alzatore attacco",
    note: "Seleziona l'alzatrice dell'ultimo attacco.",
    command: "applySetterToTarget",
    attribute: "data-setter-index",
    hint: "Scorciatoia: A.",
  },
};
const run = (command, ...args) =>
  appActions[command]( ...args).catch((error) => {
    console.error("Modifica attacco non riuscita", error);
    window.alert(error.message);
  });
export function AttackShortcutModal({ kind }) {
  const view = useViewStore(attackShortcutStore),
    config = configs[kind];
  const close = () => run("resetAttackShortcutModals");
  const choices =
    kind === "setter"
      ? view.setters.map((option) => ({ ...option, value: option.index }))
      : config.choices;
  const closeAttribute = `data-close-${config.prefix}`;
  return (
    <ModalFrame
      id={`${config.prefix}-modal`}
      open={view[kind]}
      onClose={close}
      className="skill-modal force-popup"
      closeOnRoot
      backdropProps={{ [closeAttribute]: "" }}
      contentProps={{ className: "skill-modal__content base-modal__content" }}
    >
      <ModalHeader
        title={config.title}
        closeId={`${config.prefix}-modal-close`}
        onClose={close}
        closeProps={{ [closeAttribute]: "true" }}
      />
      <ModalBody>
        <p className="section-note">{config.note}</p>
        <div
          id={`${config.prefix}-modal-grid`}
          className="base-modal__grid"
        >
          {choices.map((option) => (
            <button
              key={option.value ?? "none"}
              type="button"
              className={option.className || "base-modal-btn"}
              {...{ [config.attribute]: option.value ?? "" }}
              data-key={option.key}
              onClick={() => run(config.command, option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="section-note base-modal__hint">{config.hint}</div>
      </ModalBody>
    </ModalFrame>
  );
}
