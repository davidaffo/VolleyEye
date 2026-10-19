import { readFileSync } from "node:fs";
const values = JSON.parse(
  readFileSync(
    new URL("../fixtures/react-ui-reference.json", import.meta.url),
    "utf8",
  ),
);
const indexes = new Map();
export function reference(key) {
  const index = indexes.get(key) || 0;
  indexes.set(key, index + 1);
  if (!values[key] || index >= values[key].length)
    throw new Error("Missing UI reference: " + key + " #" + index);
  return values[key][index];
}
