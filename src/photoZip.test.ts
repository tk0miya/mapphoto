import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { resolvePhotoFile } from "./photoZip";

async function makeZip(files: Record<string, string>): Promise<File> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "download.zip", { type: "application/zip" });
}

describe("resolvePhotoFile", () => {
  it("zip でないファイルはそのまま返す", async () => {
    const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], "photo.jpg", { type: "image/jpeg" });
    expect(await resolvePhotoFile(photo)).toBe(photo);
  });

  it("zip 内の画像をファイル名順で先頭 1 枚取り出す", async () => {
    const zip = await makeZip({ "b.jpg": "second", "a.jpg": "first" });
    const result = await resolvePhotoFile(zip);
    expect(result.name).toBe("a.jpg");
    expect(await result.text()).toBe("first");
    expect(result.type).toBe("image/jpeg");
  });

  it("ネストしたパスでもファイル名だけを採用する", async () => {
    const zip = await makeZip({ "Takeout/Google Photos/IMG_0001.HEIC": "heic-data" });
    const result = await resolvePhotoFile(zip);
    expect(result.name).toBe("IMG_0001.HEIC");
    expect(result.type).toBe("image/heic");
  });

  it("画像以外のエントリ（JSON など）は無視する", async () => {
    const zip = await makeZip({ "IMG_0001.jpg.json": "{}", "IMG_0001.jpg": "photo" });
    const result = await resolvePhotoFile(zip);
    expect(result.name).toBe("IMG_0001.jpg");
  });

  it("AppleDouble（._foo）などドット始まりのエントリを除外する", async () => {
    const zip = await makeZip({ "sub/._real.jpg": "junk", "._real.jpg": "junk", "real.jpg": "photo" });
    const result = await resolvePhotoFile(zip);
    expect(result.name).toBe("real.jpg");
    expect(await result.text()).toBe("photo");
  });

  it("画像が 1 枚もなければエラーにする", async () => {
    const zip = await makeZip({ "metadata.json": "{}", "readme.txt": "hi" });
    await expect(resolvePhotoFile(zip)).rejects.toThrow("画像が見つかりません");
  });
});
