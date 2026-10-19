export function ChartTicks({ ticks, model, className }) {
  return ticks.map((tick, index) => (
    <g key={index} className={className}>
      <line x1={model.pad.left} y1={tick.y} x2={model.width - model.pad.right} y2={tick.y} />
      <text x={model.pad.left - 8} y={tick.textY} textAnchor="end">{tick.label}</text>
    </g>
  ));
}
