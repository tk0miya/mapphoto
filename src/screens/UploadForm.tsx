import { DropArea } from "../components/DropArea";

interface Props {
  photoFile: File | null;
  kmzFile: File | null;
  title: string;
  subtitle: string;
  onPhotoChange: (file: File) => void;
  onKmzChange: (file: File) => void;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onNext: () => void;
}

export function UploadForm({
  photoFile,
  kmzFile,
  title,
  subtitle,
  onPhotoChange,
  onKmzChange,
  onTitleChange,
  onSubtitleChange,
  onNext,
}: Props) {
  const canProceed = photoFile !== null && kmzFile !== null;

  return (
    <>
      <div className="inputs">
        <DropArea
          icon="📷"
          label={
            <>
              写真をドロップ
              <br />
              またはクリックして選択
            </>
          }
          accept="image/*"
          fileName={photoFile?.name ?? null}
          onFile={onPhotoChange}
        />
        <DropArea
          icon="🗺️"
          label={
            <>
              KMZ をドロップ
              <br />
              またはクリックして選択
            </>
          }
          accept=".kmz"
          fileName={kmzFile?.name ?? null}
          onFile={onKmzChange}
        />
      </div>

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
        <button type="button" className="primary-btn" disabled={!canProceed} onClick={onNext}>
          次へ
        </button>
      </div>
    </>
  );
}
