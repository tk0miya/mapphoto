import { describe, expect, it } from "vitest";
import { parseMapsUrl } from "./mapsUrl";

describe("parseMapsUrl", () => {
  it("extracts mid from edit URLs", () => {
    expect(parseMapsUrl("https://www.google.com/maps/d/edit?mid=1abc-XYZ_123&usp=sharing")).toEqual({
      mid: "1abc-XYZ_123",
      lid: undefined,
    });
  });

  it("extracts mid from viewer URLs", () => {
    expect(parseMapsUrl("https://www.google.com/maps/d/viewer?mid=1abc-XYZ_123&hl=ja")).toEqual({
      mid: "1abc-XYZ_123",
      lid: undefined,
    });
  });

  it("extracts mid from /u/N/ multi-account paths", () => {
    expect(parseMapsUrl("https://www.google.com/maps/d/u/0/edit?mid=1abc-XYZ_123")).toEqual({
      mid: "1abc-XYZ_123",
      lid: undefined,
    });
  });

  it("extracts lid when present", () => {
    expect(parseMapsUrl("https://www.google.com/maps/d/edit?mid=1abc&lid=lyr1")).toEqual({
      mid: "1abc",
      lid: "lyr1",
    });
  });

  it("accepts google.co.jp", () => {
    expect(parseMapsUrl("https://www.google.co.jp/maps/d/edit?mid=1abc")).toEqual({
      mid: "1abc",
      lid: undefined,
    });
  });

  it("accepts maps.google.com subdomain", () => {
    expect(parseMapsUrl("https://maps.google.com/maps/d/edit?mid=1abc")).toEqual({
      mid: "1abc",
      lid: undefined,
    });
  });

  it("trims whitespace", () => {
    expect(parseMapsUrl("  https://www.google.com/maps/d/edit?mid=1abc  ")).toEqual({
      mid: "1abc",
      lid: undefined,
    });
  });

  it("returns null for non-/maps/d/ google URLs", () => {
    expect(parseMapsUrl("https://www.google.com/maps/place/Tokyo")).toBeNull();
  });

  it("returns null for non-google hosts", () => {
    expect(parseMapsUrl("https://example.com/maps/d/edit?mid=1abc")).toBeNull();
  });

  it("returns null when mid is missing", () => {
    expect(parseMapsUrl("https://www.google.com/maps/d/edit")).toBeNull();
  });

  it("returns null for malformed URLs", () => {
    expect(parseMapsUrl("not a url")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseMapsUrl("")).toBeNull();
    expect(parseMapsUrl("   ")).toBeNull();
  });
});
