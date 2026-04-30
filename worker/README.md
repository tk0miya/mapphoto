# mapphoto-kml-proxy

Google My Maps の KML を CORS 付きで取得するための Cloudflare Worker。
`google.com/maps/d/kml` へのリクエストを `forcekml=1` 付きで中継するだけのホワイトリスト型プロキシ。

## デプロイ

```sh
npm install -g wrangler
wrangler login
wrangler deploy
```

デプロイ後の URL（例: `https://mapphoto-kml-proxy.<account>.workers.dev`）を、
`src/mapsUrl.ts` の `PROXY_URL` 定数に設定する。

## 許可オリジン

`worker.js` の `ALLOWED_ORIGINS` に列挙したオリジンのみ CORS を許可する。
別ドメインで運用する場合は追加すること。

## 動作確認

```sh
curl -i "https://<your-worker-url>/?mid=<my-maps-id>"
```

Google が KML を返せば 200、`mid` が空・不正なら 400。
