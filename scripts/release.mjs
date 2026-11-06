import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const usage = "Uso: npm run release -- [patch|minor|major|X.Y.Z] (default: patch). Le note vengono lette da CHANGELOG.pending.md.";
const args = process.argv.slice(2);
if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
  console.log(usage);
} else {
  try {
    const target = args[0] ?? "patch";
    const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
    if (args.length > 1 || !["patch", "minor", "major"].includes(target) && !versionPattern.test(target)) {
      throw new Error(usage);
    }
    const configPath = new URL("../version.config.json", import.meta.url);
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const previous = config.baseVersion;
    if (typeof previous !== "string" || !versionPattern.test(previous)) {
      throw new Error("baseVersion non valida in version.config.json: atteso X.Y.Z.");
    }
    const parts = previous.split(".").map(BigInt);
    let next;
    if (versionPattern.test(target)) {
      const requested = target.split(".").map(BigInt);
      const firstDifference = requested.findIndex((part, index) => part !== parts[index]);
      if (firstDifference < 0 || requested[firstDifference] < parts[firstDifference]) {
        throw new Error(`La nuova versione deve essere maggiore di ${previous}.`);
      }
      next = target;
    } else {
      const index = { major: 0, minor: 1, patch: 2 }[target];
      parts[index] += 1n;
      for (let i = index + 1; i < parts.length; i++) parts[i] = 0n;
      next = parts.join(".");
    }
    const pendingPath = new URL("../CHANGELOG.pending.md", import.meta.url);
    const pending = readFileSync(pendingPath, "utf8");
    const lines = pending.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("# "));
    if (lines.some(line => !/^- \S/.test(line))) {
      throw new Error("Formato non valido in CHANGELOG.pending.md: usare una modifica per riga, preceduta da '- '.");
    }
    const notes = [...new Set(lines.map(line => line.slice(2).trim()))];
    if (!notes.length) throw new Error("Nessuna modifica in attesa in CHANGELOG.pending.md: release non eseguita.");
    const changelogPath = new URL("../docs/changelog.md", import.meta.url);
    const changelog = readFileSync(changelogPath, "utf8");
    const firstEntry = /^## (\d+\.\d+\.\d+) — /m.exec(changelog);
    if (!firstEntry || firstEntry[1] !== previous) {
      throw new Error(`Il changelog deve iniziare con la versione corrente ${previous}.`);
    }
    const date = new Date().toISOString().slice(0, 10);
    const entry = `## ${next} — ${date}\n\n${notes.map(note => `- ${note}`).join("\n")}\n\n`;
    const paths = [configPath, changelogPath, pendingPath, ...["version.json", "js/app-version.js", "index.html"].map(path => new URL(`../${path}`, import.meta.url))];
    const originals = paths.map(path => [path, existsSync(path) ? readFileSync(path) : null]);
    try {
      writeFileSync(changelogPath, changelog.slice(0, firstEntry.index) + entry + changelog.slice(firstEntry.index));
      config.baseVersion = next;
      writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
      process.chdir(fileURLToPath(new URL("..", import.meta.url)));
      await import("./sync-version.mjs");
      writeFileSync(pendingPath, "# Modifiche in attesa\n\n");
    } catch (error) {
      for (const [path, content] of originals) {
        if (content !== null) writeFileSync(path, content);
        else if (existsSync(path)) unlinkSync(path);
      }
      throw error;
    }
    console.log(`[release] ${previous} → ${next}`);
  } catch (error) {
    console.error(`[release] ${error.message}`);
    process.exitCode = 1;
  }
}
