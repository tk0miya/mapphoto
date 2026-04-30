import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadStoredKmzUrl, saveKmzUrl } from "./kmzUrlStorage";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  has(key: string): boolean {
    return this.store.has(key);
  }
}

const KEY = "mapphoto:kmzUrl";
const DAY = 24 * 60 * 60 * 1000;

describe("saveKmzUrl", () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("stores the value with a timestamp", () => {
    saveKmzUrl(storage, "https://www.google.com/maps/d/edit?mid=1abc", 1_000);
    expect(JSON.parse(storage.getItem(KEY) ?? "")).toEqual({
      value: "https://www.google.com/maps/d/edit?mid=1abc",
      savedAt: 1_000,
    });
  });

  it("removes the entry when value is empty", () => {
    storage.setItem(KEY, JSON.stringify({ value: "x", savedAt: 1 }));
    saveKmzUrl(storage, "");
    expect(storage.has(KEY)).toBe(false);
  });

  it("silently ignores storage errors", () => {
    const failing: MemoryStorage & { setItem: () => void } = Object.assign(new MemoryStorage(), {
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(() => saveKmzUrl(failing, "https://www.google.com/maps/d/edit?mid=1abc")).not.toThrow();
  });
});

describe("loadStoredKmzUrl", () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("returns empty string when nothing is stored", () => {
    expect(loadStoredKmzUrl(storage)).toBe("");
  });

  it("returns the saved value within the TTL", () => {
    saveKmzUrl(storage, "https://www.google.com/maps/d/edit?mid=1abc", 1_000);
    expect(loadStoredKmzUrl(storage, 1_000 + DAY - 1)).toBe("https://www.google.com/maps/d/edit?mid=1abc");
  });

  it("returns empty and clears storage after TTL expires", () => {
    saveKmzUrl(storage, "https://www.google.com/maps/d/edit?mid=1abc", 1_000);
    expect(loadStoredKmzUrl(storage, 1_000 + DAY + 1)).toBe("");
    expect(storage.has(KEY)).toBe(false);
  });

  it("returns empty for malformed JSON", () => {
    storage.setItem(KEY, "not json");
    expect(loadStoredKmzUrl(storage)).toBe("");
  });

  it("returns empty for unexpected shape", () => {
    storage.setItem(KEY, JSON.stringify({ value: 123, savedAt: "bad" }));
    expect(loadStoredKmzUrl(storage)).toBe("");
  });

  it("returns empty when storage throws", () => {
    const failing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    expect(loadStoredKmzUrl(failing)).toBe("");
  });
});
