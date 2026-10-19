import test from "node:test";
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import vm from "node:vm";

const source = readFileSync("src/features/io/exports.js", "utf8");
const start = source.indexOf("function getMatchSheetPrintScale(");
const end = source.indexOf("function prepareMatchSheetPrint(", start);
const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context);

test("il foglio rientra interamente in A4 su entrambi gli assi senza deformazioni", () => {
  for (const [width, height] of [[1100, 1500], [1800, 600], [1600, 1700], [500, 400]]) {
    const scale = context.getMatchSheetPrintScale(width, height, 1047, 714);
    assert.ok(width * scale <= 1045);
    assert.ok(height * scale <= 712);
    assert.ok(scale > 0 && scale <= 1);
    assert.ok(Math.abs((width * scale) / (height * scale) - width / height) < 1e-10);
  }
});
