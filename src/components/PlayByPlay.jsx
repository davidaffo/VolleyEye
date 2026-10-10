import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { playByPlayStore } from "../state/roster-import-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";
function useView() {
  return useSyncExternalStore(
    playByPlayStore.subscribe,
    playByPlayStore.getSnapshot,
    playByPlayStore.getSnapshot,
  );
}
export function PlayByPlaySelect() {
  const view = useView();
  return (
    <select
      id="analysis-play-by-play-set"
      data-react-managed="true"
      value={view.selectedSet}
      onChange={(event) =>
        invokeRuntime("changeReactPlayByPlaySet", event.target.value).catch(
          console.error,
        )
      }
    >
      {view.sets.map((set) => (
        <option key={set} value={String(set)}>
          Set {set}
        </option>
      ))}
    </select>
  );
}
export function PlayByPlaySummary() {
  const view = useView();
  return (
    <div
      id="analysis-play-by-play-summary"
      className="play-by-play-summary"
      data-react-managed="true"
    >
      {view.count > 0 && (
        <>
          <span>
            <strong>{view.count}</strong> rally
          </span>
          <span className="positive">
            <strong>{view.won}</strong> vinti
          </span>
          <span className="negative">
            <strong>{view.lost}</strong> persi
          </span>
          <span>
            <strong>{view.avgTouches}</strong> tocchi scoutati/rally
          </span>
        </>
      )}
    </div>
  );
}
function RallyTooltip({ hover }) {
  const ref = useRef(null),
    [position, setPosition] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!hover || !ref.current) return;
    const width = ref.current.offsetWidth || 260,
      height = ref.current.offsetHeight || 120,
      maxLeft = Math.max(8, window.innerWidth - width - 8),
      maxTop = Math.max(8, window.innerHeight - height - 8);
    let left = hover.x + 12,
      top = hover.y + 12;
    if (left > maxLeft) left = hover.x - width - 12;
    if (top > maxTop) top = hover.y - height - 12;
    setPosition({
      left: Math.min(maxLeft, Math.max(8, left)),
      top: Math.min(maxTop, Math.max(8, top)),
    });
  }, [hover]);
  if (!hover) return null;
  const rally = hover.rally;
  return createPortal(
    <div ref={ref} className="play-by-play-tooltip" style={position}>
      <div className="play-by-play-tooltip__title">
        <span>
          Point {rally.rallyNumber} · Set {rally.setNum}
        </span>
        <strong>
          {rally.startScoreLabel} → {rally.scoreLabel}
        </strong>
      </div>
      <table>
        <thead>
          <tr>
            {["Team", "Player", "Skill", "Code", "Evaluation"].map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rally.actions.map((action, index) => (
            <tr key={index}>
              <td>{action.team}</td>
              <td>{action.actor}</td>
              <td>{action.skill}</td>
              <td>{action.extras}</td>
              <td>{action.evaluation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
    document.body,
  );
}
export function PlayByPlayTable() {
  const view = useView(),
    [hover, setHover] = useState(null);
  useLayoutEffect(() => setHover(null), [view]);
  return (
    <div
      id="analysis-play-by-play"
      className="play-by-play-list"
      data-react-managed="true"
    >
      {view.count === 0 ? (
        <div className="players-empty">
          Registra o importa eventi con punteggio per vedere il play by play.
        </div>
      ) : (
        <div
          className="play-by-play-table-shell"
          onScroll={() => setHover(null)}
        >
          <table className="play-by-play-table">
            <thead>
              <tr>
                {[
                  "#",
                  "Start",
                  "Score",
                  "Servizio",
                  "Fase",
                  "Punto",
                  "Motivo",
                  "Sequenza scout",
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((rally, index) => (
                <tr
                  key={rally.key}
                  className={"play-by-play-row is-" + rally.tone}
                >
                  <td className="num">{rally.rallyNumber}</td>
                  <td className="score">{rally.startScoreLabel}</td>
                  <td className="score final">{rally.scoreLabel}</td>
                  <td>{rally.servingTeam || "-"}</td>
                  <td className="phase">{rally.phase || "-"}</td>
                  <td className="winner">{rally.winner || "-"}</td>
                  <td>{rally.scoringReason || "-"}</td>
                  <td>
                    <div className="play-by-play-sequence">
                      {rally.actions.length ? (
                        rally.actions.map((action, actionIndex) => (
                          <span
                            key={actionIndex}
                            className={"play-by-play-token is-" + action.tone}
                            data-rally-index={index}
                            data-action-index={actionIndex}
                            onMouseEnter={(event) =>
                              setHover({
                                rally,
                                x: event.clientX,
                                y: event.clientY,
                              })
                            }
                            onMouseMove={(event) =>
                              setHover({
                                rally,
                                x: event.clientX,
                                y: event.clientY,
                              })
                            }
                            onMouseLeave={() => setHover(null)}
                          >
                            <span className="play-by-play-token__idx">
                              {actionIndex + 1}
                            </span>
                            <code>{action.code}</code>
                            <span>{action.actor}</span>
                          </span>
                        ))
                      ) : (
                        <span className="play-by-play-token is-neutral">
                          Nessuna azione
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <RallyTooltip hover={hover} />
    </div>
  );
}
