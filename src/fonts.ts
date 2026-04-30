export type FontKey =
  | "system"
  | "noto-sans-jp"
  | "noto-serif-jp"
  | "shippori-mincho"
  | "zen-maru-gothic"
  | "klee-one"
  | "rocknroll-one";

export interface FontPreset {
  key: FontKey;
  label: string;
  family: string;
  regularWeight: number;
  boldWeight: number;
}

const SYSTEM_SANS =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Helvetica Neue", Helvetica, Arial, sans-serif';

export const FONT_PRESETS: FontPreset[] = [
  {
    key: "system",
    label: "標準（システム）",
    family: SYSTEM_SANS,
    regularWeight: 400,
    boldWeight: 700,
  },
  {
    key: "noto-sans-jp",
    label: "Noto Sans JP（万能ゴシック）",
    family: `"Noto Sans JP", ${SYSTEM_SANS}`,
    regularWeight: 400,
    boldWeight: 700,
  },
  {
    key: "noto-serif-jp",
    label: "Noto Serif JP（明朝）",
    family: `"Noto Serif JP", serif`,
    regularWeight: 400,
    boldWeight: 700,
  },
  {
    key: "shippori-mincho",
    label: "しっぽり明朝（エレガント）",
    family: `"Shippori Mincho", serif`,
    regularWeight: 400,
    boldWeight: 700,
  },
  {
    key: "zen-maru-gothic",
    label: "Zen Maru Gothic（丸ゴシック）",
    family: `"Zen Maru Gothic", ${SYSTEM_SANS}`,
    regularWeight: 400,
    boldWeight: 700,
  },
  {
    key: "klee-one",
    label: "Klee One（手書き風）",
    family: `"Klee One", ${SYSTEM_SANS}`,
    regularWeight: 400,
    boldWeight: 600,
  },
  {
    key: "rocknroll-one",
    label: "RocknRoll One（タイトル映え）",
    family: `"RocknRoll One", ${SYSTEM_SANS}`,
    regularWeight: 400,
    boldWeight: 400,
  },
];

export const DEFAULT_FONT: FontKey = "system";

export function getFontPreset(key: FontKey): FontPreset {
  return FONT_PRESETS.find((p) => p.key === key) ?? FONT_PRESETS[0];
}

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Noto+Sans+JP:wght@400;700" +
  "&family=Noto+Serif+JP:wght@400;700" +
  "&family=Shippori+Mincho:wght@400;700" +
  "&family=Zen+Maru+Gothic:wght@400;700" +
  "&family=Klee+One:wght@400;600" +
  "&family=RocknRoll+One" +
  "&display=swap";

let webFontsLoaded = false;

export function loadWebFonts(): void {
  if (webFontsLoaded || typeof document === "undefined") return;
  webFontsLoaded = true;

  const preconnect1 = document.createElement("link");
  preconnect1.rel = "preconnect";
  preconnect1.href = "https://fonts.googleapis.com";
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement("link");
  preconnect2.rel = "preconnect";
  preconnect2.href = "https://fonts.gstatic.com";
  preconnect2.crossOrigin = "anonymous";
  document.head.appendChild(preconnect2);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = GOOGLE_FONTS_HREF;
  document.head.appendChild(link);
}

// Google Fonts は unicode-range で動的にサブセットを配信する。
// Canvas 描画前に実際に使う文字を渡して必要なサブセットを確実にロードする。
export async function ensureFontReady(preset: FontPreset, sizes: number[], texts: string[]): Promise<void> {
  if (preset.key === "system" || typeof document === "undefined" || !document.fonts) return;
  const text = texts.filter(Boolean).join("");
  if (!text) return;

  const weights = new Set([preset.regularWeight, preset.boldWeight]);
  const tasks: Promise<unknown>[] = [];
  for (const w of weights) {
    for (const s of sizes) {
      tasks.push(document.fonts.load(`${w} ${s}px ${preset.family}`, text));
    }
  }
  try {
    await Promise.all(tasks);
  } catch {
    // 失敗してもシステムフォントへフォールバックして描画は続行
  }
}
