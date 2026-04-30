// GPS 座標から「名所 @ 市区町村」形式の地名を解決する。
//
// 国土地理院（GSI）の逆ジオコーダで市区町村を、Wikipedia の geosearch で
// 周辺の名所・スポット名を取得し、合成する。両者ともに無料・登録不要・CORS 対応。
//
// 失敗時は静かに undefined を返し、座標表示にフォールバックさせる方針。

const GSI_REVERSE_URL = "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress";
const GSI_MUNI_URL = "https://maps.gsi.go.jp/js/muni.js";
const WIKIPEDIA_URL = "https://ja.wikipedia.org/w/api.php";

// Wikipedia の半径（m）。狭すぎると駅前のお店等で外し、広すぎると無関係な記事を拾う。
const WIKIPEDIA_RADIUS_M = 500;

export interface PlaceInfo {
  poi?: string; // Wikipedia の最寄り記事タイトル（例: 東京タワー）
  city?: string; // 市区町村（例: 港区）
}

let muniTablePromise: Promise<Map<string, string>> | null = null;
const lookupCache = new Map<string, Promise<PlaceInfo>>();

// muni.js の中身は GSI.MUNI_ARRAY[code] = '都道府県コード,都道府県名,市区町村コード,市区町村名';
// の繰り返し。code は文字列・数値の両形式が観測されているため、いずれも受ける。
export function parseMuniTable(text: string): Map<string, string> {
  const table = new Map<string, string>();
  const re = /GSI\.MUNI_ARRAY\[\s*['"]?(\d+)['"]?\s*\]\s*=\s*['"]([^'"]+)['"]/g;
  for (const m of text.matchAll(re)) {
    const code = m[1].padStart(5, "0");
    const parts = m[2].split(",");
    if (parts.length >= 4 && parts[3]) {
      table.set(code, parts[3]);
    }
  }
  return table;
}

async function loadMuniTable(): Promise<Map<string, string>> {
  if (!muniTablePromise) {
    muniTablePromise = (async () => {
      try {
        const resp = await fetch(GSI_MUNI_URL);
        if (!resp.ok) return new Map<string, string>();
        return parseMuniTable(await resp.text());
      } catch {
        return new Map<string, string>();
      }
    })();
  }
  return muniTablePromise;
}

interface GsiResult {
  muniCd?: string;
}

async function reverseGeocodeGsi(lat: number, lon: number): Promise<GsiResult> {
  try {
    const url = `${GSI_REVERSE_URL}?lat=${lat}&lon=${lon}`;
    const resp = await fetch(url);
    if (!resp.ok) return {};
    const data = (await resp.json()) as { results?: GsiResult };
    return data.results ?? {};
  } catch {
    return {};
  }
}

interface GeoSearchItem {
  title: string;
  dist: number;
}

async function searchWikipediaNearby(lat: number, lon: number): Promise<string | undefined> {
  try {
    const params = new URLSearchParams({
      action: "query",
      list: "geosearch",
      gscoord: `${lat}|${lon}`,
      gsradius: String(WIKIPEDIA_RADIUS_M),
      gslimit: "5",
      format: "json",
      origin: "*",
    });
    const resp = await fetch(`${WIKIPEDIA_URL}?${params}`);
    if (!resp.ok) return undefined;
    const data = (await resp.json()) as { query?: { geosearch?: GeoSearchItem[] } };
    const items = data.query?.geosearch ?? [];
    if (items.length === 0) return undefined;
    // dist は Wikipedia 側で昇順だが念のためソート
    items.sort((a, b) => a.dist - b.dist);
    return items[0].title;
  } catch {
    return undefined;
  }
}

export async function lookupPlace(lat: number, lon: number): Promise<PlaceInfo> {
  // 100m 程度の精度でメモ化（同一写真で複数回呼ばれるケース対策）
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = lookupCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const [gsi, poi, muni] = await Promise.all([
      reverseGeocodeGsi(lat, lon),
      searchWikipediaNearby(lat, lon),
      loadMuniTable(),
    ]);
    const info: PlaceInfo = {};
    if (poi) info.poi = poi;
    if (gsi.muniCd) {
      const city = muni.get(String(gsi.muniCd).padStart(5, "0"));
      if (city) info.city = city;
    }
    return info;
  })();
  lookupCache.set(key, promise);
  return promise;
}

// オーバーレイに表示する 1 行を組み立てる。
// 優先順:
//  1. "名所 @ 市区町村"  （両方取れた）
//  2. "名所"             （市区町村は取れなかった）
//  3. "市区町村"
//  該当なしは undefined
export function formatPlace(info: PlaceInfo): string | undefined {
  if (info.poi && info.city) return `${info.poi} @ ${info.city}`;
  if (info.poi) return info.poi;
  if (info.city) return info.city;
  return undefined;
}
