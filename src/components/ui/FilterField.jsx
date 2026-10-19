
// Filter labels and layout are shared by summary, trajectories, player and video views.
export function FilterField({
  label,
  className = "analysis-filter",
  children,
  row = false,
  ...props
}) {
  return (
    <div {...props} className={className}>
      <div className="analysis-filter__label">{label}</div>
      {row ? <div className="analysis-filter__row">{children}</div> : children}
    </div>
  );
}
