import { ModalDialog } from "./ui/Modal.jsx";

import { useViewStore } from "../hooks/useViewStore.js";

import { videoEditStore } from "../state/video-edit-store.mjs";
import { actions as appActions } from "../app/actions.mjs";
const configs = {
  roleSetType: {
    prefix: "role-set-type",
    title: "Tipo alzata per ruolo",
    grid: "role-set-type-grid",
    close: "closeSetTypeByRole",
    apply: "applySetTypeByRole",
    note: "Scegli il tipo per ruolo dell'attaccante: vengono modificati gli attacchi filtrati alzati da palleggiatrici. Se il ruolo non è disponibile, vengono usati quello prevalente o la formazione di partenza.",
  },
  setterSetType: {
    prefix: "setter-set-type",
    title: "Tipo alzata per alzatrice",
    grid: "setter-set-type-grid",
    close: "closeSetTypeBySetter",
    apply: "applySetTypeBySetter",
    note: "Scegli il tipo da assegnare agli attacchi filtrati per ciascuna alzatrice. Le righe lasciate invariate non modificano gli attacchi.",
  },
  offset: {
    prefix: "offset",
    title: "Offset video per skill (secondi)",
    grid: "offset-skill-grid",
    close: "closeOffsetModal",
    apply: "applyOffsetsToSelectedSkills",
  },
  duration: {
    prefix: "skill-duration",
    title: "Durata skill (ms)",
    grid: "skill-duration-grid",
    close: "closeSkillDurationModal",
    apply: "applySkillDurationDefaults",
    note: "Imposta la durata di default per ogni fondamentale. Lo step è 250 ms.",
  },
  unify: {
    prefix: "unify-times",
    title: "Unifica tempi collegamenti",
    grid: "unify-times-grid",
    close: "closeUnifyTimesModal",
    apply: "applyUnifyTimes",
    note: "Scegli quali collegamenti unificare e da quale evento prendere il tempo.",
  },
};
export function VideoEditModal({ kind }) {
  const all = useViewStore(videoEditStore),
    view = all[kind],
    config = configs[kind];
  const run = (command) =>
      appActions[command]().catch((error) => {
        console.error(error);
        window.alert(error.message);
      }),
    close = () => run(config.close);
  const prefix = config.prefix,
    titleId = kind === "offset" ? "offset-modal-title" : prefix + "-title";
  return (
    <ModalDialog
      id={prefix + "-modal"}
      aria-labelledby={titleId}
      open={view.open}
      onClose={close}
      variant="settings"
      backdropProps={{}}
      title={<h3 id={titleId}>{config.title}</h3>}
      closeProps={{ id: prefix + "-close" }}
    >
      {config.note && <p className="section-note">{config.note}</p>}
      {kind === "setterSetType" && view.unknownCount > 0 && <p className="section-note">{view.unknownCount} {view.unknownCount === 1 ? 'attacco filtrato senza alzatrice associata' : 'attacchi filtrati senza alzatrice associata'}.</p>}
      {kind === "roleSetType" && view.unknownCount > 0 && <p className="section-note">{view.unknownCount} {view.unknownCount === 1 ? 'attacco filtrato escluso perché alzatrice o ruolo non determinabili' : 'attacchi filtrati esclusi perché alzatrice o ruolo non determinabili'}.</p>}
      <div id={config.grid} className={kind === "unify" ? "unify-times-grid" : "offset-skill-grid"}>
        {view.rows.map((row) =>
          kind === "setterSetType" || kind === "roleSetType" ? (
            <div key={row.id} className="offset-skill-row">
              <label htmlFor={prefix + '-' + row.id}>{row.label} · {row.count} {row.count === 1 ? 'attacco' : 'attacchi'}</label>
              <select id={prefix + '-' + row.id} value={row.value} disabled={!row.count}
                onChange={(event) => videoEditStore.change(kind, row.id, { value: event.target.value })}>
                <option value="">Lascia invariato</option>
                {view.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          ) : kind === "unify" ? (
            <div key={row.id} className="unify-times-row">
              <div className="unify-times-row__head">
                <input
                  type="checkbox"
                  data-link-type={row.id}
                  checked={row.enabled}
                  onChange={(event) =>
                    videoEditStore.change(kind, row.id, {
                      enabled: event.target.checked,
                    })
                  }
                />
                <span className="unify-times-row__label">{row.label}</span>
              </div>
              <div className="unify-times-row__options">
                {row.options.map((option) => (
                  <label key={option.id}>
                    <input
                      type="radio"
                      name={"unify-source-" + row.id}
                      value={option.id}
                      checked={row.value === option.id}
                      onChange={() =>
                        videoEditStore.change(kind, row.id, {
                          value: option.id,
                        })
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div key={row.id} className="offset-skill-row">
              <label>{row.label}</label>
              <input
                type="number"
                step={kind === "duration" ? "250" : "1"}
                min={kind === "duration" ? "250" : undefined}
                data-skill-id={row.id}
                value={row.value}
                onChange={(event) =>
                  videoEditStore.change(kind, row.id, {
                    value: event.target.value,
                  })
                }
              />
            </div>
          ),
        )}
      </div>
      {kind === "setterSetType" && !view.rows.length && <p className="section-note">Nessuna alzatrice trovata nelle azioni della partita.</p>}
      {kind === "roleSetType" && !view.rows.length && <p className="section-note">Nessun attacco filtrato con ruolo riconosciuto e alzata da palleggiatrice.</p>}
      <div className="offset-actions">
        <button id={prefix + "-apply"} className="small" onClick={() => run(config.apply)}>
          Applica
        </button>
        <button className="small secondary" onClick={close}>
          Annulla
        </button>
      </div>
    </ModalDialog>
  );
}
