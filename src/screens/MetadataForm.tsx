import { useState } from "react";
import type { Corner, Theme } from "../types";

interface Props {
  initialTitle: string;
  initialSubtitle: string;
  initialTextPosition: Corner;
  initialMapPosition: Corner;
  initialShowCoordinates: boolean;
  initialTheme: Theme;
  onCancel: () => void;
  onApply: (next: {
    title: string;
    subtitle: string;
    textPosition: Corner;
    mapPosition: Corner;
    showCoordinates: boolean;
    theme: Theme;
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
  onCancel,
  onApply,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [textPosition, setTextPosition] = useState<Corner>(initialTextPosition);
  const [mapPosition, setMapPosition] = useState<Corner>(initialMapPosition);
  const [showCoordinates, setShowCoordinates] = useState(initialShowCoordinates);
  const [theme, setTheme] = useState<Theme>(initialTheme);

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
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            {THEME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="wizard-nav">
        <button type="button" className="secondary-btn" onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={() => onApply({ title, subtitle, textPosition, mapPosition, showCoordinates, theme })}
        >
          適用
        </button>
      </div>
    </>
  );
}
