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

export async function parseKmz(file: File): Promise<Feature[]> {
  const zip = await JSZip.loadAsync(file);

  const kmlFile = zip.file("doc.kml");
  if (!kmlFile) throw new Error("doc.kml が見つかりません");

  const kmlText = await kmlFile.async("string");
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
