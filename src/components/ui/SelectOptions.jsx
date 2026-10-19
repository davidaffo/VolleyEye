export function SelectOptions({ options }) {
  return options.map(([value, label, props = {}], index) => (
    <option key={index} value={value} {...props}>{label}</option>
  ));
}
