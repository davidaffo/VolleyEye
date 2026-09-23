import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "volleyeye-release-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "scripts"));
  for (const name of ["release.mjs", "sync-version.mjs"]) {
    copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(root, "scripts", name));
  }
  writeFileSync(join(root, "package.json"), JSON.stringify({ version: "0.1.0" }));
  writeFileSync(join(root, "version.config.json"), JSON.stringify({ appName: "VolleyEye", baseVersion: "0.18.5" }));
  writeFileSync(join(root, "index.html"), 'window.__APP_CACHE_VERSION__ = "old"; <script src="app.js?v=old"></script>');
  writeFileSync(join(root, "service-worker.js"), 'const APP_CACHE_VERSION = "old";');
  return {
    read: (name) => readFileSync(join(root, name), "utf8"),
    run: (...args) => spawnSync(process.execPath, [join(root, "scripts/release.mjs"), ...args], { cwd: tmpdir(), encoding: "utf8" })
  };
}

test("release increments and synchronizes all version consumers from any cwd", (t) => {
  const f = fixture(t);
  for (const [args, expected] of [[[], "0.18.6"], [["minor"], "0.19.0"], [["major"], "1.0.0"], [["2.3.4"], "2.3.4"]]) {
    const result = f.run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(f.read("version.config.json")).baseVersion, expected);
    const meta = JSON.parse(f.read("version.json"));
    assert.equal(meta.baseVersion, expected);
    assert.ok(f.read("js/app-version.js").includes(meta.version));
    assert.ok(f.read("index.html").includes(`?v=${meta.cacheVersion}`));
    assert.ok(f.read("index.html").includes(`window.__APP_CACHE_VERSION__ = "${meta.cacheVersion}";`));
    assert.ok(f.read("service-worker.js").includes(`const APP_CACHE_VERSION = "${meta.cacheVersion}";`));
  }
});

test("release rejects invalid versions and downgrades without changing config", (t) => {
  const f = fixture(t);
  const original = f.read("version.config.json");
  for (const args of [["invalid"], ["01.2.3"], ["0.18.5"], ["0.17.9"], ["patch", "extra"]]) {
    assert.equal(f.run(...args).status, 1);
    assert.equal(f.read("version.config.json"), original);
  }
  assert.equal(f.run("--help").status, 0);
  assert.equal(f.read("version.config.json"), original);
});
