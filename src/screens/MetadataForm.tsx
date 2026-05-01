import { useState } from "react";
import { FONT_PRESETS, type FontKey } from "../fonts";
import { DEFAULT_BOX_OPACITY } from "../renderer";
import type { Corner, Theme } from "../types";

interface Props {
  initialTitle: string;
  initialSubtitle: string;
  initialTextPosition: Corner;
  initialMapPosition: Corner;
  initialShowCoordinates: boolean;
  initialTheme: Theme;
  initialFont: FontKey;
  initialMapOpacity: number;
  initialTextOpacity: number;
  onCancel: () => void;
  onApply: (next: {
    title: string;
    subtitle: string;
    textPosition: Corner;
    mapPosition: Corner;
    showCoordinates: boolean;
    theme: Theme;
    font: FontKey;
    mapOpacity: number;
    textOpacity: number;
  }) => void;
}

const CORNER_OPTIONS: { value: Corner; label: string }[] = [
  { value: "top-left", label: "左上" },
  { value: "top-right", label: "右上" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-right", label: "右下" },
];

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "dark", label: "ダーク（暗い背景）" },
  { value: "light", label: "ライト（明るい背景）" },
];

export function MetadataForm({
  initialTitle,
  initialSubtitle,
  initialTextPosition,
  initialMapPosition,
  initialShowCoordinates,
  initialTheme,
  initialFont,
  initialMapOpacity,
  initialTextOpacity,
  onCancel,
  onApply,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [textPosition, setTextPosition] = useState<Corner>(initialTextPosition);
  const [mapPosition, setMapPosition] = useState<Corner>(initialMapPosition);
  const [showCoordinates, setShowCoordinates] = useState(initialShowCoordinates);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [font, setFont] = useState<FontKey>(initialFont);
  const [mapOpacity, setMapOpacity] = useState(initialMapOpacity);
  const [textOpacity, setTextOpacity] = useState(initialTextOpacity);
  const sample = title.trim() || subtitle.trim() || "旅の記録 Travel Log";

  const handleThemeChange = (next: Theme) => {
    setMapOpacity(DEFAULT_BOX_OPACITY[next].map);
    setTextOpacity(DEFAULT_BOX_OPACITY[next].text);
    setTheme(next);
  };

  return (
    <>
      <div className="text-inputs">
        <input type="text" placeholder="タイトル（省略可）" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input
          type="text"
          placeholder="サブタイトル（省略可）"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />

        <label className="form-row">
          <span>テキスト情報表示位置</span>
          <select value={textPosition} onChange={(e) => setTextPosition(e.target.value as Corner)}>
            {CORNER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-row">
          <span>地図表示位置</span>
          <select value={mapPosition} onChange={(e) => setMapPosition(e.target.value as Corner)}>
            {CORNER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-row">
          <span>座標を表示</span>
          <input type="checkbox" checked={showCoordinates} onChange={(e) => setShowCoordinates(e.target.checked)} />
        </label>

        <label className="form-row">
          <span>配色テーマ</span>
          <select value={theme} onChange={(e) => handleThemeChange(e.target.value as Theme)}>
            {THEME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-row">
          <span>テキストボックスの不透明度</span>
          <span className="range-control">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={textOpacity}
              onChange={(e) => setTextOpacity(Number(e.target.value))}
            />
            <span className="range-value">{textOpacity.toFixed(2)}</span>
          </span>
        </label>

        <label className="form-row">
          <span>地図ボックスの不透明度</span>
          <span className="range-control">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={mapOpacity}
              onChange={(e) => setMapOpacity(Number(e.target.value))}
            />
            <span className="range-value">{mapOpacity.toFixed(2)}</span>
          </span>
        </label>

        <fieldset className="font-picker">
          <legend>フォント</legend>
          <div className="font-options">
            {FONT_PRESETS.map((p) => (
              <label
                key={p.key}
                className={`font-option${font === p.key ? " selected" : ""}`}
                style={{ fontFamily: p.family }}
              >
                <input
                  type="radio"
                  name="font"
                  value={p.key}
                  checked={font === p.key}
                  onChange={() => setFont(p.key)}
                />
                <span className="font-sample">{sample}</span>
                <span className="font-label">{p.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="wizard-nav">
        <button type="button" className="secondary-btn" onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={() =>
            onApply({
              title,
              subtitle,
              textPosition,
              mapPosition,
              showCoordinates,
              theme,
              font,
              mapOpacity,
              textOpacity,
            })
          }
        >
          適用
        </button>
      </div>
    </>
  );
}
