import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { parsers } from 'prettier/plugins/babel';
import { parsers as cssParsers } from 'prettier/plugins/postcss';

// Include untracked source files, never build output, tests or installed packages.
const root = resolve(import.meta.dirname, '..');
const git = async (...args) => (await promisify(execFile)('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })).stdout;
const walkFiles = (dir) => existsSync(resolve(root, dir))
  ? readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walkFiles(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
  : [];
const applicationFile = (path) =>
  (path.startsWith('js/') || path.startsWith('src/') || path.startsWith('styles/') ||
    ['index.html', 'style.css', 'service-worker.js'].includes(path)) &&
  /\.(?:js|jsx|mjs|css|html)$/.test(path);
const currentFiles = [...walkFiles('js'), ...walkFiles('src'), ...walkFiles('styles'),
  ...['index.html', 'style.css', 'service-worker.js'].filter((path) => existsSync(resolve(root, path)))
].filter(applicationFile).sort();
const reference = process.argv[2] || 'main';
const referenceFiles = (await git('ls-tree', '-r', '--name-only', reference)).trim().split('\n').filter(applicationFile);
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const lines = (source) => source ? source.split(/\r?\n/).length - Number(source.endsWith('\n')) : 0;
function metrics(paths, getSource) {
  const totals = { files: paths.length, lines: 0, nonblank: 0, bytes: 0 };
  const groups = {};
  const inventory = paths.map((path) => {
    const source = getSource(path);
    const entry = { path, lines: lines(source), nonblank: source.split(/\r?\n/).filter((line) => line.trim()).length,
      bytes: Buffer.byteLength(source) };
    for (const key of ['lines', 'nonblank', 'bytes']) totals[key] += entry[key];
    const group = path.startsWith('src/features/') ? path.split('/').slice(0, 3).join('/')
      : path.startsWith('src/') ? path.split('/').slice(0, 2).join('/')
      : path.startsWith('js/vendor/') ? 'js/vendor' : extname(path);
    groups[group] = (groups[group] || 0) + entry.lines;
    return entry;
  });
  return { totals, groups, inventory };
}
const modules = new Map();
function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  if (node.type) callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'tokens', 'comments', 'extra'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((child) => visit(child, callback));
    else if (value && typeof value === 'object') visit(value, callback);
  }
}
for (const path of currentFiles.filter((file) => /\.(?:js|jsx|mjs)$/.test(file) && !file.startsWith('js/vendor/'))) {
  const source = read(path);
  const ast = parsers.babel.parse(source).program;
  const imports = new Map();
  const functions = [];
  const identifiers = new Map();
  const counts = { functions: 0, typeofChecks: 0, documentReferences: 0, listeners: 0, domWrites: 0 };
  visit(ast, (node) => {
    if (node.type === 'ImportDeclaration' && node.source.value.startsWith('.')) {
      const target = resolve(root, dirname(path), node.source.value).slice(root.length + 1);
      node.specifiers.forEach((entry) => imports.set(entry.local.name,
        { path: target, name: entry.imported?.name || '*', namespace: entry.type === 'ImportNamespaceSpecifier' }));
    }
    if (['Identifier', 'JSXIdentifier'].includes(node.type)) identifiers.set(node.name, (identifiers.get(node.name) || 0) + 1);
    if (node.type === 'FunctionDeclaration') {
      counts.functions++;
      functions.push({ name: node.id.name, lines: lines(source.slice(node.start, node.end)), line: node.loc.start.line });
    }
    if (node.type === 'UnaryExpression' && node.operator === 'typeof') counts.typeofChecks++;
    if (node.type === 'MemberExpression' && node.object?.name === 'document') counts.documentReferences++;
    if (node.type === 'CallExpression' && node.callee?.property?.name === 'addEventListener') counts.listeners++;
    if (node.type === 'AssignmentExpression' && node.left?.type === 'MemberExpression' &&
      ['textContent', 'value', 'disabled', 'checked', 'className', 'innerHTML'].includes(node.left.property?.name)) counts.domWrites++;
  });
  modules.set(path, { imports, functions, identifiers, counts });
}
const imported = new Set();
const namespaceModules = new Set();
for (const module of modules.values()) for (const entry of module.imports.values()) {
  if (entry.namespace) namespaceModules.add(entry.path);
  imported.add(`${entry.path}:${entry.name}`);
}
// Candidates need review: string-based external/test API references are not proof of production use.
const unreferencedFunctions = [...modules].flatMap(([path, module]) => module.functions
  .filter((fn) => module.identifiers.get(fn.name) === 1 && !imported.has(`${path}:${fn.name}`) && !namespaceModules.has(path))
  .map((fn) => ({ path, ...fn }))).sort((a, b) => b.lines - a.lines);
const current = metrics(currentFiles, read);
const stylesheetOrder = parsers.babel.parse(read('src/main.jsx')).program.body
  .filter((node) => node.type === 'ImportDeclaration' && node.source.value.endsWith('.css'))
  .map((node) => resolve(root, 'src', node.source.value).slice(root.length + 1));
const cssRules = new Map(), duplicateCssRules = [];
function inspectCss(node, path, context = []) {
  if (node.type === 'css-atrule') {
    // Anonymous layers, scope and animation definitions need separate review.
    if (!['media', 'supports'].includes(node.name)) return;
    context = [...context, `@${node.name} ${node.raws.params || ''}`];
  }
  if (node.type === 'css-rule' && node.nodes.every((child) => ['css-decl', 'css-comment'].includes(child.type))) {
    const selector = node.raws.selector;
    const declarations = node.nodes.filter((child) => child.type === 'css-decl')
      .map((child) => [child.prop, child.value.text, !!child.important]);
    const key = JSON.stringify([context, selector, declarations]);
    const entry = { path, selector, context, line: node.source.start.line,
      lines: node.source.end.line - node.source.start.line + 1 };
    if (cssRules.has(key)) duplicateCssRules.push({ ...cssRules.get(key), supersededBy: entry });
    cssRules.set(key, entry);
  }
  (node.nodes || []).forEach((child) => inspectCss(child, path, context));
}
for (const path of stylesheetOrder) inspectCss(cssParsers.css.parse(read(path)), path);
// Strongly connected components expose dependency cycles before moving services.
const stack = [], onStack = new Set(), indices = new Map(), low = new Map(), cycles = [];
let index = 0;
function connect(path) {
  indices.set(path, index); low.set(path, index++); stack.push(path); onStack.add(path);
  for (const target of new Set([...modules.get(path).imports.values()].map((entry) => entry.path))) {
    if (!modules.has(target)) continue;
    if (!indices.has(target)) { connect(target); low.set(path, Math.min(low.get(path), low.get(target))); }
    else if (onStack.has(target)) low.set(path, Math.min(low.get(path), indices.get(target)));
  }
  if (low.get(path) === indices.get(path)) {
    const component = []; let item;
    do { item = stack.pop(); onStack.delete(item); component.push(item); } while (item !== path);
    if (component.length > 1) cycles.push(component.sort());
  }
}
for (const path of modules.keys()) if (!indices.has(path)) connect(path);
const referenceSources = new Map(await Promise.all(referenceFiles.map(async (path) => [path, await git('show', `${reference}:${path}`)])));
const baseline = metrics(referenceFiles, (path) => referenceSources.get(path));
const report = {
  reference, referenceCommit: (await git('rev-parse', reference)).trim(),
  criteria: 'Application JS/JSX/MJS/CSS/HTML in js/, src/, styles/ and root entry/style/worker; includes vendor, excludes tests, docs, scripts, build and generated files.',
  baseline, current,
  delta: Object.fromEntries(['lines', 'nonblank', 'bytes'].map((key) => [key, current.totals[key] - baseline.totals[key]])),
  moduleMetrics: [...modules].map(([path, module]) => ({ path, ...module.counts })),
  unresolvedImports: [...modules].flatMap(([path, module]) => [...module.imports.values()]
    .filter(entry => !existsSync(resolve(root, entry.path)))
    .map(entry => ({ path, target: entry.path }))),
  dependencyCycles: cycles.sort((a, b) => b.length - a.length),
  duplicateCssRules,
  unreferencedFunctions,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
