import { buildDatabaseBackupPayload } from './exports.js';
import { importDatabaseFile } from './file-and-url-import.js';

export function nextcloudFileUrl(address, username, path = '') {
  let base;
  try { base = new URL(address.trim()); }
  catch { throw new Error('Indirizzo non valido: inserisci l’indirizzo completo, per esempio https://cloud.example.it.'); }
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) throw new Error('Usa un indirizzo Nextcloud HTTPS.');
  if (base.username || base.password || base.search || base.hash) throw new Error('Inserisci solo l’indirizzo del server Nextcloud.');
  const parts = path.trim().split('/').filter(Boolean);
  if (!username.trim() || username.includes(':') || parts.some(part => part === '.' || part === '..')) throw new Error('Inserisci nome utente e percorso validi.');
  base.pathname = base.pathname.replace(/\/+$/, '') + '/remote.php/dav/files/' + encodeURIComponent(username.trim()) + '/' + parts.map(encodeURIComponent).join('/');
  return base.toString();
}

async function requestNextcloud({ address, username, password }, path, options) {
  const url = nextcloudFileUrl(address, username, path);
  if (!password) throw new Error('Inserisci la password Nextcloud.');
  const bytes = new TextEncoder().encode(username.trim() + ':' + password);
  const authorization = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
  let response;
  try { response = await fetch(url, {
    mode: 'cors', redirect: 'error', cache: 'no-store', ...options,
    headers: { Authorization: 'Basic ' + authorization, ...options.headers },
  }); } catch (error) {
    console.error('Richiesta Nextcloud non riuscita', { method: options.method, origin: new URL(url).origin, error });
    throw new Error('Il browser non ha ricevuto una risposta leggibile. Può trattarsi di un blocco CORS, di un server non raggiungibile, di un certificato non valido o di un reindirizzamento. Il browser non permette di distinguere queste cause.');
  }
  if (!response.ok) {
    const descriptions = {
      401: 'Accesso rifiutato: verifica nome utente e password. Se usi l’autenticazione a due fattori, prova una password per app Nextcloud.',
      403: 'Accesso vietato: verifica i permessi dell’account e la configurazione del server.',
      404: 'Percorso WebDAV non trovato: verifica l’indirizzo Nextcloud, inclusa l’eventuale sottocartella, e il nome utente.',
      405: 'Il server non accetta questa operazione WebDAV. Verifica la configurazione del server o del proxy.',
      429: 'Troppe richieste: attendi e riprova.',
    };
    const error = new Error((descriptions[response.status] || 'Il server ha rifiutato la richiesta.') + ' (HTTP ' + response.status + ').');
    error.status = response.status;
    throw error;
  }
  return response;
}

export async function listNextcloudFiles(credentials, directory = '') {
  const response = await requestNextcloud(credentials, directory, {
    method: 'PROPFIND', headers: { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:displayname/></d:prop></d:propfind>',
  });
  const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
  if (xml.querySelector('parsererror') || xml.documentElement?.namespaceURI !== 'DAV:' || xml.documentElement?.localName !== 'multistatus') throw new Error('Il server non ha restituito un elenco WebDAV valido. Controlla che l’indirizzo punti all’installazione Nextcloud e non a una pagina di accesso o a un proxy.');
  const base = new URL(nextcloudFileUrl(credentials.address, credentials.username, directory));
  const parentPath = base.pathname.replace(/\/+$/, '') + '/';
  const entries = [];
  for (const item of xml.getElementsByTagNameNS('DAV:', 'response')) {
    const href = item.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent;
    if (!href) continue;
    let itemUrl;
    try { itemUrl = new URL(href, base); } catch { continue; }
    if (itemUrl.origin !== base.origin || !itemUrl.pathname.startsWith(parentPath)) continue;
    const relative = itemUrl.pathname.slice(parentPath.length).replace(/\/$/, '');
    if (!relative || relative.includes('/')) continue;
    let name;
    try { name = decodeURIComponent(relative); } catch { continue; }
    if (!name || name.includes('/') || name === '.' || name === '..') continue;
    const isDirectory = item.getElementsByTagNameNS('DAV:', 'collection').length > 0;
    if (isDirectory || /\.json$/i.test(name)) entries.push({ name, isDirectory, path: [directory, name].filter(Boolean).join('/') });
  }
  return entries.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name, 'it'));
}

export async function transferNextcloud(credentials, method, onProgress = () => {}) {
  if (!credentials.path?.trim()) throw new Error('Seleziona un file.');
  const response = await requestNextcloud(credentials, credentials.path, {
    method,
    headers: method === 'PUT' ? { 'Content-Type': 'application/json' } : {},
    ...(method === 'PUT' ? { body: JSON.stringify(buildDatabaseBackupPayload()) } : {}),
  });
  if (method === 'GET') {
    onProgress('Download del database in corso…');
    const blob = await response.blob();
    onProgress('Download completato. Importazione e salvataggio del database in corso…');
    await new Promise(resolve => setTimeout(resolve, 0));
    return importDatabaseFile(blob);
  }
  return true;
}

// A shared folder can appear at a different location in the recipient's account.
export async function findSharedNextcloudFile(credentials, path, listFiles = listNextcloudFiles) {
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return null;
  const name = parts.pop();
  const matches = [];
  for (let start = 0; start <= parts.length; start++) {
    const directory = parts.slice(start).join('/');
    let files;
    try { files = await listFiles(credentials, directory); }
    catch (error) {
      if ([403, 404, 405].includes(error.status)) continue;
      throw error;
    }
    const file = files.find(entry => !entry.isDirectory && entry.name === name);
    if (file) matches.push({ directory, path: file.path, files });
  }
  return matches.length === 1 ? matches[0] : null;
}
