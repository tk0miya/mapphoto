// Google フォトから「元のサイズ」でダウンロードすると、写真が複数枚 zip に
// まとめられることが多い。zip を受け取ったら中の画像を取り出して扱えるようにする。
//
// このアプリは写真 1 枚を主役に置く構成のため、zip に複数枚入っていても
// ファイル名順で先頭の 1 枚だけを採用する。

import JSZip from "jszip";

// 拡張子から画像かどうかを判定する。zip にはサムネイルやメタデータ JSON が
// 混ざることがあるため、画像エントリだけを取り出すのに使う。
const PHOTO_EXTENSION = /\.(jpe?g|heic|heif|png|webp|gif|tiff?|bmp)$/i;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  heic: "image/heic",
  heif: "image/heif",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
};

function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

function mimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "";
}

// 先頭バイトが ZIP のマジックバイト "PK\x03\x04" かどうかを判定する。
// 拡張子や MIME は信用せず実体で見る（KMZ も同じ判定を kmz.ts で行っている）。
async function isZip(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b;
}

// 写真ファイルを解決する。zip の場合は中の画像をファイル名順に並べ、
// 先頭の 1 枚を File として取り出す。zip でなければ入力をそのまま返す。
export async function resolvePhotoFile(file: File): Promise<File> {
  if (!(await isZip(file))) return file;

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .filter((entry) => {
      const name = baseName(entry.name);
      // AppleDouble（._foo）などドット始まりのゴミエントリを除外する。
      // 本物と同じ拡張子を持ち、ソートで先頭に来てしまうため拡張子だけでは弾けない。
      return !name.startsWith(".") && PHOTO_EXTENSION.test(name);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const first = entries[0];
  if (!first) throw new Error("zip 内に画像が見つかりませんでした");

  const name = baseName(first.name);
  const blob = await first.async("blob");
  // JSZip の blob は type が空のことがあるため拡張子から補完する。
  // HEIC 判定はファイル名でもフォールバックされるが念のため両方そろえる。
  return new File([blob], name, { type: blob.type || mimeFromName(name) });
}
