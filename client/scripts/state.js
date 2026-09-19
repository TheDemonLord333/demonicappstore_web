const listeners = new Set();

const state = {
  user: null, // { username } | null
  categories: [],
  installedApps: {},
  online: navigator.onLine,
};

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const listener of listeners) listener(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const CACHE_KEY = 'demonic-store-cache-v1';

export function cacheStoreSnapshot(apps, categories) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ apps, categories, cachedAt: Date.now() }));
  } catch {
    // localStorage evtl. nicht verfügbar (privater Modus) – nicht kritisch.
  }
}

export function readStoreSnapshot() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
