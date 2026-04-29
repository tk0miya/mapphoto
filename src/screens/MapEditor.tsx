import { useEffect, useRef, useState } from "react";
import { DropArea } from "../components/DropArea";
import { MapPreview } from "../components/MapPreview";
import { parseKmz } from "../kmz";
import { render } from "../renderer";

const TEXT_DEBOUNCE_MS = 600;

export function MapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderedRef = useRef(false);
  const prevFilesRef = useRef<{ photo: File | null; kmz: File | null }>({ photo: null, kmz: null });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [kmzFile, setKmzFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [status, setStatus] = useState("");
  const [rendered, setRendered] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!photoFile || !kmzFile) return;
    const filesChanged = prevFilesRef.current.photo !== photoFile || prevFilesRef.current.kmz !== kmzFile;
    prevFilesRef.current = { photo: photoFile, kmz: kmzFile };
    const delay = filesChanged ? 0 : TEXT_DEBOUNCE_MS;

    const id = setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setStatus("読み込み中...");
      if (renderedRef.current) setLoading(true);

      try {
        const features = await parseKmz(kmzFile);
        if (features.length === 0) throw new Error("Placemark が見つかりませんでした");

        setStatus("描画中...");
        await render(canvas, photoFile, features, title.trim(), subtitle.trim());
        renderedRef.current = true;
        setRendered(true);
        setStatus("");
      } catch (e) {
        setStatus(`エラー: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(id);
  }, [photoFile, kmzFile, title, subtitle]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "map.png";
    a.click();
  };

  return (
    <>
      <h1>KMZ マップ生成</h1>

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
          onFile={setPhotoFile}
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
          onFile={setKmzFile}
        />
      </div>

      <div className="text-inputs">
        <input type="text" placeholder="タイトル（省略可）" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input
          type="text"
          placeholder="サブタイトル（省略可）"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </div>

      <p className="status">{status}</p>
      <button type="button" className="download-btn" disabled={!rendered || loading} onClick={download}>
        PNG をダウンロード
      </button>

      <MapPreview ref={canvasRef} visible={rendered} loading={loading} />
    </>
  );
}
