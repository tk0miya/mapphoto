// マイマップ URL を localStorage に短期間（24h）保存する。

const STORAGE_KEY = "mapphoto:kmzUrl";
const TTL_MS = 24 * 60 * 60 * 1000;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadStoredKmzUrl(storage: StorageLike, now: number = Date.now()): string {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { value: unknown; savedAt: unknown };
    if (typeof parsed.value !== "string" || typeof parsed.savedAt !== "number") return "";
    if (now - parsed.savedAt > TTL_MS) {
      storage.removeItem(STORAGE_KEY);
      return "";
    }
    return parsed.value;
  } catch {
    return "";
  }
}

export function saveKmzUrl(storage: StorageLike, value: string, now: number = Date.now()): void {
  try {
    if (!value) {
      storage.removeItem(STORAGE_KEY);
      return;
    }
    storage.setItem(STORAGE_KEY, JSON.stringify({ value, savedAt: now }));
  } catch {
    // localStorage が使えない環境（プライベートブラウズ等）は無視
  }
}
