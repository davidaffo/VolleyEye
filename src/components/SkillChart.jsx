import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { analysisChartStore } from "../state/analysis-chart-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../compat/runtime.js";
function useChartView(kind) {
  return useSyncExternalStore(
    analysisChartStore.subscribe,
    analysisChartStore.getSnapshot,
    analysisChartStore.getSnapshot,
  )[kind];
}
const metrics = [
  { id: "eff", label: "Eff % cumulativa" },
  { id: "pos", label: "Pos % cumulativa" },
  { id: "prf", label: "Prf % cumulativa" },
  { id: "code", label: "Esito singolo (codice)" },
];
export function ChartMetricSelect({ kind, id }) {
  const view = useChartView(kind);
  return (
    <select
      id={id}
      data-react-managed="true"
      value={view.metric}
      onChange={(event) =>
        invokeRuntime("changeReactChartMetric", kind, event.target.value).catch(
          console.error,
        )
      }
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {metrics.map((metric) => (
        <option key={metric.id} value={metric.id}>
          {metric.label}
        </option>
      ))}
    </select>
  );
}
export function SkillChart({ model }) {
  const card = useRef(null),
    plot = useRef(null),
    tip = useRef(null),
    [hover, setHover] = useState(null),
    [position, setPosition] = useState({ left: 4, top: 4 });
  useLayoutEffect(() => {
    if (!hover || !tip.current || !plot.current) return;
    const rect = tip.current.getBoundingClientRect(),
      wrap = plot.current.getBoundingClientRect();
    let left = hover.lineLeft + 10;
    if (left + rect.width > wrap.width - 4)
      left = hover.lineLeft - rect.width - 10;
    let top = hover.y - rect.height - 8;
    if (top < 4) top = hover.y + 10;
    setPosition({
      left: Math.max(4, left),
      top: Math.min(
        Math.max(4, top),
        Math.max(4, wrap.height - rect.height - 4),
      ),
    });
  }, [hover]);
  const move = (event) => {
    if (!model.points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x =
      Math.max(0, Math.min(rect.width, event.clientX - rect.left)) /
      (rect.width / model.width);
    let best = 0;
    model.points.forEach((point, index) => {
      if (Math.abs(point.cx - x) < Math.abs(model.points[best].cx - x))
        best = index;
    });
    const point = model.points[best];
    setHover({
      point,
      index: best,
      lineLeft: (point.cx * rect.width) / model.width,
      y: (point.cy * rect.height) / model.height,
      lineTop: (model.pad.top * rect.height) / model.height,
      lineHeight: (model.plotH * rect.height) / model.height,
    });
  };
  const last = model.points.at(-1),
    p = hover?.point;
  return (
    <div ref={card} className="skill-chart-card" style={model.colors}>
      <div className="skill-chart-card__head">
        <div className="skill-chart-card__title-row">
          <div className="skill-chart-card__title">{model.title}</div>
          <button
            type="button"
            className="skill-chart-copy-btn"
            aria-label={"Copia immagine grafico " + model.title}
            title="Copia immagine grafico"
            disabled={!model.points.length}
            onClick={() =>
              invokeRuntimeEvent(
                "copySkillChartImageToClipboard",
                card.current,
                "Grafico " + model.title,
              )
            }
          >
            ⧉
          </button>
        </div>
        {model.subtitle && (
          <div className="skill-chart-card__subtitle">{model.subtitle}</div>
        )}
      </div>
      <div className="skill-chart-card__body">
        {!model.points.length ? (
          <div className="players-empty skill-chart-empty">
            Nessun evento per i filtri selezionati.
          </div>
        ) : (
          <>
            <div
              ref={plot}
              className="skill-chart-card__plot skill-chart-card__plot--interactive"
              onPointerMove={move}
              onPointerLeave={() => setHover(null)}
            >
              <svg
                viewBox={"0 0 " + model.width + " " + model.height}
                className="skill-chart-svg"
                preserveAspectRatio="xMidYMid meet"
                aria-label="Grafico metrica skill"
              >
                <rect
                  x="0"
                  y="0"
                  width={model.width}
                  height={model.height}
                  rx="10"
                  ry="10"
                  className="skill-chart__bg"
                />
                {model.bands.map((band, index) => (
                  <g key={index} className="skill-chart__set-band-group">
                    <rect
                      className={
                        "skill-chart__set-band " +
                        (index % 2 ? "is-odd" : "is-even")
                      }
                      x={band.left}
                      y={model.pad.top}
                      width={band.width}
                      height={model.plotH}
                    />
                    {index > 0 && (
                      <line
                        className="skill-chart__set-sep"
                        x1={band.left}
                        y1={model.pad.top}
                        x2={band.left}
                        y2={model.height - model.pad.bottom}
                      />
                    )}
                    <text
                      className="skill-chart__set-label"
                      x={band.labelX}
                      y={model.pad.top + 12}
                      textAnchor="middle"
                    >
                      Set {band.set}
                    </text>
                  </g>
                ))}
                {model.ticks.map((tick, index) => (
                  <g key={index} className="skill-chart__tick">
                    <line
                      x1={model.pad.left}
                      y1={tick.y}
                      x2={model.width - model.pad.right}
                      y2={tick.y}
                    />
                    <text
                      x={model.pad.left - 8}
                      y={tick.textY}
                      textAnchor="end"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}
                {model.zeroY !== null && (
                  <line
                    className="skill-chart__zero"
                    x1={model.pad.left}
                    y1={model.zeroY}
                    x2={model.width - model.pad.right}
                    y2={model.zeroY}
                  />
                )}
                <line
                  className="skill-chart__axis"
                  x1={model.pad.left}
                  y1={model.height - model.pad.bottom}
                  x2={model.width - model.pad.right}
                  y2={model.height - model.pad.bottom}
                />
                <polyline
                  className="skill-chart__line skill-chart__line--base"
                  points={model.linePoints}
                />
                <g className="skill-chart__segments">
                  {model.points.slice(1).map((point, index) => (
                    <line
                      key={index}
                      className={"skill-chart__segment is-" + point.tone}
                      x1={model.points[index].cx}
                      y1={model.points[index].cy}
                      x2={point.cx}
                      y2={point.cy}
                    />
                  ))}
                </g>
                <g className="skill-chart__dots">
                  {model.points.map((point, index) => (
                    <circle
                      key={index}
                      data-point-index={point.x - 1}
                      className={
                        "is-" +
                        point.tone +
                        (hover?.index === index ? " is-hover" : "")
                      }
                      cx={point.cx}
                      cy={point.cy}
                      r="3"
                    >
                      <title>{point.tip}</title>
                    </circle>
                  ))}
                </g>
                <text
                  className="skill-chart__xlabel"
                  x={model.pad.left}
                  y={model.height - 6}
                  textAnchor="start"
                >
                  {model.matchGroups ? "Partita 1" : 1}
                </text>
                <text
                  className="skill-chart__xlabel"
                  x={model.width - model.pad.right}
                  y={model.height - 6}
                  textAnchor="end"
                >
                  {model.matchGroups
                    ? "Partita " + model.points.length
                    : model.points.length}
                </text>
              </svg>
              <div
                className={"skill-chart-hover-line" + (hover ? "" : " hidden")}
                style={
                  hover
                    ? {
                        left: hover.lineLeft,
                        top: hover.lineTop,
                        height: hover.lineHeight,
                      }
                    : undefined
                }
              />
              <div
                ref={tip}
                className={
                  "skill-chart-tooltip" + (p ? " is-" + p.tone : " hidden")
                }
                style={position}
              >
                {p && (
                  <>
                    <div className="skill-chart-tooltip__row">
                      <strong>{p.labelValue}</strong>{" "}
                      <span className="skill-chart-tooltip__code">
                        {p.code}
                      </span>
                    </div>
                    {p.groupType === "match" ? (
                      <div className="skill-chart-tooltip__row small">
                        Partita {p.x} · {p.matchLabel || "-"}
                        {p.matchEventsCount
                          ? " · " + p.matchEventsCount + " eventi"
                          : ""}
                      </div>
                    ) : (
                      <>
                        {p.playerLabel && (
                          <div className="skill-chart-tooltip__row small">
                            {p.playerLabel}
                          </div>
                        )}
                        <div className="skill-chart-tooltip__row small">
                          Set {p.set || "-"} · Evento {p.x}
                          {p.rotation ? " · P" + p.rotation : ""}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="skill-chart-card__meta">
              {last?.groupType === "match" ? "Partite" : "Eventi"}:{" "}
              <strong>{model.points.length}</strong> · Ultimo valore:{" "}
              <strong>{last?.labelValue || "-"}</strong> ·{" "}
              <span className="skill-chart-legend">
                <span className="pos">●</span> positivo{" "}
                <span className="neu">●</span> neutro{" "}
                <span className="neg">●</span> negativo
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
export function SkillChartGrid({ kind, id }) {
  const view = useChartView(kind);
  return (
    <div
      id={id}
      className="analysis-skill-chart-grid"
      data-react-managed="true"
    >
      {view.empty ? (
        <div className="players-empty">{view.empty}</div>
      ) : (
        view.charts.map((chart, index) => (
          <SkillChart key={index} model={chart} />
        ))
      )}
    </div>
  );
}
