import { ModalDialog } from "../ui/Modal.jsx";
import { SelectOptions } from "../ui/SelectOptions.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";
import { useState } from "react";
import { matchDialogStore } from "../../state/match-dialog-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";

export function NewMatchModal() {
  const view = useViewStore(matchDialogStore);
  const [saving, setSaving] = useState(false);
  const editing = view.mode === "edit";
  const draft = view.draft;
  const double = draft.mode === "double";
  const field = (name) => ({
    value: draft[name],
    onChange: (event) => matchDialogStore.update(name, event.target.value),
  });
  const run = async (command) => {
    try {
      await appActions[command]();
    } catch (error) {
      console.error("Operazione partita non riuscita", error);
      window.alert(error.message);
    }
  };
  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await run("submitMatchDialog");
    } finally {
      setSaving(false);
    }
  };
  const teamOptions = (selected, opponent = false) =>
    editing ? (
      <option value={selected}>{selected || "—"}</option>
    ) : (
      <>
        <option value="">
          {opponent ? "Seleziona avversaria" : "Seleziona squadra"}
        </option>
        {view.teamNames.map((name) => (
          <option
            key={name}
            value={name}
            disabled={opponent && name === draft.teamName}
          >
            {name}
          </option>
        ))}
      </>
    );
  return (
    <ModalDialog
      id="new-match-modal"
      data-mode={view.mode}
      aria-labelledby="new-match-title"
      open={view.open}
      onClose={() => run("closeMatchDialog")}
      variant="settings"
      backdropProps={{ "data-close-new-match": "" }}
      contentProps={{
        className: "settings-modal__content new-match-modal__content",
      }}
      title={
        <div>
          <p className="match-lobby-eyebrow">{editing ? "Partita selezionata" : "Nuova partita"}</p>
          <h3 id="new-match-title">{editing ? "Modifica dati partita" : "Crea partita"}</h3>
        </div>
      }
      closeProps={{ id: "new-match-close" }}
    >
      <p className="section-note">
        {
          "Squadra principale, modalità e squadra avversaria in modalità doppia restano bloccate dopo la creazione."
        }
      </p>
      <div className="new-match-setup-grid">
        <label className="new-match-field">
          <span>{"Squadra principale"}</span>
          <select
            id="new-match-team"
            {...field("teamName")}
            disabled={editing || !view.teamNames.length}
          >
            {teamOptions(draft.teamName)}
          </select>
        </label>
        <fieldset className="new-match-mode">
          <legend>{"Modalità di scouting"}</legend>
          <label>
            <input
              type="radio"
              name="new-match-mode"
              value="single"
              checked={!double}
              disabled={editing}
              onChange={() => matchDialogStore.update("mode", "single")}
            />
            {" Squadra singola"}
          </label>
          <label>
            <input
              type="radio"
              name="new-match-mode"
              value="double"
              checked={double}
              disabled={editing}
              onChange={() => matchDialogStore.update("mode", "double")}
            />
            {" Due squadre"}
          </label>
        </fieldset>
        <label
          className={"new-match-field" + (double ? " hidden" : "")}
          id="new-match-opponent-name-field"
        >
          <span>{"Nome avversario"}</span>
          <input
            id="new-match-opponent-name"
            {...field("opponentManual")}
            type="text"
            autoComplete="off"
            placeholder="Nome squadra avversaria"
          />
        </label>
        <label
          className={"new-match-field" + (double ? "" : " hidden")}
          id="new-match-opponent-team-field"
        >
          <span>{"Squadra avversaria"}</span>
          <select
            id="new-match-opponent-team"
            {...field("opponentTeam")}
            disabled={editing || !view.teamNames.length}
          >
            {teamOptions(draft.opponentTeam, true)}
          </select>
        </label>
      </div>
      <p
        id="new-match-empty-teams"
        className={"section-note" + (editing || view.teamNames.length ? " hidden" : "")}
      >
        {"Prima di creare una partita devi salvare almeno una squadra."}
      </p>
      <div className="new-match-setup-grid">
        <div className="col">
          <label htmlFor="match-category">{"Categoria"}</label>
          <input id="match-category" {...field("category")} type="text" />
        </div>
        <div className="col">
          <label htmlFor="match-date">{"Data"}</label>
          <input id="match-date" {...field("date")} type="date" />
        </div>
        <div className="col">
          <label htmlFor="match-type">{"Tipo partita"}</label>
          <select id="match-type" {...field("matchType")}>
            <SelectOptions
              options={[
                ["amichevole", "Amichevole"],
                ["campionato", "Campionato"],
                ["torneo", "Torneo"],
                ["playoff", "Playoff"],
                ["playout", "Playout"],
                ["coppa", "Coppa"],
                ["", "Altro"],
              ]}
            />
          </select>
        </div>
        <div className="col">
          <label htmlFor="match-leg">{"Turno"}</label>
          <select id="match-leg" {...field("leg")}>
            <SelectOptions
              options={[
                ["", "-"],
                ["andata", "Andata"],
                ["ritorno", "Ritorno"],
                ["gara-1", "Gara 1"],
                ["gara-2", "Gara 2"],
                ["gara-3", "Gara 3"],
              ]}
            />
          </select>
        </div>
      </div>
      <div className="controls-row new-match-actions">
        <button
          id="new-match-confirm"
          type="button"
          onClick={submit}
          disabled={saving || (!editing && !view.teamNames.length)}
        >
          {editing ? "Salva modifiche" : "Crea partita"}
        </button>
        <button
          id="new-match-manage-teams"
          onClick={() => run("manageDialogTeams")}
          className={"secondary" + (editing ? " hidden" : "")}
          type="button"
        >
          {"Gestione squadre"}
        </button>
        <button
          className="secondary"
          type="button"
          data-close-new-match=""
          onClick={() => run("closeMatchDialog")}
        >
          {"Annulla"}
        </button>
      </div>
    </ModalDialog>
  );
}
