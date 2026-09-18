import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const versionScript = readFileSync(new URL("../scripts/sync-version.mjs", import.meta.url), "utf8");

test("avviare l'app non riscrive i file di versione tracciati", () => {
  assert.doesNotMatch(pkg.scripts.serve, /version:sync/);
  assert.doesNotMatch(pkg.scripts.tunnel, /version:sync/);
});

test("la sincronizzazione manuale conserva la build date sullo stesso commit", () => {
  assert.match(versionScript, /previousMeta\.version === version/);
  assert.match(versionScript, /\? previousMeta\.buildDate/);
});
