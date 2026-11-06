import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("changelog preserves unique versions in descending order and matches the app release", () => {
  const markdown = readFileSync(new URL("../docs/changelog.md", import.meta.url), "utf8");
  const { baseVersion } = JSON.parse(readFileSync(new URL("../version.config.json", import.meta.url), "utf8"));
  const entries = [...markdown.matchAll(/^## (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})\n\n([^]*?)(?=^## |$(?![^]))/gm)];
  const versions = entries.map(entry => entry[1]);
  assert.equal(versions[0], baseVersion);
  assert.equal(versions.at(-1), "0.1.0");
  assert.equal(new Set(versions).size, versions.length);
  const sorted = [...versions].sort((a, b) => {
    const left = a.split(".").map(Number), right = b.split(".").map(Number);
    return right[0] - left[0] || right[1] - left[1] || right[2] - left[2];
  });
  assert.deepEqual(versions, sorted);
  for (const entry of entries) assert.match(entry[3], /^- \S/m, `Note mancanti per ${entry[1]}`);
});
