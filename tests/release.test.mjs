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
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "docs/changelog.md"), "# Changelog\n\n## 0.18.5 — 2026-09-23\n\n- Versione precedente.\n");
  writeFileSync(join(root, "CHANGELOG.pending.md"), "# Modifiche in attesa\n\n- Nuova funzionalità\n- Correzione di un errore\n");
  for (const name of ["release.mjs", "sync-version.mjs"]) {
    copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(root, "scripts", name));
  }
  writeFileSync(join(root, "package.json"), JSON.stringify({ version: "0.1.0" }));
  writeFileSync(join(root, "version.config.json"), JSON.stringify({ appName: "VolleyEye", baseVersion: "0.18.5" }));
  writeFileSync(join(root, "index.html"), 'window.__APP_CACHE_VERSION__ = "old"; <script src="app.js?v=old"></script>');
  return {
    write: (name, content) => writeFileSync(join(root, name), content),
    read: (name) => readFileSync(join(root, name), "utf8"),
    run: (...args) => spawnSync(process.execPath, [join(root, "scripts/release.mjs"), ...args], { cwd: tmpdir(), encoding: "utf8" })
  };
}

test("release increments and synchronizes all version consumers from any cwd", (t) => {
  const f = fixture(t);
  for (const [args, expected] of [[[], "0.18.6"], [["minor"], "0.19.0"], [["major"], "1.0.0"], [["2.3.4"], "2.3.4"]]) {
    f.write("CHANGELOG.pending.md", "# Modifiche in attesa\n\n- Nuova funzionalità\n- Correzione di un errore\n");
    const result = f.run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(f.read("version.config.json")).baseVersion, expected);
    const meta = JSON.parse(f.read("version.json"));
    assert.equal(meta.baseVersion, expected);
    assert.ok(f.read("js/app-version.js").includes(meta.version));
    assert.ok(f.read("index.html").includes(`?v=${meta.cacheVersion}`));
    assert.ok(f.read("index.html").includes(`window.__APP_CACHE_VERSION__ = "${meta.cacheVersion}";`));
    const changelog = f.read("docs/changelog.md");
    assert.equal(changelog.match(/^## (\S+)/m)[1], expected);
    assert.ok(changelog.includes("- Nuova funzionalità\n- Correzione di un errore"));
    assert.ok(changelog.includes("## 0.18.5 — 2026-09-23"));
    assert.equal(f.read("CHANGELOG.pending.md"), "# Modifiche in attesa\n\n");
  }
});

test("release rejects invalid versions and downgrades without changing config", (t) => {
  const f = fixture(t);
  const original = f.read("version.config.json");
  const originalChangelog = f.read("docs/changelog.md");
  const originalPending = f.read("CHANGELOG.pending.md");
  for (const args of [["invalid"], ["01.2.3"], ["0.18.5"], ["0.17.9"], ["patch", "extra"]]) {
    assert.equal(f.run(...args).status, 1);
    assert.equal(f.read("version.config.json"), original);
    assert.equal(f.read("docs/changelog.md"), originalChangelog);
    assert.equal(f.read("CHANGELOG.pending.md"), originalPending);
  }
  assert.equal(f.run("--help").status, 0);
  assert.equal(f.read("version.config.json"), original);
});

test("release refuses empty or malformed pending notes without changing files", (t) => {
  const f = fixture(t);
  const config = f.read("version.config.json");
  const changelog = f.read("docs/changelog.md");
  for (const pending of ["", "# Modifiche in attesa\n\n", "-   ", "Nota senza elenco"]) {
    f.write("CHANGELOG.pending.md", pending);
    assert.equal(f.run().status, 1);
    assert.equal(f.read("version.config.json"), config);
    assert.equal(f.read("docs/changelog.md"), changelog);
    assert.equal(f.read("CHANGELOG.pending.md"), pending);
  }
});

test("release retains pending notes when the changelog is inconsistent", (t) => {
  const f = fixture(t);
  f.write("docs/changelog.md", "# Changelog\n\n## 0.18.4 — 2026-09-23\n\n- Vecchia versione.\n");
  const pending = f.read("CHANGELOG.pending.md");
  const config = f.read("version.config.json");
  assert.equal(f.run().status, 1);
  assert.equal(f.read("CHANGELOG.pending.md"), pending);
  assert.equal(f.read("version.config.json"), config);
});

test("release consumes accumulated notes once, removes duplicates and keeps later releases separate", (t) => {
  const f = fixture(t);
  f.write("CHANGELOG.pending.md", "# Modifiche in attesa\r\n\r\n- Prima modifica\r\n- Seconda modifica\r\n- Prima modifica\r\n");
  assert.equal(f.run().status, 0);
  assert.equal(f.read("docs/changelog.md").match(/- Prima modifica/g).length, 1);
  const firstRelease = f.read("docs/changelog.md");
  assert.equal(f.run().status, 1);
  assert.equal(f.read("docs/changelog.md"), firstRelease);
  f.write("CHANGELOG.pending.md", "# Modifiche in attesa\n\n- Terza modifica\n");
  assert.equal(f.run().status, 0);
  const latestNotes = f.read("docs/changelog.md").split("## 0.18.6")[0];
  assert.ok(latestNotes.includes("- Terza modifica"));
  assert.ok(!latestNotes.includes("- Prima modifica"));
});

test("release rolls back version and changelog and retains notes when synchronization fails", (t) => {
  const f = fixture(t);
  const names = ["version.config.json", "docs/changelog.md", "CHANGELOG.pending.md", "index.html"];
  const originals = names.map(name => [name, f.read(name)]);
  f.write("package.json", "invalid JSON");
  assert.equal(f.run().status, 1);
  for (const [name, content] of originals) assert.equal(f.read(name), content);
  f.write("package.json", JSON.stringify({ version: "0.1.0" }));
  assert.equal(f.run().status, 0);
  assert.equal(JSON.parse(f.read("version.config.json")).baseVersion, "0.18.6");
});
