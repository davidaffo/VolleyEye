import { useSyncExternalStore } from "react";
import { videoEditStore } from "../state/video-edit-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";
const configs = {
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
  const all = useSyncExternalStore(
      videoEditStore.subscribe,
      videoEditStore.getSnapshot,
      videoEditStore.getSnapshot,
    ),
    view = all[kind],
    config = configs[kind];
  const run = (command) =>
      invokeRuntime(command).catch((error) => {
        console.error(error);
        window.alert(error.message);
      }),
    close = () => run(config.close);
  const prefix = config.prefix,
    titleId = kind === "offset" ? "offset-modal-title" : prefix + "-title";
  return (
    <div
      id={prefix + "-modal"}
      className={"settings-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="settings-modal__backdrop" onClick={close} />
      <div className="settings-modal__content">
        <div className="settings-modal__head">
          <h3 id={titleId}>{config.title}</h3>
          <button
            id={prefix + "-close"}
            className="pill-remove"
            aria-label="Chiudi"
            data-react-managed="true"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="settings-modal__body">
          {config.note && <p className="section-note">{config.note}</p>}
          <div
            id={config.grid}
            className={
              kind === "unify" ? "unify-times-grid" : "offset-skill-grid"
            }
            data-react-managed="true"
          >
            {view.rows.map((row) =>
              kind === "unify" ? (
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
          <div className="offset-actions">
            <button
              id={prefix + "-apply"}
              className="small"
              data-react-managed="true"
              onClick={() => run(config.apply)}
            >
              Applica
            </button>
            <button className="small secondary" onClick={close}>
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
