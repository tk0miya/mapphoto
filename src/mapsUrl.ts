// Google マイマップの URL を解釈し、プロキシ経由で KML/KMZ を取得する。

// Cloudflare Worker（worker/）をデプロイした URL に書き換える。
// 空文字のままだと URL 入力欄は表示されず、KMZ ファイル方式のみ有効になる。
const PROXY_URL = "https://mapphoto-kml-proxy.i-tkomiya.workers.dev";

export type MapsUrlParts = {
  mid: string;
  lid?: string;
};

export function isProxyConfigured(): boolean {
  return PROXY_URL !== "";
}

export function parseMapsUrl(input: string): MapsUrlParts | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  // google.com / google.co.jp の /maps/d/ 配下のみ受け付ける
  if (!/(^|\.)google\.(com|co\.jp)$/.test(url.hostname)) return null;
  if (!url.pathname.includes("/maps/d/")) return null;

  const mid = url.searchParams.get("mid");
  if (!mid) return null;

  const lid = url.searchParams.get("lid") ?? undefined;
  return { mid, lid };
}

export async function fetchMapSource(parts: MapsUrlParts): Promise<ArrayBuffer> {
  const proxy = new URL(PROXY_URL);
  proxy.searchParams.set("mid", parts.mid);
  if (parts.lid) proxy.searchParams.set("lid", parts.lid);

  const res = await fetch(proxy.toString());
  if (!res.ok) {
    throw new Error(`KML 取得に失敗 (HTTP ${res.status})`);
  }
  return res.arrayBuffer();
}
