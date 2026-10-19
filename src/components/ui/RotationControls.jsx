const rotations = [1, 2, 3, 4, 5, 6];

export function RotationControls({ ids, value, onChange, onRotate,
  className = 'rotation-controls', buttonAs: Button = 'button', selectAs: Select = 'select' }) {
  const buttonProps = Button === 'button' ? { type: 'button' } : {};
  return (
    <div className={className}>
      <Button {...buttonProps} id={ids[0]} className="small rotate-cw"
        onClick={onRotate ? () => onRotate('cw') : undefined}>↺</Button>
      <div className="rotation-display">
        <Select id={ids[1]} className="rotation-select" value={value}
          onChange={onChange ? event => onChange(event.target.value) : undefined}>
          {rotations.map(rotation => <option key={rotation} value={String(rotation)}>P{rotation}</option>)}
        </Select>
      </div>
      <Button {...buttonProps} id={ids[2]} className="small rotate-ccw"
        onClick={onRotate ? () => onRotate('ccw') : undefined}>↻</Button>
    </div>
  );
}
