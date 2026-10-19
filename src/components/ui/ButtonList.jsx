// Data supplies each action; the original button component keeps its behavior.
export function ButtonList({ as: Button, items, ...props }) {
  return items.map(([id, label, itemProps = {}], index) => (
    <Button key={id ?? itemProps["data-agg-tab-target"] ?? index} id={id ?? undefined} {...props} {...itemProps}>{label}</Button>
  ));
}
