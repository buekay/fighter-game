/**
 * Small, browser-safe persistence boundary for the game.
 *
 * Storage can be unavailable in private browsing modes, restricted embeds,
 * server-side tests, or when a quota is exhausted. Callers therefore receive
 * fallbacks instead of having to repeat try/catch blocks throughout the UI.
 */
function browserStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readStoredText(key: string): string | null {
  try {
    return browserStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStoredText(key: string, value: string): boolean {
  try {
    const storage = browserStorage();
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStoredValue(key: string): boolean {
  try {
    const storage = browserStorage();
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readStoredJson(key: string, fallback: unknown): unknown {
  const raw = readStoredText(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key: string, value: unknown): boolean {
  try {
    return writeStoredText(key, JSON.stringify(value));
  } catch {
    return false;
  }
}
