import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

const bundle = buildSync({ stdin: { contents: "export { VideoEditModal } from './src/components/VideoEditModal.jsx'; export { videoEditStore } from './src/state/video-edit-store.mjs';", resolveDir: new URL('../', import.meta.url).pathname }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic' });
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { VideoEditModal, videoEditStore } = module.exports;

test('popup presents each setter with a labelled dropdown and filtered attack count', () => {
  const previous = videoEditStore.getSnapshot();
  try {
    videoEditStore.publish('setterSetType', { open: true, unknownCount: 1,
      options: [{ value: 'quick', label: 'Quick' }, { value: 'alta', label: 'Alta' }],
      rows: [{ id: 'our:0', label: 'Anna', count: 2, value: '' }, { id: 'our:1', label: 'Bea', count: 0, value: '' }],
    });
    const dom = new JSDOM(renderToStaticMarkup(createElement(VideoEditModal, { kind: 'setterSetType' })));
    const doc = dom.window.document;
    const selects = [...doc.querySelectorAll('select')];
    assert.equal(selects.length, 2);
    assert.equal(selects[0].options[0].textContent, 'Lascia invariato');
    assert.deepEqual([...selects[0].options].map(option => option.value), ['', 'quick', 'alta']);
    assert.match(doc.querySelector('label').textContent, /Anna · 2 attacchi/);
    assert.equal(selects[1].disabled, true);
    assert.match(doc.body.textContent, /1 attacco filtrato senza alzatrice associata/);
    dom.window.close();
  } finally { videoEditStore.replace(previous); }
});

test('role popup shows the eligible attack count and explains undetermined roles', () => {
  const previous = videoEditStore.getSnapshot();
  try {
    videoEditStore.publish('roleSetType', { open: true, unknownCount: 2,
      options: [{ value: 'quick', label: 'Quick' }],
      rows: [{ id: 'C', label: 'Centrale', count: 3, value: '' }],
    });
    const dom = new JSDOM(renderToStaticMarkup(createElement(VideoEditModal, { kind: 'roleSetType' })));
    assert.match(dom.window.document.body.textContent, /Centrale · 3 attacchi/);
    assert.match(dom.window.document.body.textContent, /2 attacchi filtrati esclusi/);
    assert.equal(dom.window.document.querySelector('select').value, '');
    dom.window.close();
  } finally { videoEditStore.replace(previous); }
});
