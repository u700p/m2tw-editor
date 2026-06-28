/**
 * Shared store for Total War localization files.
 * Uses an in-memory store as primary (survives localStorage quota failures).
 * Also persists to localStorage when possible.
 * Shape: { [filename]: { entries: [{key, value}], sourceFormat: 'txt' } }
 */

const STORE_KEY = 'm2tw_text_localization_files';
const LEGACY_STORE_KEY = 'm2tw_strings_bin_files';

// In-memory store — always available regardless of localStorage limits
let _memoryStore = null;

export function normalizeTextLocalizationName(name) {
  const raw = String(name || 'localization.txt').trim() || 'localization.txt';
  let clean = raw
    .replace(/\.txt\.strings\.bin$/i, '.txt')
    .replace(/\.strings\.bin$/i, '.txt')
    .replace(/\.bin$/i, '.txt');
  if (clean.toLowerCase() === 'expanded.txt') clean = 'expanded_bi.txt';
  return clean;
}

function normalizeStore(store) {
  const normalized = {};
  for (const [name, data] of Object.entries(store || {})) {
    normalized[normalizeTextLocalizationName(name)] = {
      ...data,
      sourceFormat: 'txt',
    };
  }
  return normalized;
}

function getMemoryStore() {
  if (_memoryStore === null) {
    // Try to hydrate from localStorage on first access
    try {
      const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_STORE_KEY);
      _memoryStore = raw ? normalizeStore(JSON.parse(raw)) : {};
    } catch {
      _memoryStore = {};
    }
  }
  return _memoryStore;
}

export function getStringsBinStore() {
  return getMemoryStore();
}

export function setStringsBinStore(store) {
  _memoryStore = normalizeStore(store);
  // Best-effort persist to localStorage
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(_memoryStore));
    localStorage.removeItem(LEGACY_STORE_KEY);
  } catch (e) {
    console.warn('[StringsBinStore] localStorage write failed (quota), using in-memory only:', e.message);
  }
}

export function updateStringsBinFile(name, fileData) {
  const store = getMemoryStore();
  store[normalizeTextLocalizationName(name)] = { ...fileData, sourceFormat: 'txt' };
  setStringsBinStore(store);
  window.dispatchEvent(new CustomEvent('strings-bin-updated', { detail: { name } }));
}

export function clearStringsBinStore() {
  _memoryStore = {};
  try {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(LEGACY_STORE_KEY);
  } catch {}
}
