import { existsSync } from "node:fs";

export function dvwFixtureRoot(path) {
  return !process.env.VOLLEYEYE_DVW_FIXTURES && existsSync(path)
    ? path
    : path.replace(/^resources\//, "tests/fixtures/");
}
