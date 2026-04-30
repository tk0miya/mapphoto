// 元ファイルの EXIF を引き継ぎつつ、合成画像に合わせて一部タグを上書きして
// PNG の eXIf チャンクとして埋め込む。

import { dump, type IExif, load, TagValues } from "exif-library";
import encodeChunks from "png-chunks-encode";
import extractChunks from "png-chunks-extract";

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
