import { useState } from 'react';

export function LineupSlot({ interactions, index, name, className = '', children, ...props }) {
  const [over, setOver] = useState(false);
  const { isDefault, context, scope } = interactions;
  const position = index + 1;
  const attributes = isDefault
    ? { 'data-slot-index': index, 'data-position': position }
    : { style: { gridArea: 'pos' + position }, 'data-pos': 'P' + position,
        'data-pos-index': index, 'data-lineup-context': context, 'data-team-scope': scope };
  return (
    <div
      {...attributes}
      {...props}
      className={(isDefault ? 'default-lineup-slot' : 'lineup-slot pos-' + position)
        + (!name ? ' empty' : '') + (over ? ' drop-over' : '') + className}
      data-player-name={name}
      {...interactions.dragProps(name, index)}
      onDragOver={event => { event.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={event => { setOver(false); interactions.drop(event, index); }}
    >
      {children}
    </div>
  );
}

export function LineupChip({ interactions, name, className = '', children, ...props }) {
  return (
    <div
      {...props}
      className={(interactions.isDefault ? 'default-lineup-chip' : 'lineup-chip') + className}
      data-player-name={name}
      data-lineup-context={interactions.isDefault ? undefined : interactions.context}
      {...interactions.dragProps(name)}
    >
      {children}
    </div>
  );
}
