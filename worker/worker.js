// Cloudflare Worker: Google My Maps KML プロキシ
//
// フロントエンドから ?mid=...&lid=... を受け取り、
// https://www.google.com/maps/d/kml?mid=...&forcekml=1[&lid=...] に転送して
// 適切な CORS ヘッダを付けて返すだけのホワイトリスト型プロキシ。
//
// デプロイ: `wrangler deploy`
// （wrangler.toml は worker/ 配下に同梱）

const ALLOWED_ORIGINS = new Set(["https://tk0miya.github.io", "http://localhost:5173", "http://127.0.0.1:5173"]);

function corsHeaders(origin) {
  if (!ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "GET") {
      return new Response("method not allowed", { status: 405, headers: cors });
    }

    const url = new URL(request.url);
    const mid = url.searchParams.get("mid");
    const lid = url.searchParams.get("lid");

    if (!mid || !/^[\w-]{10,}$/.test(mid)) {
      return new Response("invalid mid", { status: 400, headers: cors });
    }
    if (lid && !/^[\w-]+$/.test(lid)) {
      return new Response("invalid lid", { status: 400, headers: cors });
    }

    const target = new URL("https://www.google.com/maps/d/kml");
    target.searchParams.set("mid", mid);
    target.searchParams.set("forcekml", "1");
    if (lid) target.searchParams.set("lid", lid);

    const upstream = await fetch(target.toString(), {
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    const headers = new Headers(cors);
    headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/vnd.google-earth.kml+xml");
    headers.set("Cache-Control", "public, max-age=300");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  },
};
