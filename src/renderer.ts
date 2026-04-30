import { type ExifData, readExif } from "./exifReader";
import type { Corner, Feature, Theme } from "./types";

interface ThemePalette {
  mapBackground: string;
  prefectureStroke: string;
  routeStroke: string;
  markerFill: string;
  markerStroke: string;
  textBackground: string;
  textFill: string;
  textShadow: string;
}

const THEMES: Record<Theme, ThemePalette> = {
  dark: {
    mapBackground: "rgba(10,12,24,0.40)",
    prefectureStroke: "rgba(255,255,255,0.35)",
    routeStroke: "#ff6b6b",
    markerFill: "#ff6b6b",
    markerStroke: "rgba(255,255,255,0.85)",
    textBackground: "rgba(10,12,24,0.40)",
    textFill: "rgba(255,255,255,0.95)",
    textShadow: "rgba(0,0,0,0.6)",
  },
  light: {
    mapBackground: "rgba(245,245,245,0.60)",
    prefectureStroke: "rgba(60,60,60,0.55)",
    routeStroke: "#d63b3b",
    markerFill: "#d63b3b",
    markerStroke: "rgba(255,255,255,0.95)",
    textBackground: "rgba(245,245,245,0.60)",
    textFill: "rgba(20,20,20,0.95)",
    textShadow: "rgba(255,255,255,0.7)",
  },
};

type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

interface PrefectureFeature {
  geometry: GeoJsonGeometry;
}

let japanCache: { features: PrefectureFeature[] } | null = null;

async function loadJapan() {
  if (!japanCache) {
    const resp = await fetch("japan.geojson");
    japanCache = (await resp.json()) as { features: PrefectureFeature[] };
  }
  return japanCache;
}

function formatCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  const latDeg = Math.abs(lat).toFixed(4);
  const lonDeg = Math.abs(lon).toFixed(4);
  return `${latDeg}°${latDir}  ${lonDeg}°${lonDir}`;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

function buildBounds(features: Feature[]) {
  const points = features.flatMap((f) => (f.type === "Point" ? [f.coordinates] : f.coordinates));
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const padX = (Math.max(...lons) - Math.min(...lons)) * 0.1 + 0.05;
  const padY = (Math.max(...lats) - Math.min(...lats)) * 0.1 + 0.05;
  return {
    minLon: Math.min(...lons) - padX,
    maxLon: Math.max(...lons) + padX,
    minLat: Math.min(...lats) - padY,
    maxLat: Math.max(...lats) + padY,
  };
}

function makeProjector(bounds: ReturnType<typeof buildBounds>, x: number, y: number, w: number, h: number) {
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const cosLat = Math.cos((centerLat * Math.PI) / 180);

  const minPX = bounds.minLon * cosLat;
  const maxPX = bounds.maxLon * cosLat;
  const minPY = -bounds.maxLat;
  const maxPY = -bounds.minLat;

  const scaleX = w / (maxPX - minPX);
  const scaleY = h / (maxPY - minPY);
  const scale = Math.min(scaleX, scaleY);

  const offX = x + (w - (maxPX - minPX) * scale) / 2;
  const offY = y + (h - (maxPY - minPY) * scale) / 2;

  return (lon: number, lat: number): [number, number] => [
    (lon * cosLat - minPX) * scale + offX,
    (-lat - minPY) * scale + offY,
  ];
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  project: (lon: number, lat: number) => [number, number],
) {
  if (ring.length < 2) return;
  const [x0, y0] = project(ring[0][0], ring[0][1]);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < ring.length; i++) {
    const [x, y] = project(ring[i][0], ring[i][1]);
    ctx.lineTo(x, y);
  }
}

type ImageSource = HTMLImageElement | ImageBitmap;

function imageSize(src: ImageSource): { width: number; height: number } {
  return "naturalWidth" in src
    ? { width: src.naturalWidth, height: src.naturalHeight }
    : { width: src.width, height: src.height };
}

function tryNativeLoad(file: Blob, mimeType?: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const blob = mimeType ? new Blob([file], { type: mimeType }) : file;
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function isHeic(file: File): boolean {
  return (
    file.type === "image/heic" || file.type === "image/heif" || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)
  );
}

interface ImageDecoderApi {
  new (init: { data: ReadableStream; type: string }): { decode: () => Promise<{ image: VideoFrame }> };
  isTypeSupported: (type: string) => Promise<boolean>;
}

async function tryImageDecoder(file: File): Promise<ImageBitmap | null> {
  const ImageDecoder = (window as Window & { ImageDecoder?: ImageDecoderApi }).ImageDecoder;
  if (typeof ImageDecoder === "undefined") {
    console.warn("[HEIC] ImageDecoder API unavailable");
    return null;
  }
  const supported: boolean = await ImageDecoder.isTypeSupported("image/heic");
  if (!supported) {
    console.warn("[HEIC] ImageDecoder: image/heic not supported");
    return null;
  }
  try {
    const decoder = new ImageDecoder({ data: file.stream(), type: "image/heic" });
    const { image } = await decoder.decode();
    return await createImageBitmap(image);
  } catch (e) {
    console.warn("[HEIC] ImageDecoder failed:", e);
    return null;
  }
}

async function tryLibheif(file: File): Promise<ImageBitmap | null> {
  try {
    const mod = (await import("libheif-js")) as unknown as { default?: unknown } & Record<string, unknown>;
    // asm.js ビルドは同期初期化なので .default をそのまま使う
    const libheif = (mod.default ?? mod) as Record<string, unknown>;
    const { HeifDecoder } = libheif;

    if (typeof HeifDecoder !== "function") {
      console.warn("[HEIC] libheif-js: HeifDecoder not a function");
      return null;
    }

    interface HeifImage {
      get_width: () => number;
      get_height: () => number;
      display: (
        canvas: { data: Uint8ClampedArray; width: number; height: number },
        cb: (d: { data: Uint8ClampedArray } | null) => void,
      ) => void;
    }
    const buffer = await file.arrayBuffer();
    const images: HeifImage[] = new (HeifDecoder as new () => { decode: (data: Uint8Array) => HeifImage[] })().decode(
      new Uint8Array(buffer),
    );
    if (!images?.length) {
      console.warn("[HEIC] libheif-js: no images decoded");
      return null;
    }

    const img = images[0];
    const width: number = img.get_width();
    const height: number = img.get_height();

    const imageData = await new Promise<ImageData>((resolve, reject) => {
      img.display(
        { data: new Uint8ClampedArray(width * height * 4), width, height },
        (d: { data: Uint8ClampedArray } | null) => {
          if (!d) {
            reject(new Error("display failed"));
            return;
          }
          resolve(new ImageData(new Uint8ClampedArray(d.data.buffer as ArrayBuffer), width, height));
        },
      );
    });

    return await createImageBitmap(imageData);
  } catch (e) {
    console.warn("[HEIC] libheif-js failed:", e);
    return null;
  }
}

async function loadImage(file: File): Promise<ImageSource> {
  const a = await tryNativeLoad(file);
  if (a) return a;

  if (!isHeic(file)) {
    throw new Error("画像を読み込めませんでした。");
  }

  const b = await tryNativeLoad(file, "image/heic");
  if (b) return b;

  const c = await tryImageDecoder(file);
  if (c) return c;

  const d = await tryLibheif(file);
  if (d) return d;

  throw new Error("画像を読み込めませんでした。JPEG または PNG に変換してからお試しください。");
}

interface TextLine {
  text: string;
  size: number;
  bold?: boolean;
}

function cornerOffset(
  corner: Corner,
  W: number,
  H: number,
  w: number,
  h: number,
  pad: number,
): { x: number; y: number } {
  const x = corner.endsWith("right") ? W - w - pad : pad;
  const y = corner.startsWith("bottom") ? H - h - pad : pad;
  return { x, y };
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  exif: ExifData,
  W: number,
  H: number,
  position: Corner,
  showCoordinates: boolean,
  palette: ThemePalette,
) {
  const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const baseSize = Math.round(W * 0.022);
  const PAD = Math.round(baseSize * 0.8);
  const BOX_PAD = Math.round(baseSize * 0.7);
  const CORNER = 12;

  const lines: TextLine[] = [];
  if (title) lines.push({ text: title, size: Math.round(baseSize * 1.4), bold: true });
  if (subtitle) lines.push({ text: subtitle, size: Math.round(baseSize * 1.0) });
  if (exif.DateTimeOriginal) lines.push({ text: formatDate(exif.DateTimeOriginal), size: Math.round(baseSize * 0.85) });
  if (showCoordinates && exif.latitude != null && exif.longitude != null)
    lines.push({ text: formatCoords(exif.latitude, exif.longitude), size: Math.round(baseSize * 0.85) });

  if (lines.length === 0) return;

  ctx.save();
  ctx.textBaseline = "top";

  // 各行の高さと最大幅を計算
  const measured = lines.map((l) => {
    ctx.font = `${l.bold ? "bold " : ""}${l.size}px ${FONT}`;
    return { ...l, w: ctx.measureText(l.text).width, h: Math.round(l.size * 1.5) };
  });
  const boxW = Math.max(...measured.map((l) => l.w)) + BOX_PAD * 2;
  const boxH = measured.reduce((s, l) => s + l.h, 0) + BOX_PAD * 2;
  const { x: boxX, y: boxY } = cornerOffset(position, W, H, boxW, boxH, PAD);

  // 地図ボックスと同じ背景色・透明度
  ctx.fillStyle = palette.textBackground;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(boxX, boxY, boxW, boxH, CORNER);
  } else {
    ctx.rect(boxX, boxY, boxW, boxH);
  }
  ctx.fill();

  // テキスト描画
  ctx.shadowColor = palette.textShadow;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  let curY = boxY + BOX_PAD;
  for (const l of measured) {
    ctx.font = `${l.bold ? "bold " : ""}${l.size}px ${FONT}`;
    ctx.fillStyle = palette.textFill;
    ctx.fillText(l.text, boxX + BOX_PAD, curY);
    curY += l.h;
  }
  ctx.restore();
}

export interface RenderOptions {
  title?: string;
  subtitle?: string;
  textPosition?: Corner;
  mapPosition?: Corner;
  showCoordinates?: boolean;
  theme?: Theme;
}

export async function render(
  canvas: HTMLCanvasElement,
  imageFile: File,
  features: Feature[],
  options: RenderOptions = {},
): Promise<void> {
  const {
    title = "",
    subtitle = "",
    textPosition = "top-left",
    mapPosition = "bottom-right",
    showCoordinates = true,
    theme = "dark",
  } = options;
  const palette = THEMES[theme];

  const [japan, photo, exif] = await Promise.all([loadJapan(), loadImage(imageFile), readExif(imageFile)]);

  // キャンバスサイズを写真に合わせる（最大幅 960px）
  const MAX_W = 960;
  const { width: nw, height: nh } = imageSize(photo);
  const scale = Math.min(1, MAX_W / nw);
  const W = Math.round(nw * scale);
  const H = Math.round(nh * scale);
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  // 写真を背景に描画
  ctx.drawImage(photo as CanvasImageSource, 0, 0, W, H);
  if ("close" in photo) photo.close();

  // 地図エリア：1/3 × 1/3 のコーナーインセット
  const mapW = Math.round(W / 3);
  const mapH = Math.round(H / 3);
  const MAP_PAD = 16;
  const { x: mapX, y: mapY } = cornerOffset(mapPosition, W, H, mapW, mapH, MAP_PAD);

  // 地図背景（角丸）
  const r = 12;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, r);
  ctx.clip();

  ctx.fillStyle = palette.mapBackground;
  ctx.fillRect(mapX, mapY, mapW, mapH);

  // 都道府県境界
  const bounds = buildBounds(features);
  const INNER_PAD = 14;
  const project = makeProjector(bounds, mapX + INNER_PAD, mapY + INNER_PAD, mapW - INNER_PAD * 2, mapH - INNER_PAD * 2);

  ctx.strokeStyle = palette.prefectureStroke;
  ctx.lineWidth = 1.4;
  for (const feature of japan.features) {
    const geom = feature.geometry;
    const polys: number[][][][] = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) {
      for (const ring of poly) {
        ctx.beginPath();
        drawRing(ctx, ring, project);
        ctx.stroke();
      }
    }
  }

  // ルート（LineString）
  ctx.strokeStyle = palette.routeStroke;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const f of features) {
    if (f.type !== "LineString") continue;
    ctx.beginPath();
    const [x0, y0] = project(f.coordinates[0][0], f.coordinates[0][1]);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < f.coordinates.length; i++) {
      const [x, y] = project(f.coordinates[i][0], f.coordinates[i][1]);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // GPS 位置マーカー
  if (exif.latitude != null && exif.longitude != null) {
    const [px, py] = project(exif.longitude, exif.latitude);
    const r = Math.max(4, Math.round(Math.min(mapW, mapH) * 0.03));
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = palette.markerFill;
    ctx.fill();
    ctx.strokeStyle = palette.markerStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();

  // テキストオーバーレイ
  drawTextOverlay(ctx, title, subtitle, exif, W, H, textPosition, showCoordinates, palette);
}
