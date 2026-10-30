
import { useViewStore } from "../hooks/useViewStore.js";
import { useLayoutEffect } from "react";
import { scoutCourtStore } from "../state/scout-court-store.mjs";
import { runtimeStore } from "../state/runtime-store.mjs";
import { events as appEvents } from "../app/actions.mjs";
function act(callback, event) {
  if (!callback) return;
  try {
    Promise.resolve(callback(event)).catch(report);
  } catch (error) {
    report(error);
  }
}
function actSkill(action, event) {
  if (!action) return;
  act(() => appEvents.runScoutSkillAction(action, event), event);
}
function report(error) {
  console.error("Scout non registrato", error);
  window.alert(error.message);
}
export function ScoutSkillControls({ view, disabled }) {
  if (!view) return null;
  return (
    <>
      {view.cancel && (
        <button
          type="button"
          className="player-skill-cancel"
          title="Annulla fondamentale"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            actSkill(view.cancel, event);
          }}
        >
          ✕
        </button>
      )}
      {view.note && <div className="players-empty">{view.note}</div>}
      {view.groups.map((group, index) => {
        const content = (
          <>
            {group.header && (
              <div className="skill-header">
                <span
                  className={group.header.className}
                  style={group.header.style || undefined}
                >
                  {group.header.text}
                </span>
              </div>
            )}
            {group.buttons.map((button, buttonIndex) => (
              <button
                key={buttonIndex}
                type="button"
                className={button.className}
                style={button.style || undefined}
                disabled={disabled}
                data-player-idx={button.data?.playerIdx}
                data-player-name={button.data?.playerName}
                data-skill-id={button.data?.skillId}
                data-code={button.data?.code}
                onClick={(event) => actSkill(button.action, event)}
              >
                {button.text}
              </button>
            ))}
          </>
        );
        return group.className ? (
          <div
            key={index}
            className={group.className}
            onPointerDown={(event) => actSkill(group.pointerAction, event)}
          >
            {content}
          </div>
        ) : (
          <span key={index} style={{ display: "contents" }}>
            {content}
          </span>
        );
      })}
    </>
  );
}
export function ScoutCourt({ scope }) {
  const courts = useViewStore(scoutCourtStore);
  const controls = useViewStore(runtimeStore);
  const view = courts[scope];
  const disabled = !!controls.scoutControlsDisabled;
  useLayoutEffect(() => {
    if (!view.previousRects) return;
    appEvents.animateFlip(view.previousRects,
      `.court-card[data-team-scope="${scope}"]`,
      (element) =>
        element.dataset.playerName || "pos-" + (element.dataset.posIndex || ""),
    );
  }, [view, scope]);
  const pickHost = !view.hidden && (view.errorPick || view.pointPick) && (
    <div
      className={view.pointPick ? "point-pick-host" : "error-pick-bench-host"}
      data-team-scope={scope}
    >
      <div className="error-pick-bench">
        <div className="error-pick-bench-title">
          {view.pointPick ? "Punto" : "Panchina"}
        </div>
        <button
          type="button"
          className={
            "error-choice-btn " +
            (view.pointPick ? "success" : "danger error-pick-bench-team-error")
          }
          disabled={disabled}
          onClick={(event) =>
            act(view.pointPick ? view.onTeamPoint : view.onTeamError, event)
          }
        >
          {view.pointPick ? "Assegna alla squadra" : "Errore squadra"}
        </button>
        {view.errorPick && (
          <div className="error-choice-grid error-pick-bench-grid">
            {view.bench.length ? (
              view.bench.map((player) => (
                <button
                  key={player.name}
                  type="button"
                  className="error-choice-btn danger error-pick-bench-btn"
                  disabled={disabled}
                  onClick={(event) => act(player.onPick, event)}
                >
                  {player.label}
                </button>
              ))
            ) : (
              <div className="players-empty">
                Nessuna giocatrice in panchina.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  return (
    <>
      {view.far && pickHost}
      <div
        id={
          scope === "opponent"
            ? "opponent-players-container"
            : "players-container"
        }
        className={
          "court-layout" +
          (view.mirrored ? " court-layout--mirror" : "") +
          (view.hidden ? " hidden" : "")
        }
      >
        {!view.hidden && (
          <>
            {(view.errorPick || view.pointPick) && (
              <div className="error-pick-toolbar">
                <button
                  type="button"
                  className="player-skill-cancel error-pick-close"
                  title="Annulla"
                  aria-label={
                    view.pointPick
                      ? "Annulla selezione punto"
                      : "Annulla selezione errore"
                  }
                  disabled={disabled}
                  onClick={(event) => act(view.onCancelPick, event)}
                >
                  ✕
                </button>
              </div>
            )}
            {view.cards.map((card) => (
              <div
                key={card.index}
                className={
                  "player-card court-card pos-" +
                  (card.index + 1) +
                  (card.libero
                    ? " libero-card"
                    : card.setter
                      ? " setter-card"
                      : "") +
                  (!card.name ? " empty" : "") +
                  (card.photo ? " has-player-photo" : "") +
                  (view.compact ? " compact-card" : "")
                }
                data-pos-number={card.index + 1}
                data-pos-index={card.posIndex}
                data-player-name={card.name || ""}
                data-team-scope={scope}
                data-drop-target="main"
                style={{
                  gridArea: card.gridArea,
                  ...(card.photo
                    ? {
                        "--player-photo-image":
                          "url(" + JSON.stringify(card.photo) + ")",
                      }
                    : {}),
                }}
                onDragEnterCapture={(event) =>
                  appEvents.handlePositionDragOver(event,
                    event.currentTarget,
                  )
                }
                onDragOverCapture={(event) =>
                  appEvents.handlePositionDragOver(event,
                    event.currentTarget,
                  )
                }
                onDragLeaveCapture={(event) =>
                  appEvents.handlePositionDragLeave(event.currentTarget,
                  )
                }
                onDropCapture={(event) =>
                  appEvents.handlePositionDrop(event,
                    event.currentTarget,
                  )
                }
              >
                <div
                  className={
                    "court-header" +
                    (card.name && card.libero ? " draggable" : "")
                  }
                  draggable={!!card.name && card.libero}
                  onDragStart={(event) =>
                    appEvents.handleCourtDragStart(event,
                      card.posIndex,
                      scope,
                    )
                  }
                  onDragEnd={(event) =>
                    appEvents.handleCourtDragEnd(event)
                  }
                >
                  <div className="court-tagbar">
                    <span className="court-pos-label">
                      Pos {card.index + 1}
                    </span>
                    <span
                      className={
                        "court-libero-pill" +
                        (!card.libero && card.setter
                          ? " court-setter-pill"
                          : "")
                      }
                      style={{
                        visibility:
                          card.libero || card.setter ? "visible" : "hidden",
                      }}
                    >
                      {card.libero ? "L" : "P"}
                    </span>
                    {card.onRestore && (
                      <button
                        type="button"
                        className="libero-return-btn"
                        title={card.restoreLabel}
                        disabled={disabled}
                        onClick={(event) => {
                          event.stopPropagation();
                          act(card.onRestore, event);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.stopPropagation();
                            act(card.onRestore, event);
                          }
                        }}
                      >
                        ↩
                      </button>
                    )}
                  </div>
                  <div className="court-name-block inline">
                    <div
                      className={
                        "court-name" + (card.libero ? " libero-flag" : "")
                      }
                    >
                      {card.label}
                    </div>
                    <span className="court-role-tag">{card.role}</span>
                  </div>
                </div>
                {card.onPick ? (
                  <div className="skill-row error-pick-row">
                    <button
                      type="button"
                      className={
                        "event-btn " +
                        (view.pointPick ? "success" : "danger") +
                        " error-pick-btn"
                      }
                      disabled={disabled}
                      onClick={(event) => act(card.onPick, event)}
                    >
                      {view.pointPick ? "Punto" : "Errore"}
                    </button>
                  </div>
                ) : (
                  <ScoutSkillControls view={card.skills} disabled={disabled} />
                )}
              </div>
            ))}
          </>
        )}
      </div>
      {!view.far && pickHost}
    </>
  );
}
