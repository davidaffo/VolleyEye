import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parsers } from 'prettier/plugins/babel';
import { parsers as cssParsers } from 'prettier/plugins/postcss';

// Structural candidates require review: equal syntax does not imply equal behavior.
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(`${directory}/${entry.name}`) : /\.(jsx?|mjs)$/.test(entry.name)
    ? [`${directory}/${entry.name}`] : []);
const groups = new Map();
function fingerprint(nodes, template = false) {
  const names = new Map();
  function normalize(node, parent, key) {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(child => normalize(child, parent, key));
    if (template && ['StringLiteral', 'JSXText'].includes(node.type)) return [node.type];
    if (node.type === 'Identifier') {
      const property = (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed) ||
        (['ObjectProperty', 'ObjectMethod'].includes(parent?.type) && key === 'key' && !parent.computed);
      if (property) return ['property', node.name];
      if (!names.has(node.name)) names.set(node.name, names.size);
      return ['identifier', names.get(node.name)];
    }
    return Object.fromEntries(Object.entries(node)
      .filter(([name]) => !['start', 'end', 'loc', 'extra', 'tokens', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(name))
      .map(([name, value]) => [name, normalize(value, node, name)]));
  }
  return createHash('sha256').update(JSON.stringify(normalize(nodes))).digest('hex');
}
for (const path of [...files('src'), ...files('js')].filter(path => !path.startsWith('js/vendor/'))) {
  const source = readFileSync(path, 'utf8');
  function record(nodes, kind) {
    const first = nodes[0], last = nodes.at(-1);
    if (last.loc.end.line - first.loc.start.line < 7 || last.end - first.start < 250) return;
    const key = fingerprint(nodes, kind.endsWith('-template')), entry = { path, kind, line: first.loc.start.line,
      endLine: last.loc.end.line, bytes: last.end - first.start };
    if (!groups.has(key)) groups.set(key, []);
    const group = groups.get(key);
    if (!group.some(other => other.path === path && other.line === entry.line && other.endLine === entry.endLine)) group.push(entry);
  }
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'BlockStatement') {
      record([node], 'block');
      if (process.argv.includes('--templates')) record([node], 'block-template');
      for (let size = 3; size <= Math.min(12, node.body.length); size++)
        for (let index = 0; index + size <= node.body.length; index++) {
          record(node.body.slice(index, index + size), 'statements');
          if (process.argv.includes('--templates')) record(node.body.slice(index, index + size), 'statements-template');
        }
    }
    if (['JSXElement', 'ArrayExpression', 'ObjectExpression'].includes(node.type)) record([node], node.type);
    if (node.type === 'JSXElement') record([node], 'jsx-template');
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'tokens', 'comments', 'extra'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(parsers.babel.parse(source).program);
}
const candidates = [...groups.values()].filter(group => group.length > 1)
  .sort((a, b) => b[0].bytes * (b.length - 1) - a[0].bytes * (a.length - 1));
const selected = [];
for (const group of candidates) {
  if (selected.some(previous => group.every(entry => previous.some(other => other.path === entry.path &&
    other.line <= entry.line && other.endLine >= entry.endLine)))) continue;
  selected.push(group);
}
const duplicateCssDeclarations = [];
const styles = ['style.css', 'src/root.css', ...readdirSync('styles').filter(path => path.endsWith('.css')).map(path => 'styles/' + path)];
for (const path of styles) {
  const source = readFileSync(path, 'utf8');
  const plain = node => node.type === 'css-rule' && node.nodes.length && node.nodes.every(child => child.type === 'css-decl');
  const signature = node => JSON.stringify(node.nodes.map(child => [child.prop, child.value.text, !!child.important]));
  function inspect(node) {
    const nodes = node.nodes || [];
    for (let index = 1; index < nodes.length; index++) {
      const before = nodes[index - 1], after = nodes[index];
      if (plain(before) && plain(after) && signature(before) === signature(after))
        duplicateCssDeclarations.push({ path, line: before.source.start.line, selectors: [before.raws.selector, after.raws.selector] });
    }
    nodes.filter(child => child.type === 'css-atrule' && ['media', 'supports'].includes(child.name)).forEach(inspect);
  }
  inspect(cssParsers.css.parse(source));
}
process.stdout.write(JSON.stringify({
  criteria: 'Application JS/JSX/MJS in src/ and js/, excluding vendor; candidates span at least 8 lines and 250 characters. Identifiers normalized, property names preserved. JSX strings masked; --templates also masks strings in blocks and statement windows (3–12 statements). Candidates require semantic review. CSS reports adjacent rules with identical declarations in the same root/media/supports context; grouping requires selector compatibility review.',
  templates: process.argv.includes('--templates'), candidates: selected, duplicateCssDeclarations,
}, null, 2) + '\n');
