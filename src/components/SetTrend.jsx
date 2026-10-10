import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { setTrendStore } from "../state/roster-import-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";
function useView() {
  return useSyncExternalStore(
    setTrendStore.subscribe,
    setTrendStore.getSnapshot,
    setTrendStore.getSnapshot,
  );
}
export function SetTrendCard({ card, selection }) {
  const c = card,
    [hover, setHover] = useState(null),
    [position, setPosition] = useState({ left: 0, top: 0 }),
    plot = useRef(null),
    tooltip = useRef(null);
  useLayoutEffect(() => {
    setHover(null);
  }, [card]);
  useLayoutEffect(() => {
    if (!hover || !plot.current || !tooltip.current) return;
    const rect = plot.current.getBoundingClientRect(),
      tip = tooltip.current.getBoundingClientRect();
    let left = hover.tooltipX * rect.width + 10;
    if (left + tip.width > rect.width - 6)
      left = hover.tooltipX * rect.width - tip.width - 10;
    let top = hover.tooltipY * rect.height - tip.height - 10;
    if (top < 6) top = hover.tooltipY * rect.height + 10;
    setPosition({ left: Math.max(6, left), top: Math.max(6, top) });
  }, [hover]);
  const active = (point) =>
    (point.key === selection ? " is-selected" : "") +
    (point.key === hover?.key ? " is-hover" : "");
  return (
    <div className="set-trend-card">
      <div className="set-trend-card__head">
        <div className="set-trend-card__title">{c.title}</div>
        <div className="set-trend-card__score">{c.score}</div>
      </div>
      <div className="set-trend-card__plot" ref={plot}>
        <svg
          viewBox={`0 0 ${c.width} ${c.height}`}
          className="set-trend-svg"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Andamento set"
        >
          <rect
            className="set-trend__bg"
            x="0"
            y="0"
            width={c.width}
            height={c.height}
            rx="12"
            ry="12"
          />
          <g className="set-trend__grid">
            {c.yTicks.map((tick, index) => (
              <g key={index} className="set-trend__tick">
                <line
                  x1={c.pad.left}
                  y1={tick.y}
                  x2={c.width - c.pad.right}
                  y2={tick.y}
                />
                <text x={c.pad.left - 8} y={tick.textY} textAnchor="end">
                  {tick.label}
                </text>
              </g>
            ))}
          </g>
          <line
            className="set-trend__zero"
            x1={c.pad.left}
            y1={c.zero}
            x2={c.width - c.pad.right}
            y2={c.zero}
          />
          <line
            className="set-trend__axis"
            x1={c.pad.left}
            y1={c.height - c.pad.bottom}
            x2={c.width - c.pad.right}
            y2={c.height - c.pad.bottom}
          />
          <g className="set-trend__segments">
            {c.segments.map((segment, index) => (
              <line
                key={index}
                className={"set-trend__segment is-" + segment.tone}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
              />
            ))}
          </g>
          <g className="set-trend__guides">
            {c.points.map((point) => (
              <line
                key={point.key}
                className={"set-trend__guide" + active(point)}
                data-point-key={point.key}
                x1={point.x}
                y1={c.pad.top}
                x2={point.x}
                y2={c.height - c.pad.bottom}
              />
            ))}
          </g>
          <g className="set-trend__hits">
            {c.points.map((point) => (
              <rect
                key={point.key}
                className="set-trend__hit"
                data-point-key={point.key}
                x={point.hitX}
                y={c.pad.top}
                width={point.hitWidth}
                height={c.plotH}
                onMouseEnter={() => setHover(point)}
                onMouseLeave={() => setHover(null)}
                onClick={() =>
                  invokeRuntime("selectReactSetTrendPoint", point.key).catch(
                    console.error,
                  )
                }
              />
            ))}
          </g>
          <g className="set-trend__dots">
            {c.points.map((point) => (
              <circle
                key={point.key}
                className={"set-trend__dot is-" + point.tone + active(point)}
                data-point-key={point.key}
                cx={point.x}
                cy={point.y}
                r={point.key === selection ? 6 : 4.5}
              />
            ))}
          </g>
          <g className="set-trend__x-ticks">
            {c.xTicks.map((tick, index) => (
              <g key={index} className="set-trend__tick">
                <line
                  x1={tick.x}
                  y1={c.height - c.pad.bottom}
                  x2={tick.x}
                  y2={c.height - c.pad.bottom + 6}
                />
                <text x={tick.x} y={c.height - 8} textAnchor="middle">
                  {tick.label}
                </text>
              </g>
            ))}
          </g>
          <text className="set-trend__label" x={c.pad.left} y={c.pad.top - 4}>
            Delta punti
          </text>
        </svg>
        <div
          ref={tooltip}
          className={"set-trend-card__tooltip" + (hover ? "" : " hidden")}
          style={position}
        >
          {hover && (
            <>
              <strong>{hover.label}</strong>
              <div>Delta {hover.delta}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export function SetTrendGrid() {
  const view = useView();
  return (
    <div
      id="set-trend-grid"
      className="set-trend-grid"
      data-react-managed="true"
    >
      {view.cards.length ? (
        view.cards.map((card, index) => (
          <SetTrendCard key={index} card={card} selection={view.selection} />
        ))
      ) : (
        <div className="players-empty">
          Registra alcuni eventi per vedere l’andamento del set.
        </div>
      )}
    </div>
  );
}
export function SetTrendDetail() {
  const { detail } = useView();
  return (
    <div
      id="set-trend-detail"
      className="set-trend-detail"
      data-react-managed="true"
    >
      {detail ? (
        <>
          <div className="set-trend-detail__head">
            <div className="set-trend-detail__title">{detail.title}</div>
            <div className="set-trend-detail__score">{detail.score}</div>
          </div>
          <div className="set-trend-detail__summary">
            {detail.cards.map((card) => (
              <div key={card.label} className="set-trend-detail__card">
                <span className="set-trend-detail__card-label">
                  {card.label}
                </span>
                <div className="set-trend-detail__card-value">{card.value}</div>
              </div>
            ))}
          </div>
          <div className="set-trend-detail__events-wrap">
            <div className="set-trend-detail__events-title">
              Ultimi punti che hanno mosso il set
            </div>
            <ul className="set-trend-detail__events">
              {detail.events.length ? (
                detail.events.map((item, index) => (
                  <li
                    key={index}
                    className={
                      "set-trend-detail__event " +
                      item.tone +
                      (item.isScoringEvent ? " is-scoring" : "")
                    }
                  >
                    <div className="set-trend-detail__event-main">
                      <span className="set-trend-detail__event-actor">
                        {item.actor}
                      </span>
                      <span className="set-trend-detail__event-skill">
                        {item.skill}
                      </span>
                      {item.scoreLabel && (
                        <span className="set-trend-detail__event-score">
                          {item.scoreLabel}
                        </span>
                      )}
                    </div>
                    <div className="set-trend-detail__event-reason">
                      {item.reason}
                    </div>
                    {item.pointLabel && (
                      <div
                        className={"set-trend-detail__event-point " + item.tone}
                      >
                        {item.pointLabel}
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="set-trend-detail__event empty">
                  Nessuna azione utile trovata per questo rally.
                </li>
              )}
            </ul>
          </div>
        </>
      ) : (
        <div className="players-empty">
          Seleziona un punto del grafico per vedere il dettaglio.
        </div>
      )}
    </div>
  );
}
