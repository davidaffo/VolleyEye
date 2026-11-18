export const NEXTCLOUD_ADDRESS_KEY = 'volleyeye:nextcloud-address';

export function readNextcloudAddress() {
  try { return globalThis.localStorage?.getItem(NEXTCLOUD_ADDRESS_KEY) || ''; }
  catch { return ''; }
}

export function saveNextcloudAddress(address) {
  try { globalThis.localStorage?.setItem(NEXTCLOUD_ADDRESS_KEY, address.trim()); }
  catch { /* Storage can be unavailable in private browsing. */ }
}

export const NEXTCLOUD_FOLDERS_KEY = 'volleyeye:nextcloud-folders';

function folderKey(address, username) {
  try { return JSON.stringify([new URL(address.trim()).toString().replace(/\/$/, ''), username.trim()]); }
  catch { return ''; }
}

export function readNextcloudFolder(address, username) {
  try {
    const key = folderKey(address, username);
    const entries = JSON.parse(globalThis.localStorage?.getItem(NEXTCLOUD_FOLDERS_KEY) || '[]');
    return (Array.isArray(entries) && entries.find(entry => entry.key === key && typeof entry.folder === 'string')?.folder) || '';
  } catch { return ''; }
}

export function saveNextcloudFolder(address, username, folder) {
  try {
    const key = folderKey(address, username);
    if (!key || !username.trim()) return;
    const stored = JSON.parse(globalThis.localStorage?.getItem(NEXTCLOUD_FOLDERS_KEY) || '[]');
    const entries = Array.isArray(stored) ? stored.filter(entry => entry && entry.key !== key) : [];
    entries.push({ key, folder });
    globalThis.localStorage?.setItem(NEXTCLOUD_FOLDERS_KEY, JSON.stringify(entries));
  } catch { /* Storage can be unavailable in private browsing. */ }
}
