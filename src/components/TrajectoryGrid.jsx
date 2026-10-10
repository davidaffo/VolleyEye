import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { analysisTableStore } from "../state/analysis-table-store.mjs";
function useView(id) {
  useSyncExternalStore(
    analysisTableStore.subscribe,
    analysisTableStore.getSnapshot,
    analysisTableStore.getSnapshot,
  );
  return analysisTableStore.getView(id);
}
function TrajectoryCard({ card, serve, id, extraClass = "", scope }) {
  const canvas = useRef(null),
    visual = useRef(null);
  useLayoutEffect(() => {
    let mounted = true;
    const paint = () => {
      if (mounted && canvas.current && visual.current)
        card.paint?.(canvas.current, visual.current, paint);
    };
    paint();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(paint) : null;
    observer?.observe(visual.current);
    return () => {
      mounted = false;
      observer?.disconnect();
    };
  }, [card]);
  return (
    <div
      className={
        "trajectory-card" +
        (extraClass ? " " + extraClass : "") +
        (serve ? " serve-trajectory-card" : " traj-area-z" + card.zone) +
        (card.empty && !serve ? " empty" : "")
      }
      id={id}
      data-scope={scope}
      data-zone={card.zone}
      data-player-idx={card.playerIdx}
    >
      <div
        ref={visual}
        className={
          serve
            ? "serve-trajectory-card__visual" + (card.empty ? " empty" : "")
            : undefined
        }
      >
        <div className="trajectory-card__title">{card.title}</div>
        <canvas
          ref={canvas}
          data-traj-canvas={serve ? undefined : card.zone}
          data-serve-traj-canvas={serve ? card.playerIdx : undefined}
        />
        <div className="trajectory-card__empty">Nessuna traiettoria</div>
      </div>
      {card.stats !== undefined && (
        <div className="serve-trajectory-card__stats">
          <div className="serve-trajectory-card__stats-title">Dati battuta</div>
          <div className="serve-trajectory-card__stats-grid">
            {card.stats ? (
              card.stats.map((row) => (
                <div key={row.label} className="serve-trajectory-card__stat">
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))
            ) : (
              <div className="serve-trajectory-card__stat">Nessun dato</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export function TrajectoryGrid({ id, variant = "attack" }) {
  const view = useView(id),
    serve = variant === "serve";
  return (
    <div
      id={id}
      className={
        "trajectory-grid" +
        (serve ? " serve-trajectory-grid" : "") +
        (view.far ? " is-far" : "")
      }
      data-react-managed="true"
    >
      {(view.cards.length || serve
        ? view.cards
        : [4, 3, 2, 5, 6, 1].map((zone) => ({
            key: zone,
            zone,
            title: "Zona " + zone,
            empty: true,
          }))
      ).map((card) => (
        <TrajectoryCard key={card.key} card={card} serve={serve} />
      ))}
      {view.legend?.length > 0 && (
        <div
          className="distribution-legend trajectory-legend"
          aria-label="Legenda colori traiettorie"
        >
          {view.legend.map((item, index) => (
            <span key={index}>
              <i aria-hidden="true" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
export function AttackSummary({ id }) {
  const view = useView(id),
    rows = (items) =>
      items.map((row, index) => (
        <tr key={index} className={row.className}>
          {row.cells.map((cell, index) => (
            <td key={index} className={cell.className}>
              {cell.text}
            </td>
          ))}
        </tr>
      ));
  return (
    <div id={id} className="attack-analysis-summary" data-react-managed="true">
      {view.emptyText ? (
        <div className="players-empty">{view.emptyText}</div>
      ) : (
        view.rows.length > 0 && (
          <table className="attack-analysis-type-table">
            <thead>
              <tr>
                {[
                  "Tipo attacco",
                  "Tot",
                  "Err",
                  "Mur",
                  "Punti",
                  "% Punti",
                  "Eff",
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>{rows(view.rows)}</tbody>
            <tfoot>{rows(view.footerRows || [])}</tfoot>
          </table>
        )
      )}
    </div>
  );
}

export function LogServeTrajectories() {
  const view = useView("log-serve-trajectory"),
    cards = view.cards.length
      ? view.cards
      : [
          { key: "our", scope: "our", visible: false, empty: true },
          { key: "opponent", scope: "opponent", visible: false, empty: true },
        ];
  return (
    <div
      id="log-serve-trajectory"
      className={
        "log-serve-trajectory scout-widget" + (view.visible ? "" : " hidden")
      }
      data-scout-widget="serve-trajectories"
      data-react-managed="true"
    >
      <div className="log-serve-trajectory__grid">
        {cards.map((card) => (
          <TrajectoryCard
            key={card.key}
            card={card}
            serve
            id={
              card.scope === "our" ? "log-serve-card-our" : "log-serve-card-opp"
            }
            scope={card.scope}
            extraClass={"log-serve-card" + (card.visible ? "" : " hidden")}
          />
        ))}
      </div>
      {view.legend?.length > 0 && (
        <div
          className="distribution-legend trajectory-legend"
          aria-label="Legenda colori traiettorie"
        >
          {view.legend.map((item, index) => (
            <span key={index}>
              <i aria-hidden="true" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
