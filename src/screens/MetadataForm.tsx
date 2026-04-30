import type { Corner } from "../types";

interface Props {
  title: string;
  subtitle: string;
  textPosition: Corner;
  mapPosition: Corner;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onTextPositionChange: (value: Corner) => void;
  onMapPositionChange: (value: Corner) => void;
  onBack: () => void;
  onNext: () => void;
}

const CORNER_OPTIONS: { value: Corner; label: string }[] = [
  { value: "top-left", label: "左上" },
  { value: "top-right", label: "右上" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-right", label: "右下" },
];

export function MetadataForm({
  title,
  subtitle,
  textPosition,
  mapPosition,
  onTitleChange,
  onSubtitleChange,
  onTextPositionChange,
  onMapPositionChange,
  onBack,
  onNext,
}: Props) {
  return (
    <>
      <div className="text-inputs">
        <input
          type="text"
          placeholder="タイトル（省略可）"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <input
          type="text"
          placeholder="サブタイトル（省略可）"
          value={subtitle}
          onChange={(e) => onSubtitleChange(e.target.value)}
        />

        <label className="form-row">
          <span>テキスト情報表示位置</span>
          <select value={textPosition} onChange={(e) => onTextPositionChange(e.target.value as Corner)}>
            {CORNER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-row">
          <span>地図表示位置</span>
          <select value={mapPosition} onChange={(e) => onMapPositionChange(e.target.value as Corner)}>
            {CORNER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="wizard-nav">
        <button type="button" className="secondary-btn" onClick={onBack}>
          戻る
        </button>
        <button type="button" className="primary-btn" onClick={onNext}>
          次へ
        </button>
      </div>
    </>
  );
}
