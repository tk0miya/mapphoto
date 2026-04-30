import type { RefObject } from "react";
import { MapPreview } from "../components/MapPreview";

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: string;
  loading: boolean;
  rendered: boolean;
  onOpenSettings: () => void;
  onDownload: () => void;
  onStartOver: () => void;
}

export function ResultView({ canvasRef, status, loading, rendered, onOpenSettings, onDownload, onStartOver }: Props) {
  return (
    <>
      <p className="status">{status}</p>
      <MapPreview ref={canvasRef} visible={true} loading={loading} />

      <div className="wizard-nav">
        <button type="button" className="secondary-btn" onClick={onStartOver}>
          他の画像を生成する
        </button>
        <button type="button" className="secondary-btn" onClick={onOpenSettings}>
          出力設定
        </button>
        <button type="button" className="primary-btn" disabled={!rendered || loading} onClick={onDownload}>
          ダウンロード
        </button>
      </div>
    </>
  );
}
