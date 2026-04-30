import { describe, expect, it } from "vitest";
import { formatPlace } from "./geocode";

describe("formatPlace", () => {
  it("combines POI and city with @", () => {
    expect(formatPlace({ poi: "東京タワー", pref: "東京都", city: "港区" })).toBe("東京タワー @ 東京都港区");
  });

  it("falls back to POI alone when region is missing", () => {
    expect(formatPlace({ poi: "東京タワー" })).toBe("東京タワー");
  });

  it("uses pref+city when POI is missing", () => {
    expect(formatPlace({ pref: "東京都", city: "千代田区" })).toBe("東京都千代田区");
  });

  it("uses pref alone when city is missing", () => {
    expect(formatPlace({ pref: "北海道" })).toBe("北海道");
  });

  it("returns undefined when nothing is available", () => {
    expect(formatPlace({})).toBeUndefined();
  });
});
