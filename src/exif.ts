// 写真ファイルから EXIF を読み出し（撮影日時・GPS）、合成画像へは
// 元の EXIF を引き継ぎつつ一部タグを上書きして PNG の eXIf チャンクとして埋め込む。

import { dump, type IExif, load, TagValues } from "exif-library";
import * as exifr from "exifr";
import encodeChunks from "png-chunks-encode";
import extractChunks from "png-chunks-extract";

export interface ExifData {
  latitude?: number;
  longitude?: number;
  DateTimeOriginal?: Date;
}

export interface ExifOverrides {
  width: number;
  height: number;
  imageDescription?: string;
}

// HEIC 等に埋め込まれた TIFF の先頭オフセットを探す。
function findTiffOffset(buf: Uint8Array): number {
  const limit = Math.min(buf.length - 8, 2 * 1024 * 1024);
  for (let i = 0; i < limit; i++) {
    const isLE = buf[i] === 0x49 && buf[i + 1] === 0x49 && buf[i + 2] === 0x2a && buf[i + 3] === 0x00;
    const isBE = buf[i] === 0x4d && buf[i + 1] === 0x4d && buf[i + 2] === 0x00 && buf[i + 3] === 0x2a;
    if (isLE || isBE) return i;
  }
  return -1;
}

function bytesToBinaryString(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function binaryStringToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function parseTiffExif(buf: ArrayBuffer): ExifData {
  const b = new Uint8Array(buf);
  if (b.length < 8) return {};
  const le = b[0] === 0x49 && b[1] === 0x49;
  if (!le && !(b[0] === 0x4d && b[1] === 0x4d)) return {};

  const u16 = (o: number): number => (o + 2 > b.length ? 0 : le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
  const u32 = (o: number): number =>
    o + 4 > b.length
      ? 0
      : le
        ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0
        : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const rational = (o: number): number => {
    if (o + 8 > b.length) return 0;
    const d = u32(o + 4);
    return d ? u32(o) / d : 0;
  };

  const ifd0 = u32(4);
  if (ifd0 + 2 > b.length) return {};
  const nTags = u16(ifd0);

  let gpsOff = 0,
    exifOff = 0;
  for (let i = 0; i < nTags && ifd0 + 2 + (i + 1) * 12 <= b.length; i++) {
    const e = ifd0 + 2 + i * 12;
    const tag = u16(e);
    if (tag === 0x8769) exifOff = u32(e + 8);
    if (tag === 0x8825) gpsOff = u32(e + 8);
  }

  const result: ExifData = {};

  if (exifOff && exifOff + 2 <= b.length) {
    const n = u16(exifOff);
    for (let i = 0; i < n && exifOff + 2 + (i + 1) * 12 <= b.length; i++) {
      const e = exifOff + 2 + i * 12;
      if (u16(e) === 0x9003) {
        const count = u32(e + 4);
        const off = count <= 4 ? e + 8 : u32(e + 8);
        if (off + count <= b.length) {
          const str = String.fromCharCode(...b.slice(off, off + count))
            .replace(/\0/g, "")
            .trim();
          const m = str.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
          if (m) result.DateTimeOriginal = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
        }
      }
    }
  }

  if (gpsOff && gpsOff + 2 <= b.length) {
    const n = u16(gpsOff);
    let latRef = "N",
      lonRef = "E",
      lat = -1,
      lon = -1;
    for (let i = 0; i < n && gpsOff + 2 + (i + 1) * 12 <= b.length; i++) {
      const e = gpsOff + 2 + i * 12;
      const tag = u16(e);
      if (tag === 0x0001 && e + 9 <= b.length) latRef = String.fromCharCode(b[e + 8]);
      if (tag === 0x0003 && e + 9 <= b.length) lonRef = String.fromCharCode(b[e + 8]);
      if (tag === 0x0002) {
        const o = u32(e + 8);
        lat = rational(o) + rational(o + 8) / 60 + rational(o + 16) / 3600;
      }
      if (tag === 0x0004) {
        const o = u32(e + 8);
        lon = rational(o) + rational(o + 8) / 60 + rational(o + 16) / 3600;
      }
    }
    if (lat >= 0) result.latitude = latRef === "S" ? -lat : lat;
    if (lon >= 0) result.longitude = lonRef === "W" ? -lon : lon;
  }

  return result;
}

export async function readExif(file: File): Promise<ExifData> {
  const buf = await file.arrayBuffer();

  // JPEG など: exifr で試みる
  try {
    const all = await exifr.parse(buf, true);
    if (all) {
      const gps = await exifr.gps(buf).catch(() => null);
      const r: ExifData = {
        latitude: gps?.latitude ?? all.latitude,
        longitude: gps?.longitude ?? all.longitude,
        DateTimeOriginal: all.DateTimeOriginal,
      };
      console.log("[EXIF] exifr OK:", r);
      return r;
    }
  } catch {
    /* fall through */
  }

  // HEIC など: TIFF ヘッダーを探して直接パース
  const scan = new Uint8Array(buf);
  const tiffOff = findTiffOffset(scan);
  if (tiffOff >= 0) {
    const r = parseTiffExif(buf.slice(tiffOff));
    if (r.latitude != null || r.DateTimeOriginal != null) {
      console.log("[EXIF] manual parse at offset", tiffOff, ":", r);
      return r;
    }
  }

  console.warn("[EXIF] no data found");
  return {};
}

export function toLocalDateTimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// exif-library の load() は JPEG（FFD8...）か "Exif\0\0..." 前置の文字列のみ
// 受け付けるので、HEIC 等は TIFF を切り出して "Exif\0\0" を付ける。
function loadExif(buf: Uint8Array): IExif | null {
  try {
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      return load(bytesToBinaryString(buf));
    }
    const tiffOff = findTiffOffset(buf);
    if (tiffOff < 0) return null;
    return load(`Exif\x00\x00${bytesToBinaryString(buf.subarray(tiffOff))}`);
  } catch {
    return null;
  }
}

function formatExifDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function applyOverrides(exif: IExif, opts: ExifOverrides): void {
  const ifd0 = exif["0th"] ?? {};
  const exifIfd = exif.Exif ?? {};
  exif["0th"] = ifd0;
  exif.Exif = exifIfd;

  // サムネイル（IFD1）は破棄
  delete exif["1st"];
  delete exif.thumbnail;

  // Orientation = 1（描画時に正立済み。元の値を残すと二重回転する）
  ifd0[TagValues.ImageIFD.Orientation] = 1;

  // ImageWidth / ImageLength（合成後のキャンバスサイズ）
  ifd0[TagValues.ImageIFD.ImageWidth] = opts.width;
  ifd0[TagValues.ImageIFD.ImageLength] = opts.height;

  // PixelXDimension / PixelYDimension（ExifIFD）
  exifIfd[TagValues.ExifIFD.PixelXDimension] = opts.width;
  exifIfd[TagValues.ExifIFD.PixelYDimension] = opts.height;

  // DateTime（変更日時）= 生成時刻
  ifd0[TagValues.ImageIFD.DateTime] = formatExifDateTime(new Date());

  // Software
  ifd0[TagValues.ImageIFD.Software] = "mapphoto";

  // ImageDescription（未設定の場合のみ）
  if (opts.imageDescription && !ifd0[TagValues.ImageIFD.ImageDescription]) {
    ifd0[TagValues.ImageIFD.ImageDescription] = opts.imageDescription;
  }
}

// dump() の出力は "Exif\0\0" + TIFF。eXIf チャンクには TIFF 部分だけを入れる。
function buildTiffBytes(exif: IExif): Uint8Array {
  const dumped = dump(exif);
  return binaryStringToBytes(dumped.slice(6));
}

function injectExifChunk(png: Uint8Array, exif: Uint8Array): Uint8Array {
  const chunks = extractChunks(png);
  // IHDR の直後（先頭から index 1）に eXIf を挿入する。
  chunks.splice(1, 0, { name: "eXIf", data: exif });
  return encodeChunks(chunks);
}

export async function attachExifToPng(pngBlob: Blob, sourceFile: File, opts: ExifOverrides): Promise<Blob> {
  const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
  const exif = loadExif(sourceBytes);
  if (!exif) return pngBlob;

  applyOverrides(exif, opts);
  const tiffBytes = buildTiffBytes(exif);
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  const merged = injectExifChunk(pngBytes, tiffBytes);
  return new Blob([merged as BlobPart], { type: "image/png" });
}
