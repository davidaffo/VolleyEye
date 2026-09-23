import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const usage = "Uso: npm run release -- [patch|minor|major|X.Y.Z] (default: patch)";
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
    config.baseVersion = next;
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    process.chdir(fileURLToPath(new URL("..", import.meta.url)));
    await import("./sync-version.mjs");
    console.log(`[release] ${previous} → ${next}`);
  } catch (error) {
    console.error(`[release] ${error.message}`);
    process.exitCode = 1;
  }
}
