interface Props {
  title: string;
  subtitle: string;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function MetadataForm({ title, subtitle, onTitleChange, onSubtitleChange, onBack, onNext }: Props) {
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
