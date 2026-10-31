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

// These entry points may share low-level models and stores, but must never
// reach application controllers, including through re-exports or lazy imports.
for (const entry of [
  'src/features/events/table-view.js',
  'src/features/events/log-view.js',
  'src/features/events/selection-commands.js',
  'src/features/scout/skill-modal-state.js',
  'src/features/scout/selection-flow.js',
  'src/features/layout/animation.js',
  'src/features/scout/court-commands.js',
  'src/features/scout/skill-preparation.js',
  'src/features/scout/skill-control-model.js',
  'src/features/events/history-model.js',
  'src/domain/roster-text.js',
  'src/features/io/file-readers.js',
  'src/features/teams/team-reference-model.js',
  'src/features/teams/court-view.js',
  'src/features/teams/lineup-commands.js',
  'src/features/core/runtime-view.js',
  'src/features/analysis/aggregated-table.js',
  'src/features/teams/manager-view.js',
  'src/features/storage/match-repository.js',
  'src/features/settings/metrics-view.js',
  'src/features/scout-ui.js',
  'src/features/layout/modals.js',
  'src/features/scout/flow-view.js',
  'src/features/events/block-inference-model.js',
  'src/features/scout/trajectory-canvas.js',
  'src/features/scout/trajectory-dialog.js',
  'src/features/live/clocks.js',
  'src/features/video/media-state.js',
  'src/features/events/recording-model.js',
  'src/features/video/youtube-player.js',
  'src/features/live/workspace-layout.js',
  'src/features/io/datavolley-format.js',
  'src/features/io/datavolley-codec.js',
  'src/features/io/datavolley-export.js',
  'src/features/io/datavolley-match-import.js',
  'src/features/io/datavolley-entry-view.js',
  'src/features/scout/code-entry.js',
  'src/features/scout/shortcut-view.js',
  'src/features/live/next-set-model.js',
  'src/features/live/next-set-view.js',
  'src/features/live/set-start-draft.js',
  'src/features/live/set-start-view.js',
  'src/features/teams/imports/camp3-model.js',
  'src/features/teams/camp3-view.js',
  'src/features/teams/editor-view.js',
  'src/features/analysis/score-view.js',
  'src/features/events/selection-view.js',
  'src/features/video/local-file-storage.js',
  'src/features/video/undo-model.js',
  'src/features/video/reset-commands.js',
]) {
  test(`${entry} has an acyclic dependency tree without application controllers`, () => {
    const visited = new Set(), stack = [];
    function visit(file) {
      assert.equal(stack.includes(file), false, `Cycle: ${[...stack, file].join(' -> ')}`);
      if (visited.has(file)) return;
      assert.doesNotMatch(file, /\/(?:app-lifecycle|table-commands|datavolley-live-entry|lineup-editor|next-set-lineups|team-editor|camp3-import|video-events|video-sources|playback|event-recording|live-entry|live-score-and-set|scout-shortcuts|team-rendering|skill-actions|history-commands)\.js$/, `${entry} imports controller ${file}`);
      stack.push(file);
      function dependencies(node) {
        if (!node || typeof node !== 'object') return;
        const target = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)
          ? node.source?.value : node.type === 'ImportExpression' ? node.source?.value : null;
        if (typeof target === 'string' && target.startsWith('.')) {
          const dependency = resolve(dirname(resolve(root, file)), target).slice(resolve(root).length + 1);
          if (/\.(?:js|jsx|mjs)$/.test(dependency)) visit(dependency);
        }
        for (const [key, value] of Object.entries(node)) {
          if (['loc', 'tokens', 'comments', 'extra'].includes(key)) continue;
          if (Array.isArray(value)) value.forEach(dependencies);
          else if (value && typeof value === 'object') dependencies(value);
        }
      }
      dependencies(parsers.babel.parse(read(file)).program);
      stack.pop();
      visited.add(file);
    }
    visit(entry);
  });
}


test('the complete application module graph has no dependency cycles', () => {
  const graph = new Map();
  for (const file of [...files('src'), ...files('js')].filter(file => /\.(?:js|jsx|mjs)$/.test(file) && !file.startsWith('js/vendor/'))) {
    const dependencies = new Set();
    function collect(node) {
      if (!node || typeof node !== 'object') return;
      const target = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type)
        ? node.source?.value : node.type === 'CallExpression' && node.callee?.type === 'Import' ? node.arguments[0]?.value : null;
      if (typeof target === 'string' && target.startsWith('.'))
        dependencies.add(resolve(dirname(resolve(root, file)), target).slice(resolve(root).length + 1));
      for (const [key, value] of Object.entries(node)) {
        if (['loc', 'tokens', 'comments', 'extra'].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(collect);
        else if (value && typeof value === 'object') collect(value);
      }
    }
    collect(parsers.babel.parse(read(file)).program);
    graph.set(file, dependencies);
  }
  const visited = new Set(), stack = [];
  function visit(file) {
    if (!graph.has(file)) return;
    assert.equal(stack.includes(file), false, `Dependency cycle: ${[...stack, file].join(' -> ')}`);
    if (visited.has(file)) return;
    stack.push(file);
    for (const dependency of graph.get(file)) visit(dependency);
    stack.pop();
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file);
});
