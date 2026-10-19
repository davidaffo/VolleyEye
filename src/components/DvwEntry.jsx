import { ScoutWidgetPortal } from './ScoutWorkspace.jsx';
import { ScoutWidgetHandle } from "./ScoutWidgetHandle.jsx";

import { useViewStore } from "../hooks/useViewStore.js";

import { dvwEntryStore } from "../state/roster-import-store.mjs";
import { runtimeStore } from "../state/runtime-store.mjs";
import { actions as appActions, events as appEvents } from "../app/actions.mjs";
const run = (command, ...args) =>
  appActions[command]( ...args).catch(console.error);
export function DvwEntry() {
  const view = useViewStore(dvwEntryStore);
  const controls = useViewStore(runtimeStore);
  const disabled = !!controls.scoutControlsDisabled;
  return (
    <ScoutWidgetPortal className="scout-dvw-bar scout-widget" data-scout-widget="dvw">
      <ScoutWidgetHandle label="codice DataVolley" />
      <div className="scout-dvw-bar__top">
        <div className="scout-dvw-bar__title-row">
          <label htmlFor="dvw-scout-input">Scout da codice DataVolley</label>
          <button
            id="btn-dvw-scout-help"
            className="icon-button scout-dvw-help-btn"
            type="button"
            disabled={disabled}
            aria-label="Apri manuale codici scouting"
            title="Apri manuale codici scouting"
            onClick={() => appEvents.openDvwScoutHelp()}
          >
            ?
          </button>
        </div>
        <div
          id="dvw-scout-last-code"
          className="scout-dvw-bar__last"
          aria-live="polite"
        >
          {view.lastCode}
        </div>
      </div>
      <div className="scout-dvw-bar__controls">
        <input
          id="dvw-scout-input"
          type="text"
          autoComplete="off"
          spellCheck="false"
          placeholder="Esempio: *08SM#~~~15C oppure più token separati da spazio"
          value={view.text}
          onChange={(event) =>
            appEvents.changeReactDvwText(event.target.value)
          }
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === " " || event.key === "Tab") {
              if (view.text.trim()) {
                event.preventDefault();
                appEvents.queueCurrentDvwScoutToken();
              }
            } else if (event.key === "Enter") {
              event.preventDefault();
              run("applyDvwScoutInput");
            }
          }}
        />
        <button
          id="btn-dvw-scout-apply"
          className="secondary"
          type="button"
          disabled={disabled}
          onClick={() => run("applyDvwScoutInput")}
        >
          Applica
        </button>
        <button
          id="btn-dvw-scout-clear"
          className="secondary"
          type="button"
          disabled={disabled}
          onClick={() => run("clearReactDvwEntry")}
        >
          Pulisci
        </button>
      </div>
      <div
        id="dvw-scout-breakdown"
        className="scout-dvw-bar__breakdown"
        aria-live="polite"
      >
        {view.breakdown?.suggestion && (
          <div className="scout-dvw-breakdown__suggestion">
            <span className="scout-dvw-breakdown__suggestion-label">
              {view.breakdown.suggestion.label}
            </span>
            <code>{view.breakdown.suggestion.code}</code>
          </div>
        )}
        <div className="scout-dvw-breakdown__grid">
          {view.breakdown?.groups?.map((group, index) => (
            <section
              key={index}
              className={
                "scout-dvw-breakdown__group " +
                group.className +
                (group.placeholder ? " is-placeholder" : "")
              }
            >
              <div className="scout-dvw-breakdown__group-title">
                {group.title}
              </div>
              {group.text ? (
                <div className="scout-dvw-breakdown__command-text">
                  {group.text}
                </div>
              ) : (
                <div className="scout-dvw-breakdown__group-body">
                  {group.entries?.map((entry, i) => (
                    <div
                      key={i}
                      className={
                        "scout-dvw-breakdown__item" +
                        (entry.value ? " is-filled" : "")
                      }
                    >
                      <span className="scout-dvw-breakdown__key">
                        {entry.label}
                      </span>
                      <span className="scout-dvw-breakdown__value">
                        {entry.value || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
      <div
        id="dvw-scout-pending"
        className="scout-dvw-bar__pending"
        aria-live="polite"
      >
        {view.tokens.map((token) => (
          <div
            key={token.id}
            title={token.compound ? "Compound code espanso" : undefined}
            className={[
              "scout-dvw-chip",
              token.draft && "is-draft",
              token.invalid && "is-invalid",
              token.skillClass,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="scout-dvw-chip__code">{token.text}</span>
            {!token.draft && (
              <button
                type="button"
                className="scout-dvw-chip__remove"
                disabled={disabled}
                title="Rimuovi token"
                onClick={() => run("removeReactDvwToken", token.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <div
        id="dvw-scout-status"
        className={
          "scout-dvw-bar__status" + (view.tone ? " is-" + view.tone : "")
        }
        aria-live="polite"
      >
        {view.status}
      </div>
    </ScoutWidgetPortal>
  );
}
