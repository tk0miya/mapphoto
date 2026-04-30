import JSZip from "jszip";
import type { Feature } from "./types";

function parseCoords(text: string): [number, number][] {
  return text
    .trim()
    .split(/\s+/)
    .map((token) => {
      const [lon, lat] = token.split(",").map(Number);
      return [lon, lat] as [number, number];
    })
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
}

function parseKmlText(kmlText: string): Feature[] {
  const doc = new DOMParser().parseFromString(kmlText, "text/xml");

  const features: Feature[] = [];

  for (const pm of doc.querySelectorAll("Placemark")) {
    const coordsEl = pm.querySelector("coordinates");
    if (!coordsEl?.textContent) continue;

    if (pm.querySelector("Point")) {
      const coords = parseCoords(coordsEl.textContent);
      if (coords.length > 0) {
        features.push({ type: "Point", coordinates: coords[0] });
      }
    } else if (pm.querySelector("LineString")) {
      const coords = parseCoords(coordsEl.textContent);
      if (coords.length > 1) {
        features.push({ type: "LineString", coordinates: coords });
      }
    }
  }

  return features;
}

async function parseKmzBuffer(buf: ArrayBuffer): Promise<Feature[]> {
  const zip = await JSZip.loadAsync(buf);
  const kmlFile = zip.file("doc.kml");
  if (!kmlFile) throw new Error("doc.kml が見つかりません");
  const kmlText = await kmlFile.async("string");
  return parseKmlText(kmlText);
}

export async function parseKmz(file: File): Promise<Feature[]> {
  return parseKmzBuffer(await file.arrayBuffer());
}

// KMZ（zip）と KML（テキスト）を ArrayBuffer から自動判別してパースする。
// プロキシは forcekml=1 でも KMZ を返すケースがあるため両対応する。
export async function parseMapSource(buf: ArrayBuffer): Promise<Feature[]> {
  const view = new Uint8Array(buf);
  // ZIP ローカルファイルヘッダのマジックバイト "PK\x03\x04"
  if (view[0] === 0x50 && view[1] === 0x4b) {
    return parseKmzBuffer(buf);
  }
  return parseKmlText(new TextDecoder("utf-8").decode(buf));
}
