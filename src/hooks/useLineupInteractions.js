import { useEffect, useRef } from 'react';
import { events } from '../app/actions.mjs';

export function useLineupInteractions({ context, scope, drag: sharedDrag, place, move }) {
  const root = useRef(null);
  const localDrag = useRef(null);
  const drag = sharedDrag || localDrag;
  const isDefault = context === 'default';
  useEffect(() => {
    const element = root.current;
    const slotClass = isDefault ? 'default-lineup-slot' : 'lineup-slot';
    const chipClass = isDefault ? 'default-lineup-chip' : 'lineup-chip';
    const indexOf = target => Number(target.dataset[isDefault ? 'slotIndex' : 'posIndex']);
    const start = event => {
      const target = event.target.closest(`.${slotClass}, .${chipClass}`);
      if (!target || !element.contains(target) || !target.dataset.playerName) return;
      const index = target.classList.contains(slotClass) ? indexOf(target) : null;
      if (isDefault) {
        events.handleDefaultLineupTouchStart(event, target.dataset.playerName, index);
      } else if (index !== null || window.matchMedia('(pointer: coarse)').matches) {
        events.handleLineupTouchStart(event, target.dataset.playerName, index, context, scope);
      }
    };
    const end = event => {
      const target = event.target.closest(`.${slotClass}`);
      if (target && element.contains(target)) events.finalizeDefaultLineupTouch(event, indexOf(target));
    };
    element.addEventListener('touchstart', start, { passive: false });
    if (isDefault) element.addEventListener('touchend', end, { passive: false });
    return () => {
      element.removeEventListener('touchstart', start);
      if (isDefault) element.removeEventListener('touchend', end);
    };
  }, [context, scope, isDefault]);

  return {
    root, context, scope, isDefault,
    dragProps(name, index = null) {
      return {
        draggable: !!name,
        onDragStart(event) {
          if (!name) return;
          drag.current = { name, index, scope };
          event.dataTransfer.setData('text/plain', name);
          event.dataTransfer.effectAllowed = 'move';
        },
        onDragEnd() { drag.current = null; },
      };
    },
    drop(event, index) {
      event.preventDefault();
      const transfer = drag.current;
      const name = event.dataTransfer.getData('text/plain') || transfer?.name;
      if (!name || (context === 'next-set' && transfer?.scope && transfer.scope !== scope)) {
        if (isDefault) drag.current = null;
        return;
      }
      if (move && typeof transfer?.index === 'number' && transfer.index !== index) move(transfer.index, index);
      else place(name, index);
      drag.current = null;
    },
  };
}
