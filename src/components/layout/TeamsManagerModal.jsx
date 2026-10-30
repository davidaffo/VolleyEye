import { ModalDialog } from "../ui/Modal.jsx";

import { CommandButton } from "../ui/CommandButton.jsx";
import { FileImportInput } from "../ui/FileImportInput.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { useRef, useState } from "react";
import {
  teamsManagerStore,
  getTeamMergeChoices,
} from "../../state/teams-manager-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";

function report(error) {
  console.error("Operazione squadra non riuscita", error);
  window.alert(error.message);
}
async function run(command, ...args) {
  try {
    return await appActions[command]( ...args);
  } catch (error) {
    report(error);
  }
}
function TeamMerge({ primary, teams }) {
  const [secondaryName, setSecondaryName] = useState("");
  const [choices, setChoices] = useState({});
  const [saving, setSaving] = useState(false);
  const secondary = teams.find((team) => team.name === secondaryName);
  const others = teams.filter((team) => team.name !== primary.name);
  if (!others.length) return null;
  return (
    <>
      <h4>Unisci in “{primary.name}”</h4>
      <label>
        Squadra da unire ed eliminare
        <select
          aria-label="Squadra da unire ed eliminare"
          value={secondaryName}
          onChange={(event) => {
            const name = event.target.value;
            setSecondaryName(name);
            const team = teams.find((team) => team.name === name);
            setChoices(team ? getTeamMergeChoices(primary, team) : {});
          }}
        >
          <option value="">Seleziona una squadra…</option>
          {others.map((team) => (
            <option key={team.name} value={team.name}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      {secondary && (
        <div>
          <p className="section-note">
            Verifica gli abbinamenti. Le giocatrici non abbinate saranno
            aggiunte. In caso di conflitto si mantengono i dati della squadra
            scelta; nomi e numeri storici delle partite restano invariati.
          </p>
          {secondary.players.map((player) => (
            <label key={player.id} className="controls-row">
              {player.name} →{" "}
              <select
                aria-label={"Abbina " + player.name}
                value={choices[player.id] || ""}
                disabled={primary.players.some((p) => p.id === player.id)}
                onChange={(event) =>
                  setChoices((previous) => ({
                    ...previous,
                    [player.id]: event.target.value,
                  }))
                }
              >
                <option value="">Aggiungi alla rosa</option>
                {primary.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button
            className="danger"
            disabled={saving}
            onClick={async () => {
              if (saving) return;
              setSaving(true);
              try {
                await run("mergeManagedTeams", secondaryName, choices);
              } finally {
                setSaving(false);
              }
            }}
          >
            Unisci squadre
          </button>
        </div>
      )}
    </>
  );
}
export function TeamsManagerModal() {
  const view = useViewStore(teamsManagerStore);
  const fileInput = useRef(null);
  const selected = view.teams.find((team) => team.name === view.selectedName);
  const action = (id, text, command, className, requiresSelection = false) => (
    <CommandButton
      id={id}
      className={className}
      disabled={requiresSelection && !selected}
      command={command}
      onError={report}
    >
      {text}
    </CommandButton>
  );
  return (
    <ModalDialog
      id="teams-manager-modal"
      aria-labelledby="teams-manager-title"
      open={view.open}
      onClose={() => run("closeTeamsManagerModal")}
      variant="settings"
      backdropProps={{ "data-close-teams-manager": "" }}
      contentProps={{
        className: "settings-modal__content teams-manager__content",
      }}
      title={<h3 id="teams-manager-title">Gestione squadre</h3>}
      closeProps={{ id: "teams-manager-close" }}
      bodyProps={{ className: "settings-modal__body teams-manager__body" }}
    >
      <div className="teams-manager-row">
        <label>Squadre salvate</label>
        <ul id="teams-manager-list" className="teams-manager-list">
          {view.teams.length ? (
            view.teams.map((team) => (
              <li
                key={team.name}
                data-team-name={team.name}
                className={
                  "teams-manager-item" + (team.name === view.selectedName ? " selected" : "")
                }
                onClick={() => run("selectManagedTeam", team.name)}
              >
                {team.name}
              </li>
            ))
          ) : (
            <li className="teams-manager-item">Nessuna squadra salvata.</li>
          )}
        </ul>
      </div>
      <div className="teams-manager-actions">
        {action("btn-new-team", "Nuova squadra", "createManagedTeam", "primary")}
        {action(
          "teams-manager-open-team",
          "Gestione squadra",
          "openSelectedManagedTeam",
          "secondary",
          true,
        )}
        {action("teams-manager-delete", "Elimina", "deleteSelectedManagedTeam", "danger", true)}
        {action(
          "teams-manager-duplicate",
          "Duplica",
          "duplicateSelectedManagedTeam",
          "secondary",
          true,
        )}
        {action(
          "teams-manager-export",
          "Esporta su file",
          "exportSelectedManagedTeam",
          "secondary",
          true,
        )}
        <button
          id="teams-manager-import"
          className="secondary"
          onClick={() => {
            fileInput.current.value = "";
            fileInput.current.click();
          }}
        >
          Importa da file
        </button>
        {action(
          "teams-manager-open-players-db",
          "Archivio giocatrici",
          "openPlayersDbModal",
          "secondary",
        )}
        <FileImportInput
          ref={fileInput}
          id="teams-manager-file-input"
          type="file"
          accept="application/json,text/plain"
          hidden
          onFile={(file) => run("importTeamToStorageOnly", file)}
        />
      </div>
      <p className="section-note">La selezione qui serve solo per gestire le squadre salvate.</p>
      <div id="team-merge-panel" className="teams-manager-row">
        {selected && (
          <TeamMerge
            key={JSON.stringify([view.selectedName, view.teams])}
            primary={selected}
            teams={view.teams}
          />
        )}
      </div>
    </ModalDialog>
  );
}
