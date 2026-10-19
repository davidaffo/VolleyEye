const listeners = new Set();

// Domain services report completed changes; application composition owns reactions.
export function subscribeDomainEvents(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDomainEvent(type) {
  for (const listener of listeners) listener(type);
}
