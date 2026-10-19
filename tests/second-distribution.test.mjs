import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";

const source = readFileSync(new URL("../src/components/AnalysisTable.jsx", import.meta.url), "utf8");

test("ogni zona mostra numero e percentuale sulla stessa riga", () => {
  const renderer = source;
  assert.match(renderer, /cell.count.*cell.percent/s);
  assert.doesNotMatch(renderer, /pallon[ei]/);
});
