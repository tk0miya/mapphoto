import type { DateFormat, Metadata, Position } from "../types";

interface Props {
  metadata: Metadata;
  onChange: (next: Metadata) => void;
  onBack: () => void;
  onNext: () => void;
}

const POSITIONS: { value: Position; label: string }[] = [
  { value: "top-left", label: "左上" },
  { value: "top-right", label: "右上" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-right", label: "右下" },
];

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "date", label: "日付のみ" },
  { value: "datetime", label: "日付と時刻" },
  { value: "hidden", label: "表示しない" },
];

export function MetadataForm({ metadata, onChange, onBack, onNext }: Props) {
  const update = <K extends keyof Metadata>(key: K, value: Metadata[K]) => {
    onChange({ ...metadata, [key]: value });
  };

  return (
    <>
      <div className="metadata-form">
        <input
          type="text"
          placeholder="タイトル（省略可）"
          value={metadata.title}
          onChange={(e) => update("title", e.target.value)}
        />
        <input
          type="text"
          placeholder="サブタイトル（省略可）"
          value={metadata.subtitle}
          onChange={(e) => update("subtitle", e.target.value)}
        />

        <label className="field">
          <span>日付</span>
          <input
            type="datetime-local"
            value={metadata.date}
            onChange={(e) => update("date", e.target.value)}
            disabled={metadata.dateFormat === "hidden"}
          />
        </label>

        <label className="field">
          <span>日付フォーマット</span>
          <select value={metadata.dateFormat} onChange={(e) => update("dateFormat", e.target.value as DateFormat)}>
            {DATE_FORMATS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>テキスト情報表示位置</span>
          <select value={metadata.textPosition} onChange={(e) => update("textPosition", e.target.value as Position)}>
            {POSITIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field checkbox">
          <input type="checkbox" checked={metadata.showMap} onChange={(e) => update("showMap", e.target.checked)} />
          <span>地図を表示する</span>
        </label>

        <label className="field">
          <span>地図表示位置</span>
          <select
            value={metadata.mapPosition}
            onChange={(e) => update("mapPosition", e.target.value as Position)}
            disabled={!metadata.showMap}
          >
            {POSITIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
