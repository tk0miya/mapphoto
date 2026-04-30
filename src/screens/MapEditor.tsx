import { useEffect, useRef, useState } from "react";
import { StepIndicator } from "../components/StepIndicator";
import { attachExifToPng } from "../exif";
import { parseMapSource } from "../kmz";
import { loadStoredKmzUrl, saveKmzUrl } from "../kmzUrlStorage";
import { fetchMapSource, parseMapsUrl } from "../mapsUrl";
import { render } from "../renderer";
import type { Corner } from "../types";
import { MetadataForm } from "./MetadataForm";
import { ResultView } from "./ResultView";
import { UploadForm } from "./UploadForm";

const STEPS = ["ファイルアップロード", "情報設定", "画像出力"];

export function MapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [kmzFile, setKmzFile] = useState<File | null>(null);
  const [kmzUrl, setKmzUrl] = useState<string>(() => loadStoredKmzUrl(localStorage));
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [textPosition, setTextPosition] = useState<Corner>("top-left");
  const [mapPosition, setMapPosition] = useState<Corner>("bottom-right");
  const [status, setStatus] = useState("");
  const [rendered, setRendered] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (kmzUrl === "") {
      saveKmzUrl(localStorage, "");
      return;
    }
    if (parseMapsUrl(kmzUrl)) {
      saveKmzUrl(localStorage, kmzUrl);
    }
  }, [kmzUrl]);

  useEffect(() => {
    if (stepIndex !== 2 || !photoFile) return;

    const urlParts = parseMapsUrl(kmzUrl);
    if (!kmzFile && !urlParts) return;

    let cancelled = false;
    setRendered(false);
    setLoading(true);
    setStatus(kmzFile ? "読み込み中..." : "KML を取得中...");

    (async () => {
      try {
        let buf: ArrayBuffer;
        if (kmzFile) {
          buf = await kmzFile.arrayBuffer();
        } else if (urlParts) {
          buf = await fetchMapSource(urlParts);
        } else {
          return;
        }
        if (cancelled) return;
        const features = await parseMapSource(buf);
        if (cancelled) return;
        if (features.length === 0) throw new Error("Placemark が見つかりませんでした");

        setStatus("描画中...");
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas が初期化されていません");
        await render(canvas, photoFile, features, {
          title: title.trim(),
          subtitle: subtitle.trim(),
          textPosition,
          mapPosition,
        });
        if (cancelled) return;
        setRendered(true);
        setStatus("");
      } catch (e) {
        if (cancelled) return;
        setStatus(`エラー: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stepIndex, photoFile, kmzFile, kmzUrl, title, subtitle, textPosition, mapPosition]);

  const goToMetadata = () => {
    if (!photoFile) return;
    if (!kmzFile && !parseMapsUrl(kmzUrl)) return;
    setStepIndex(1);
  };

  const goToOutput = () => {
    setStepIndex(2);
  };

  const goToUpload = () => {
    setStepIndex(0);
  };

  const goBackToMetadata = () => {
    setStepIndex(1);
    setStatus("");
  };

  const download = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !photoFile) return;
    try {
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
      });
      const parts = [title.trim(), subtitle.trim()].filter(Boolean);
      const description = parts.join(" / ");
      const finalBlob = await attachExifToPng(pngBlob, photoFile, {
        width: canvas.width,
        height: canvas.height,
        imageDescription: description || undefined,
      });
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "map.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setStatus(`ダウンロードに失敗: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <>
      <h1>KMZ マップ生成</h1>
      <StepIndicator steps={STEPS} currentIndex={stepIndex} />

      {stepIndex === 0 && (
        <UploadForm
          photoFile={photoFile}
          kmzFile={kmzFile}
          kmzUrl={kmzUrl}
          onPhotoChange={setPhotoFile}
          onKmzChange={setKmzFile}
          onKmzUrlChange={setKmzUrl}
          onNext={goToMetadata}
        />
      )}
      {stepIndex === 1 && (
        <MetadataForm
          title={title}
          subtitle={subtitle}
          textPosition={textPosition}
          mapPosition={mapPosition}
          onTitleChange={setTitle}
          onSubtitleChange={setSubtitle}
          onTextPositionChange={setTextPosition}
          onMapPositionChange={setMapPosition}
          onBack={goToUpload}
          onNext={goToOutput}
        />
      )}
      {stepIndex === 2 && (
        <ResultView
          canvasRef={canvasRef}
          status={status}
          loading={loading}
          rendered={rendered}
          onBack={goBackToMetadata}
          onDownload={download}
        />
      )}
    </>
  );
}
