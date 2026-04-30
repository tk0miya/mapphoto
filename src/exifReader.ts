// 写真ファイルから EXIF（GPS と撮影日時）を読み出す。
//
// JPEG は exifr で素直に読めるが、HEIC は exifr が失敗するケースが多いため
// TIFF ヘッダーを手動で走査して GPS / DateTimeOriginal を取り出す。

import * as exifr from "exifr";

export interface ExifData {
  latitude?: number;
  longitude?: number;
  DateTimeOriginal?: Date;
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

  // HEIC など: TIFF ヘッダーをスキャンして直接パース
  const scan = new Uint8Array(buf, 0, Math.min(buf.byteLength, 2 * 1024 * 1024));
  for (let i = 0; i < scan.length - 8; i++) {
    const isLE = scan[i] === 0x49 && scan[i + 1] === 0x49 && scan[i + 2] === 0x2a && scan[i + 3] === 0x00;
    const isBE = scan[i] === 0x4d && scan[i + 1] === 0x4d && scan[i + 2] === 0x00 && scan[i + 3] === 0x2a;
    if (isLE || isBE) {
      const r = parseTiffExif(buf.slice(i));
      if (r.latitude != null || r.DateTimeOriginal != null) {
        console.log("[EXIF] manual parse at offset", i, ":", r);
        return r;
      }
    }
  }

  console.warn("[EXIF] no data found");
  return {};
}
