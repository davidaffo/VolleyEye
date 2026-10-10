import { useSyncExternalStore } from "react";
import { settingsStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
const fields = [
  {
    id: "auto-rotate-toggle-settings",
    field: "autoRotate",
    label: "Rotazione automatica su cambio palla",
  },
  {
    id: "auto-role-toggle-settings",
    field: "autoRolePositioning",
    label: "Auto posizionamento per ruolo",
  },
  {
    id: "auto-role-p1american-toggle-settings",
    field: "autoRoleP1American",
    label: "P1 americana (OH in 4, OP in 2 su cambio palla)",
  },
  {
    id: "attack-trajectory-toggle-settings",
    field: "attackTrajectoryEnabled",
    label: "Disegna traiettoria attacco",
  },
  {
    id: "attack-trajectory-simple-toggle-settings",
    field: "attackTrajectorySimplified",
    label: "Direzione attacco semplificata",
  },
  {
    id: "predictive-skill-toggle-settings",
    field: "predictiveSkillFlow",
    label: "Flusso di gioco automatico",
  },
];
export function SettingsModal() {
  const view = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getSnapshot,
  );
  const run = (command, ...args) =>
      invokeRuntime(command, ...args).catch((error) => {
        console.error(error);
        window.alert(error.message);
      }),
    close = () => run("closeSettingsModal");
  const toggle = (item) => (
    <label className="auto-rotate-toggle" key={item.id}>
      <input
        type="checkbox"
        id={item.id}
        data-react-managed="true"
        checked={!!view.values[item.field]}
        onChange={(event) =>
          run("changeReactSetting", item.field, event.target.checked)
        }
      />
      {item.label}
    </label>
  );
  return (
    <div
      id="settings-modal"
      className={"settings-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="settings-modal__backdrop"
        data-close-settings=""
        onClick={close}
      />
      <div className="settings-modal__content">
        <div className="settings-modal__head">
          <h3 id="settings-modal-title">Impostazioni automatismi</h3>
          <button
            id="settings-close"
            className="pill-remove"
            aria-label="Chiudi"
            data-react-managed="true"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="settings-modal__body">
          {fields.slice(0, 2).map(toggle)}
          <label className="auto-rotate-toggle auto-libero-row">
            <span>Libero automatico</span>
            <div className="auto-libero-controls">
              <select
                id="auto-libero-select-settings"
                data-react-managed="true"
                value={view.values.autoLiberoRole || ""}
                onChange={(event) =>
                  run(
                    "changeReactSetting",
                    "autoLiberoRole",
                    event.target.value,
                  )
                }
              >
                {["", "P", "S", "C", "O"].map((value) => (
                  <option key={value} value={value}>
                    {value || "Nessuno"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                id="btn-swap-libero-settings"
                className="small secondary"
                data-react-managed="true"
                onClick={() => run("swapManagedSettingsLibero")}
              >
                Cambia libero
              </button>
            </div>
          </label>
          {fields.slice(2).map(toggle)}
        </div>
      </div>
    </div>
  );
}
