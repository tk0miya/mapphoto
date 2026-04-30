import { useState } from "react";
import type { Corner } from "../types";

interface Props {
  initialTitle: string;
  initialSubtitle: string;
  initialTextPosition: Corner;
  initialMapPosition: Corner;
  initialShowCoordinates: boolean;
  onCancel: () => void;
  onApply: (next: {
    title: string;
    subtitle: string;
    textPosition: Corner;
    mapPosition: Corner;
    showCoordinates: boolean;
  }) => void;
}

const CORNER_OPTIONS: { value: Corner; label: string }[] = [
  { value: "top-left", label: "左上" },
  { value: "top-right", label: "右上" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-right", label: "右下" },
];

export function MetadataForm({
  initialTitle,
  initialSubtitle,
  initialTextPosition,
  initialMapPosition,
  initialShowCoordinates,
  onCancel,
  onApply,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [textPosition, setTextPosition] = useState<Corner>(initialTextPosition);
  const [mapPosition, setMapPosition] = useState<Corner>(initialMapPosition);
  const [showCoordinates, setShowCoordinates] = useState(initialShowCoordinates);

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
      </div>

      <div className="wizard-nav">
        <button type="button" className="secondary-btn" onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={() => onApply({ title, subtitle, textPosition, mapPosition, showCoordinates })}
        >
          適用
        </button>
      </div>
    </>
  );
}
