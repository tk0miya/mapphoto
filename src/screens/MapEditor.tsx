import { useEffect, useRef, useState } from "react";
import { StepIndicator } from "../components/StepIndicator";
import { parseKmz } from "../kmz";
import { render } from "../renderer";
import { ResultView } from "./ResultView";
import { UploadForm } from "./UploadForm";

const STEPS = ["入力", "出力"];

export function MapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [kmzFile, setKmzFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [status, setStatus] = useState("");
  const [rendered, setRendered] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stepIndex !== 1 || !photoFile || !kmzFile) return;

    let cancelled = false;
    setRendered(false);
    setLoading(true);
    setStatus("読み込み中...");

    (async () => {
      try {
        const features = await parseKmz(kmzFile);
        if (cancelled) return;
        if (features.length === 0) throw new Error("Placemark が見つかりませんでした");

        setStatus("描画中...");
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas が初期化されていません");
        await render(canvas, photoFile, features, title.trim(), subtitle.trim());
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
  }, [stepIndex, photoFile, kmzFile, title, subtitle]);

  const goToOutput = () => {
    if (!photoFile || !kmzFile) return;
    setStepIndex(1);
  };

  const goBack = () => {
    setStepIndex(0);
    setStatus("");
  };

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
      <StepIndicator steps={STEPS} currentIndex={stepIndex} />

      {stepIndex === 0 ? (
        <UploadForm
          photoFile={photoFile}
          kmzFile={kmzFile}
          title={title}
          subtitle={subtitle}
          onPhotoChange={setPhotoFile}
          onKmzChange={setKmzFile}
          onTitleChange={setTitle}
          onSubtitleChange={setSubtitle}
          onNext={goToOutput}
        />
      ) : (
        <ResultView
          canvasRef={canvasRef}
          status={status}
          loading={loading}
          rendered={rendered}
          onBack={goBack}
          onDownload={download}
        />
      )}
    </>
  );
}
