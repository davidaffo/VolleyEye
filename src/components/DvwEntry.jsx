import { useSyncExternalStore } from "react";
import { dvwEntryStore } from "../state/roster-import-store.mjs";
import { runtimeStore } from "../state/runtime-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../compat/runtime.js";
const run = (command, ...args) =>
  invokeRuntime(command, ...args).catch(console.error);
export function DvwEntry() {
  const view = useSyncExternalStore(
    dvwEntryStore.subscribe,
    dvwEntryStore.getSnapshot,
    dvwEntryStore.getSnapshot,
  );
  const controls = useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
  const disabled = !!controls.scoutControlsDisabled;
  return (
    <div className="scout-dvw-bar scout-widget" data-scout-widget="dvw">
      <div className="scout-dvw-bar__top">
        <div className="scout-dvw-bar__title-row">
          <label htmlFor="dvw-scout-input">Scout da codice DataVolley</label>
          <button
            id="btn-dvw-scout-help"
            className="icon-button scout-dvw-help-btn"
            type="button"
            data-react-managed="true"
            disabled={disabled}
            aria-label="Apri manuale codici scouting"
            title="Apri manuale codici scouting"
            onClick={() => invokeRuntimeEvent("openDvwScoutHelp")}
          >
            ?
          </button>
        </div>
        <div
          id="dvw-scout-last-code"
          className="scout-dvw-bar__last"
          aria-live="polite"
          data-react-managed="true"
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
          data-react-managed="true"
          placeholder="Esempio: *08SM#~~~15C oppure più token separati da spazio"
          value={view.text}
          onChange={(event) =>
            invokeRuntimeEvent("changeReactDvwText", event.target.value)
          }
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === " " || event.key === "Tab") {
              if (view.text.trim()) {
                event.preventDefault();
                invokeRuntimeEvent("queueCurrentDvwScoutToken");
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
          data-react-managed="true"
          onClick={() => run("applyDvwScoutInput")}
        >
          Applica
        </button>
        <button
          id="btn-dvw-scout-clear"
          className="secondary"
          type="button"
          disabled={disabled}
          data-react-managed="true"
          onClick={() => run("clearReactDvwEntry")}
        >
          Pulisci
        </button>
      </div>
      <div
        id="dvw-scout-breakdown"
        className="scout-dvw-bar__breakdown"
        aria-live="polite"
        data-react-managed="true"
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
        data-react-managed="true"
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
                data-react-managed="true"
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
        data-react-managed="true"
      >
        {view.status}
      </div>
    </div>
  );
}
