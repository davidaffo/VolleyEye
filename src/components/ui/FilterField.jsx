import { useViewStore } from '../../hooks/useViewStore.js';
import { filterStore } from '../../state/filter-store.mjs';

// Filter visibility belongs to the same React snapshot as its choices and selection.
export function FilterVisibility({ filterId, style, ...props }) {
  useViewStore(filterStore);
  const { visible } = filterStore.getView(filterId);
  return <div {...props} style={visible === undefined ? style : {
    ...style, display: visible ? '' : 'none',
  }} />;
}

export function FilterField({
  label,
  className = "analysis-filter",
  children,
  row = false,
  ...props
}) {
  return (
    <FilterVisibility {...props} className={className}>
      <div className="analysis-filter__label">{label}</div>
      {row ? <div className="analysis-filter__row">{children}</div> : children}
    </FilterVisibility>
  );
}
