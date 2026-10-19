import { ModalDialog } from "../ui/Modal.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { settingsStore } from "../../state/roster-import-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
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
  const view = useViewStore(settingsStore);
  const run = (command, ...args) =>
      appActions[command]( ...args).catch((error) => {
        console.error(error);
        window.alert(error.message);
      }),
    close = () => run("closeSettingsModal");
  const toggle = (item) => (
    <label className="auto-rotate-toggle" key={item.id}>
      <input
        type="checkbox"
        id={item.id}
        checked={!!view.values[item.field]}
        onChange={(event) =>
          run("changeReactSetting", item.field, event.target.checked)
        }
      />
      {item.label}
    </label>
  );
  return (
    <ModalDialog
      id="settings-modal"
      className="settings-modal"
      aria-labelledby="settings-modal-title"
      open={view.open}
      onClose={close}
      variant="settings"
      backdropProps={{ "data-close-settings": "" }}
      contentProps={{ className: "settings-modal__content" }}
      title={<h3 id="settings-modal-title">Impostazioni automatismi</h3>}
      closeProps={{
        id: "settings-close",
        className: "pill-remove",
        "aria-label": "Chiudi",
        onClick: close,
      }}
      bodyProps={{ className: "settings-modal__body" }}
    >
      {fields.slice(0, 2).map(toggle)}
      <label className="auto-rotate-toggle auto-libero-row">
        <span>Libero automatico</span>
        <div className="auto-libero-controls">
          <select
            id="auto-libero-select-settings"
            value={view.values.autoLiberoRole || ""}
            onChange={(event) => run("changeReactSetting", "autoLiberoRole", event.target.value)}
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
            onClick={() => run("swapManagedSettingsLibero")}
          >
            Cambia libero
          </button>
        </div>
      </label>
      {fields.slice(2).map(toggle)}
    </ModalDialog>
  );
}
