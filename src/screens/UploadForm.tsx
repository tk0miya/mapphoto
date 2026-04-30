import { DropArea } from "../components/DropArea";
import { isProxyConfigured, parseMapsUrl } from "../mapsUrl";

interface Props {
  photoFile: File | null;
  kmzFile: File | null;
  kmzUrl: string;
  onPhotoChange: (file: File) => void;
  onKmzChange: (file: File) => void;
  onKmzUrlChange: (value: string) => void;
  onGenerate: () => void;
}

export function UploadForm({
  photoFile,
  kmzFile,
  kmzUrl,
  onPhotoChange,
  onKmzChange,
  onKmzUrlChange,
  onGenerate,
}: Props) {
  const proxyEnabled = isProxyConfigured();
  const urlParts = proxyEnabled ? parseMapsUrl(kmzUrl) : null;
  const hasMapSource = kmzFile !== null || urlParts !== null;
  const canProceed = photoFile !== null && hasMapSource;

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

      {proxyEnabled && (
        <div className="text-inputs">
          <div className="or-divider">または</div>
          <input
            type="url"
            placeholder="Google マイマップ URL を貼り付け"
            value={kmzUrl}
            onChange={(e) => onKmzUrlChange(e.target.value)}
          />
        </div>
      )}

      <div className="wizard-nav">
        <button type="button" className="primary-btn" disabled={!canProceed} onClick={onGenerate}>
          生成
        </button>
      </div>
    </>
  );
}
