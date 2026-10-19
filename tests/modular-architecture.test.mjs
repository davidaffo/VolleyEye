import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { parsers } from 'prettier/plugins/babel';
import { resolve, dirname } from 'node:path';
const root = new URL('../',import.meta.url).pathname;
const files = dir => readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const read = path => readFileSync(resolve(root,path),'utf8');

test('React importa un solo grafo di moduli ES senza runtime classico', () => {
  assert.doesNotMatch(read('vite.config.mjs'), /runtimePlugin|virtual:/);
  for (const path of ['src/compat','build/runtime-plugin.mjs','build/compatibility-source.mjs','config/runtime-files.mjs']) assert.equal(existsSync(resolve(root,path)),false,path);
  for (const path of files('src').filter(p=>/\.(js|jsx|mjs)$/.test(p)&&!p.startsWith('src/pwa/'))) {
    const source = read(path);
    assert.doesNotMatch(source,/virtual:volleyeye|innerHTML\s*=|insertAdjacentHTML|invokeRuntime|data-react-managed/ ,path);
    for (const node of parsers.babel.parse(source).program.body.filter(n=>n.type==='ImportDeclaration')) {
      if (!node.source.value.startsWith('.')) continue;
      assert.equal(existsSync(resolve(dirname(resolve(root,path)),node.source.value)),true,`${path}: ${node.source.value}`);
    }
  }
});

test('le librerie di dominio esportano API native senza namespace del browser', () => {
  for (const path of files('src/domain')) {
    const source = read(path);
    assert.match(source,/export /,path);
    assert.doesNotMatch(source,/\b(?:window|document)\b|VolleyEye\s*\.|reactManaged/,path);
  }
});

test('la build Pages include app ed export React e genera il precache dagli asset emessi', () => {
  assert.match(read('vite.config.mjs'),/\/VolleyEye\//);
  assert.match(read('build/analysis-export.mjs'),/src\/main\.jsx/);
  assert.match(read('build/static-assets-plugin.mjs'),/Object\.keys\(bundle\)/);
  assert.match(read('.github/workflows/pages.yml'),/path: dist/);
  assert.match(read('src/main.jsx'),/useEffect\(/);
  assert.match(read('src/components/ui/TabPanel.jsx'),/useViewStore/);
});
