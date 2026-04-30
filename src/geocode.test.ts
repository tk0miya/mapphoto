import { describe, expect, it } from "vitest";
import { formatPlace, parseMuniTable } from "./geocode";

describe("parseMuniTable", () => {
  it("extracts city names (not codes)", () => {
    // muni.js の値は '都道府県コード,都道府県名,市区町村コード,市区町村名'
    const src = `GSI.MUNI_ARRAY['01100'] = '1,北海道,1100,札幌市';
GSI.MUNI_ARRAY['13101'] = '13,東京都,13101,千代田区';`;
    const table = parseMuniTable(src);
    expect(table.get("01100")).toBe("札幌市");
    expect(table.get("13101")).toBe("千代田区");
  });

  it("pads numeric code keys to 5 digits", () => {
    const src = `GSI.MUNI_ARRAY[1100] = '1,北海道,1100,札幌市';`;
    const table = parseMuniTable(src);
    expect(table.get("01100")).toBe("札幌市");
  });
});

describe("formatPlace", () => {
  it("combines POI and city with @", () => {
    expect(formatPlace({ poi: "東京タワー", city: "港区" })).toBe("東京タワー @ 港区");
  });

  it("falls back to POI alone when city is missing", () => {
    expect(formatPlace({ poi: "東京タワー" })).toBe("東京タワー");
  });

  it("uses city when POI is missing", () => {
    expect(formatPlace({ city: "千代田区" })).toBe("千代田区");
  });

  it("returns undefined when nothing is available", () => {
    expect(formatPlace({})).toBeUndefined();
  });
});
