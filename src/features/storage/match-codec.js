export function encodeMatchStoragePayload(data) {
  const events = data && data.state && data.state.events;
  if (!Array.isArray(events) || !events.length || events.some(event => !event || typeof event !== "object" || Array.isArray(event))) {
    return JSON.stringify(data);
  }
  const keys = new Set(events.flatMap(event => Object.keys(event)));
  if (!keys.size) return JSON.stringify(data);
  const columns = Array.from(keys, key => {
    const values = [];
    const lookup = new Map();
    const indices = events.map(event => {
      const value = Object.prototype.hasOwnProperty.call(event, key) ? JSON.stringify(event[key]) : undefined;
      if (value === undefined) return -1;
      if (!lookup.has(value)) {
        lookup.set(value, values.length);
        values.push(JSON.parse(value));
      }
      return lookup.get(value);
    });
    return [key, values, indices];
  });
  const payload = { ...data, state: { ...data.state } };
  delete payload.state.events;
  return JSON.stringify({ storageFormat: "volleyeye-match-columns-v1", payload, eventCount: events.length, columns });
}

export function decodeMatchStoragePayload(raw) {
  const stored = JSON.parse(raw);
  if (!stored || stored.storageFormat !== "volleyeye-match-columns-v1") return stored;
  if (!Number.isInteger(stored.eventCount) || stored.eventCount < 1 ||
      !stored.payload?.state || typeof stored.payload.state !== "object" ||
      !Array.isArray(stored.columns) || !stored.columns.length) {
    throw new Error("Archivio eventi compatto non valido.");
  }
  const keys = new Set();
  for (const column of stored.columns) {
    if (!Array.isArray(column) || column.length !== 3) throw new Error("Colonna eventi non valida.");
    const [key, values, indices] = column;
    if (typeof key !== "string" || keys.has(key) || !Array.isArray(values) || !Array.isArray(indices) ||
        indices.length !== stored.eventCount || indices.some(index => !Number.isInteger(index) || index < -1 || index >= values.length)) {
      throw new Error("Colonna eventi non valida.");
    }
    keys.add(key);
  }
  const events = Array.from({ length: stored.eventCount }, () => ({}));
  stored.columns.forEach(([key, values, indices]) => {
    indices.forEach((index, row) => {
      if (index < 0) return;
      // Each event owns its nested values, just as with regular JSON.parse.
      Object.defineProperty(events[row], key, {
        value: JSON.parse(JSON.stringify(values[index])), enumerable: true, writable: true, configurable: true
      });
    });
  });
  stored.payload.state.events = events;
  return stored.payload;
}

