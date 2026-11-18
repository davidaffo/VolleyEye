import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { listNextcloudFiles, nextcloudFileUrl } from '../src/features/io/nextcloud.js';

test('Nextcloud costruisce percorsi WebDAV sicuri anche con sottocartelle e caratteri speciali', () => {
  assert.equal(nextcloudFileUrl('https://cloud.example/nextcloud', 'maria', 'Squadra A/backup #1.json'), 'https://cloud.example/nextcloud/remote.php/dav/files/maria/Squadra%20A/backup%20%231.json');
  assert.throws(() => nextcloudFileUrl('http://cloud.example', 'maria', 'backup.json'));
  assert.throws(() => nextcloudFileUrl('https://cloud.example', 'maria', '../backup.json'));
});

test('Nextcloud elenca solo cartelle e JSON diretti, ignorando riferimenti esterni', async () => {
  const previousFetch = globalThis.fetch;
  const previousParser = globalThis.DOMParser;
  const dom = new JSDOM('');
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, 'PROPFIND');
    assert.equal(options.headers.Depth, '1');
    assert.equal(options.headers.Authorization, 'Basic ' + btoa('maria:password'));
    return { ok: true, text: async () => `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
      <d:response><d:href>/remote.php/dav/files/maria/</d:href></d:response>
      <d:response><d:href>/remote.php/dav/files/maria/Squadra%20A/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>
      <d:response><d:href>/remote.php/dav/files/maria/backup.json</d:href></d:response>
      <d:response><d:href>/remote.php/dav/files/maria/nota.txt</d:href></d:response>
      <d:response><d:href>https://altro.example/remote.php/dav/files/maria/falso.json</d:href></d:response>
      <d:response><d:href>/remote.php/dav/files/maria/Squadra%20A/interno.json</d:href></d:response>
    </d:multistatus>` };
  };
  try {
    assert.deepEqual(await listNextcloudFiles({ address: 'https://cloud.example', username: 'maria', password: 'password' }), [
      { name: 'Squadra A', isDirectory: true, path: 'Squadra A' },
      { name: 'backup.json', isDirectory: false, path: 'backup.json' },
    ]);
  } finally { globalThis.fetch = previousFetch; globalThis.DOMParser = previousParser; dom.window.close(); }
});

test('Nextcloud distingue le risposte HTTP dagli errori di rete opachi del browser', async () => {
  const previousFetch = globalThis.fetch;
  const credentials = { address: 'https://cloud.example', username: 'maria', password: 'segreto' };
  try {
    globalThis.fetch = async () => ({ ok: false, status: 401 });
    await assert.rejects(listNextcloudFiles(credentials), /password per app.*HTTP 401/);
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    await assert.rejects(listNextcloudFiles(credentials), /WebDAV non trovato.*HTTP 404/);
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(listNextcloudFiles(credentials), /CORS.*non permette di distinguere/);
    globalThis.fetch = async () => ({ ok: true, text: async () => '<html>Login</html>' });
    const previousParser = globalThis.DOMParser;
    const dom = new JSDOM('');
    globalThis.DOMParser = dom.window.DOMParser;
    try { await assert.rejects(listNextcloudFiles(credentials), /elenco WebDAV valido/); }
    finally { globalThis.DOMParser = previousParser; dom.window.close(); }
  } finally { globalThis.fetch = previousFetch; }
});

test('l’indirizzo Nextcloud viene conservato senza salvare credenziali e tollera storage bloccato', async () => {
  const { NEXTCLOUD_ADDRESS_KEY, readNextcloudAddress, saveNextcloudAddress } = await import('../src/features/io/nextcloud-preferences.js');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const items = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => items.get(key), setItem: (key, value) => items.set(key, value),
  } });
  try {
    saveNextcloudAddress(' https://cloud.example ');
    assert.equal(readNextcloudAddress(), 'https://cloud.example');
    assert.deepEqual([...items.keys()], [NEXTCLOUD_ADDRESS_KEY]);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    assert.equal(readNextcloudAddress(), '');
    assert.doesNotThrow(() => saveNextcloudAddress('https://cloud.example'));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('le cartelle Nextcloud restano separate per server e account', async () => {
  const { readNextcloudFolder, saveNextcloudFolder } = await import('../src/features/io/nextcloud-preferences.js');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const items = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => items.get(key), setItem: (key, value) => items.set(key, value),
  } });
  try {
    saveNextcloudFolder('https://cloud.example/', 'anna', 'Squadra/Backup');
    saveNextcloudFolder('https://cloud.example', 'bea', 'Altra cartella');
    saveNextcloudFolder('https://other.example', 'anna', 'Altrove');
    assert.equal(readNextcloudFolder('https://cloud.example', 'anna'), 'Squadra/Backup');
    assert.equal(readNextcloudFolder('https://cloud.example/', 'bea'), 'Altra cartella');
    assert.equal(readNextcloudFolder('https://other.example', 'anna'), 'Altrove');
    saveNextcloudFolder('https://cloud.example', 'anna', '');
    assert.equal(readNextcloudFolder('https://cloud.example', 'anna'), '');
    assert.equal(readNextcloudFolder('https://cloud.example', 'bea'), 'Altra cartella');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('la lettura di un backup Nextcloud usa GET senza richiedere permessi di scrittura', async () => {
  const { transferNextcloud } = await import('../src/features/io/nextcloud.js');
  const previousFetch = globalThis.fetch;
  const previousAlert = globalThis.alert;
  const requests = [];
  globalThis.alert = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, method: options.method, body: options.body });
    return { ok: true, blob: async () => new Blob(['{}']) };
  };
  try {
    assert.equal(await transferNextcloud({ address: 'https://cloud.example', username: 'anna', password: 'password', path: 'Condivisi/backup.json' }, 'GET'), false);
    assert.deepEqual(requests, [{ url: 'https://cloud.example/remote.php/dav/files/anna/Condivisi/backup.json', method: 'GET', body: undefined }]);
  } finally { globalThis.fetch = previousFetch; globalThis.alert = previousAlert; }
});

test('un file condiviso viene trovato nel percorso della destinataria senza sceglierne uno ambiguo', async () => {
  const { findSharedNextcloudFile } = await import('../src/features/io/nextcloud.js');
  const folders = {
    'Lavoro/Squadra': [],
    Squadra: [{ name: 'backup.json', isDirectory: false, path: 'Squadra/backup.json' }],
    '': [],
  };
  const list = async (_, folder) => folders[folder];
  assert.equal((await findSharedNextcloudFile({}, 'Lavoro/Squadra/backup.json', list)).path, 'Squadra/backup.json');
  folders[''] = [{ name: 'backup.json', isDirectory: false, path: 'backup.json' }];
  assert.equal(await findSharedNextcloudFile({}, 'Lavoro/Squadra/backup.json', list), null);
});

