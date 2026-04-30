import { DropArea } from "../components/DropArea";

interface Props {
  photoFile: File | null;
  kmzFile: File | null;
  onPhotoChange: (file: File) => void;
  onKmzChange: (file: File) => void;
  onNext: () => void;
}

export function UploadForm({ photoFile, kmzFile, onPhotoChange, onKmzChange, onNext }: Props) {
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

      <div className="wizard-nav">
        <button type="button" className="primary-btn" disabled={!canProceed} onClick={onNext}>
          次へ
        </button>
      </div>
    </>
  );
}
