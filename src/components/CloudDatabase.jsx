import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DatabaseUrlInput, AppActionButton } from './AppActions.jsx';
import { ModalFrame, ModalHeader, ModalBody } from './ui/Modal.jsx';
import { listNextcloudFiles, nextcloudFileUrl, transferNextcloud, findSharedNextcloudFile } from '../features/io/nextcloud.js';
import { readNextcloudAddress, saveNextcloudAddress, readNextcloudFolder, saveNextcloudFolder } from '../features/io/nextcloud-preferences.js';

const DEFAULT_NAME = 'volleyeye-backup.json';

export function CloudDatabase() {
  const opener = useRef(null);
  const generation = useRef(0);
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState('choose');
  const [address, setAddress] = useState(readNextcloudAddress);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [directory, setDirectory] = useState('');
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState('');
  const [filename, setFilename] = useState(DEFAULT_NAME);
  const [sharedPath, setSharedPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareUsername, setShareUsername] = useState('');
  const [sharePath, setSharePath] = useState('');
  const credentials = { address, username, password };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('cloud') !== 'nextcloud') return;
    setAddress(url.searchParams.get('cloudAddress') || '');
    setUsername(url.searchParams.get('cloudUser') || '');
    setSharedPath(url.searchParams.get('cloudPath') || '');
    ['cloud', 'cloudAddress', 'cloudUser', 'cloudPath'].forEach(key => url.searchParams.delete(key));
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    setScreen('login'); setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = event => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function close() {
    generation.current += 1; setBusy(false);
    setOpen(false); setScreen('choose'); setPassword(''); setMessage(''); setShareLink(''); setSharing(false); setShareUsername(''); setSharedPath('');
    opener.current?.focus();
  }
  function back() { setMessage(''); setShareLink(''); if (screen !== 'files') setSharedPath(''); setScreen(screen === 'files' ? 'login' : 'choose'); }

  async function browse(folder, target = '', restore = false) {
    const request = ++generation.current;
    setBusy(true); setMessage(''); setShareLink(''); setSharing(false);
    try {
      let files;
      try { files = await listNextcloudFiles(credentials, folder); }
      catch (error) {
        if (!target || ![403, 404, 405].includes(error.status)) throw error;
        files = [];
      }
      if (target && !files.some(file => file.path === target && !file.isDirectory)) {
        const found = await findSharedNextcloudFile(credentials, target);
        if (found) { folder = found.directory; target = found.path; files = found.files; }
      }
      if (request !== generation.current) return;
      saveNextcloudAddress(address);
      saveNextcloudFolder(address, username, folder);
      setEntries(files); setDirectory(folder); setSelected(target);
      setFilename(target ? target.split('/').pop() : DEFAULT_NAME);
      setScreen('files');
      if (target && !files.some(file => file.path === target && !file.isDirectory)) setMessage('Il file condiviso non compare nell’elenco. Puoi provare a importarlo direttamente se hai accesso in lettura.');
      return true;
    } catch (error) {
      if (request !== generation.current) return;
      if (target && [403, 404, 405].includes(error.status)) {
        setEntries([]); setDirectory(folder); setSelected(target); setFilename(target.split('/').pop()); setScreen('files');
        setMessage('Non è possibile elencare questa cartella. Puoi provare a importare direttamente il file condiviso.');
        return true;
      }
      if (restore && folder && error.status === 404) {
        const opened = await browse('');
        if (opened && generation.current === request + 1) setMessage('La cartella salvata non è più disponibile: aperta la cartella principale.');
        return;
      }
      setMessage('Connessione non riuscita: ' + (error.message || 'errore di rete'));
    } finally { if (request === generation.current) setBusy(false); }
  }
  function login(event) {
    event.preventDefault();
    const parts = sharedPath.split('/').filter(Boolean);
    const folder = sharedPath ? parts.slice(0, -1).join('/') : readNextcloudFolder(address, username);
    void browse(folder, sharedPath, !sharedPath);
  }
  async function transfer(method) {
    const path = method === 'GET' ? selected : [directory, filename.trim()].filter(Boolean).join('/');
    if (!path || (method === 'PUT' && (!filename.trim() || filename.includes('/') || filename === '.' || filename === '..' || !/\.json$/i.test(filename.trim())))) {
      setMessage(method === 'GET' ? 'Seleziona un file JSON da importare.' : 'Inserisci un nome file valido con estensione .json.'); return;
    }
    if (method === 'GET' && !window.confirm('Importare il database selezionato? I dati presenti potranno essere sostituiti.')) return;
    if (method === 'PUT' && entries.some(file => !file.isDirectory && file.name === filename.trim()) && !window.confirm('Il file esiste già. Vuoi sovrascriverlo?')) return;
    setBusy(true); setMessage(method === 'GET' ? 'Download del database in corso…' : 'Esportazione del database in corso…');
    try {
      const ok = await transferNextcloud({ ...credentials, path }, method, setMessage);
      if (method === 'GET') setMessage(ok ? 'Database importato correttamente.' : 'Importazione non completata: controlla il messaggio visualizzato.');
      if (ok && method === 'PUT') {
        setSelected(path); setMessage('Database esportato su Nextcloud.');
        try { setEntries(await listNextcloudFiles(credentials, directory)); }
        catch { setMessage('Database esportato su Nextcloud. Impossibile aggiornare la lista: usa Aggiorna.'); }
      }
    } catch (error) {
      setMessage('Operazione non riuscita: ' + (error.message || 'errore di connessione'));
    } finally { setBusy(false); }
  }
  async function share() {
    if (!selected) { setMessage('Seleziona il file da condividere.'); return; }
    if (!shareUsername.trim() || !sharePath.trim()) { setMessage('Inserisci il nome utente e il percorso del file per chi riceverà il link.'); return; }
    try {
      nextcloudFileUrl(address, shareUsername, sharePath);
      const url = new URL(window.location.href);
      url.hash = '';
      url.searchParams.set('cloud', 'nextcloud'); url.searchParams.set('cloudAddress', address.trim());
      url.searchParams.set('cloudUser', shareUsername.trim()); url.searchParams.set('cloudPath', sharePath.trim().replace(/^\/+|\/+$/g, ''));
      const link = url.toString(); setShareLink(link);
      try { await navigator.clipboard.writeText(link); setMessage('Link copiato. La password non è inclusa.'); }
      catch { setMessage('Copia il link qui sotto. La password non è inclusa.'); }
    } catch (error) { setMessage(error.message); }
  }

  return <>
    <button ref={opener} type="button" className="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog"><span aria-hidden="true">☁</span> Cloud</button>
    {typeof document !== 'undefined' && createPortal(<ModalFrame open={open} onClose={close} className="skill-modal force-popup" aria-labelledby="cloud-title" contentProps={{ className: 'skill-modal__content cloud-dialog' }}>
      <ModalHeader title="☁ Database cloud" titleId="cloud-title" onClose={close} />
      <ModalBody>
        {screen === 'choose' && <div className="cloud-choice">
          <p>Come vuoi gestire il database?</p>
          <button type="button" className="secondary cloud-choice__button" onClick={() => setScreen('link')}><strong>🔗 Importa da link</strong><span>Apri un backup disponibile online</span></button>
          <button type="button" className="secondary cloud-choice__button" onClick={() => setScreen('login')}><strong>☁ Nextcloud</strong><span>Accedi ai tuoi file, importa, esporta e condividi</span></button>
        </div>}
        {screen !== 'choose' && <button type="button" className="secondary cloud-back" onClick={back} disabled={busy}>← Indietro</button>}
        {screen === 'link' && <section><h4>Importa da link</h4><p className="section-note">Incolla il collegamento pubblico al file di backup.</p><div className="cloud-dialog__row">
          <DatabaseUrlInput id="import-db-url" type="url" className="match-url-input" placeholder="https://.../backup.json" aria-label="Link al database" />
          <AppActionButton id="btn-import-db-url" className="secondary">Importa da link</AppActionButton>
        </div></section>}
        {screen === 'login' && <section><h4>Accedi a Nextcloud</h4>
          {sharedPath && <p className="section-note">È stato condiviso con te il file <strong>{sharedPath}</strong>. Inserisci la password per accedervi.</p>}
          <form onSubmit={login}>
            <label>Indirizzo Nextcloud<input required type="url" autoComplete="url" value={address} onChange={event => setAddress(event.target.value)} placeholder="https://cloud.example.it" /></label>
            <label>Nome utente<input required type="text" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} /></label>
            <label>Password o password per app<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
            <button type="submit" disabled={busy}>{busy ? 'Connessione…' : 'Accedi'}</button>
          </form>
          <details className="cloud-help"><summary>Problemi di connessione?</summary><p>Apri l’indirizzo Nextcloud in questa finestra per verificare che sia raggiungibile e che il certificato sia valido. Inserisci l’indirizzo della pagina principale, inclusa l’eventuale sottocartella.</p><p>Se VolleyEye e Nextcloud sono su indirizzi diversi, il server o il proxy Nextcloud deve autorizzare l’origine di VolleyEye tramite CORS, anche per le richieste OPTIONS, PROPFIND, GET e PUT e gli header Authorization, Content-Type e Depth. La console del browser può indicare il blocco preciso.</p><p>Se l’account usa l’autenticazione a due fattori, crea una password per app nelle impostazioni di sicurezza Nextcloud.</p></details>
        </section>}
        {screen === 'files' && sharedPath && <section className="cloud-shared-import">
          <h4>Importa il database condiviso</h4>
          <p className="section-note">File indicato nel collegamento:</p>
          <div className="cloud-shared-import__file"><span aria-hidden="true">📄</span><div><strong>{selected.split('/').pop()}</strong><span>/{selected}</span></div></div>
          <p className="section-note">Accedi come {username} · {address}</p>
          <button type="button" disabled={busy || !selected} onClick={() => transfer('GET')}>Importa database</button>
        </section>}
        {screen === 'files' && !sharedPath && <section>
          <div className="cloud-files__heading"><div><h4>I tuoi file Nextcloud</h4><p className="section-note">{username} · {address}</p></div><button type="button" className="secondary" disabled={busy} onClick={() => browse(directory, selected)}>↻ Aggiorna</button></div>
          <p className="cloud-files__path">📁 /{directory}</p>
          <div className="cloud-files__list" aria-label="File e cartelle Nextcloud" aria-busy={busy}>
            {directory && <button type="button" className="cloud-files__item" disabled={busy} onClick={() => browse(directory.split('/').slice(0, -1).join('/'))}>📁 .. <span>Cartella superiore</span></button>}
            {!entries.length && <p className="section-note">Nessuna cartella o file JSON in questa posizione.</p>}
            {entries.map(file => <button type="button" key={file.path} disabled={busy} className={'cloud-files__item' + (selected === file.path ? ' is-selected' : '')} aria-pressed={!file.isDirectory ? selected === file.path : undefined} onClick={() => { if (file.isDirectory) void browse(file.path); else { setSelected(file.path); setFilename(file.name); setShareLink(''); setSharing(false); setMessage(''); } }}><span>{file.isDirectory ? '📁' : '📄'} {file.name}</span><span>{file.isDirectory ? 'Apri ›' : selected === file.path ? 'Selezionato ✓' : 'Seleziona'}</span></button>)}
          </div>
          <p className="section-note">{selected ? 'File selezionato: ' + selected : 'Seleziona un file JSON per importarlo o condividerlo.'}</p>
          <div className="cloud-dialog__row"><button type="button" disabled={busy || !selected} onClick={() => transfer('GET')}>Importa selezionato</button><button type="button" className="secondary" disabled={busy || !selected} onClick={() => { setSharing(true); setShareUsername(''); setSharePath(selected); setShareLink(''); setMessage(''); }}>Condividi con le giocatrici</button></div>
          {sharing && <div className="cloud-export"><h4>Crea link per una giocatrice</h4>
            <label>Nome utente Nextcloud della destinataria<input type="text" value={shareUsername} onChange={event => { setShareUsername(event.target.value); setShareLink(''); }} placeholder="Nome utente della giocatrice" /></label>
            <label>Percorso del file nell’account della destinataria<input type="text" value={sharePath} onChange={event => { setSharePath(event.target.value); setShareLink(''); }} /></label>
            <p className="section-note">Condividi prima il file in Nextcloud con questo account. Se nella sua cartella si trova in una posizione diversa, modifica il percorso. La password non è inclusa nel link.</p>
            <button type="button" className="secondary" onClick={share}>Copia link</button>
            {shareLink && <label>Link da condividere<input readOnly value={shareLink} onFocus={event => event.target.select()} /></label>}
          </div>}
          <div className="cloud-export"><h4>Esporta in questa cartella</h4><label>Nome del backup<input type="text" value={filename} onChange={event => setFilename(event.target.value)} /></label><button type="button" className="secondary" disabled={busy} onClick={() => transfer('PUT')}>Esporta database</button></div>
        </section>}
        {message && <p role="status" className="cloud-status">{message}</p>}
      </ModalBody>
    </ModalFrame>, document.body)}
  </>;
}
