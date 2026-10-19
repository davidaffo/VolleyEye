export function HeaderCells({ labels, ...props }) {
  return labels.map((label, index) => <th key={index} {...props}>{label}</th>);
}
