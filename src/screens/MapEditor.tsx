import { useEffect, useRef, useState } from "react";
import { attachExifToPng } from "../exif";
import { readExif } from "../exifReader";
import { formatPlace, lookupPlace } from "../geocode";
import { parseMapSource } from "../kmz";
import { loadStoredKmzUrl, saveKmzUrl } from "../kmzUrlStorage";
import { fetchMapSource, parseMapsUrl } from "../mapsUrl";
import { render } from "../renderer";
import type { Corner } from "../types";
import { MetadataForm } from "./MetadataForm";
import { ResultView } from "./ResultView";
import { UploadForm } from "./UploadForm";

type Screen = "upload" | "output" | "settings";

export function MapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefilledFileRef = useRef<File | null>(null);

  const [screen, setScreen] = useState<Screen>("upload");
  const [generationRequested, setGenerationRequested] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [kmzFile, setKmzFile] = useState<File | null>(null);
  const [kmzUrl, setKmzUrl] = useState<string>(() => loadStoredKmzUrl(localStorage));
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [textPosition, setTextPosition] = useState<Corner>("top-left");
  const [mapPosition, setMapPosition] = useState<Corner>("bottom-right");
  const [showCoordinates, setShowCoordinates] = useState(true);
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

  // 写真が差し替わったらタイトルを一度クリアし、GPS から地名を解決できればプリフィルする。
  // 解析中にユーザーが入力していたら上書きしない。
  useEffect(() => {
    if (!photoFile || prefilledFileRef.current === photoFile) return;
    prefilledFileRef.current = photoFile;
    setTitle("");

    let cancelled = false;
    (async () => {
      const exif = await readExif(photoFile);
      if (cancelled || exif.latitude == null || exif.longitude == null) return;
      const place = formatPlace(await lookupPlace(exif.latitude, exif.longitude));
      if (cancelled || !place) return;
      setTitle((prev) => (prev === "" ? place : prev));
    })();

    return () => {
      cancelled = true;
    };
  }, [photoFile]);

  useEffect(() => {
    if (!generationRequested || !photoFile) return;

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
          showCoordinates,
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
  }, [generationRequested, photoFile, kmzFile, kmzUrl, title, subtitle, textPosition, mapPosition, showCoordinates]);

  const generate = () => {
    if (!photoFile) return;
    if (!kmzFile && !parseMapsUrl(kmzUrl)) return;
    setGenerationRequested(true);
    setScreen("output");
  };

  const startOver = () => {
    setGenerationRequested(false);
    setRendered(false);
    setLoading(false);
    setStatus("");
    setPhotoFile(null);
    setKmzFile(null);
    setTitle("");
    setSubtitle("");
    setTextPosition("top-left");
    setMapPosition("bottom-right");
    setShowCoordinates(true);
    setScreen("upload");
  };

  const openSettings = () => {
    setScreen("settings");
  };

  const closeSettings = () => {
    setScreen("output");
  };

  const applySettings = (next: {
    title: string;
    subtitle: string;
    textPosition: Corner;
    mapPosition: Corner;
    showCoordinates: boolean;
  }) => {
    setTitle(next.title);
    setSubtitle(next.subtitle);
    setTextPosition(next.textPosition);
    setMapPosition(next.mapPosition);
    setShowCoordinates(next.showCoordinates);
    setScreen("output");
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

      {screen === "upload" && (
        <UploadForm
          photoFile={photoFile}
          kmzFile={kmzFile}
          kmzUrl={kmzUrl}
          onPhotoChange={setPhotoFile}
          onKmzChange={setKmzFile}
          onKmzUrlChange={setKmzUrl}
          onGenerate={generate}
        />
      )}
      {screen === "output" && (
        <ResultView
          canvasRef={canvasRef}
          status={status}
          loading={loading}
          rendered={rendered}
          onOpenSettings={openSettings}
          onDownload={download}
          onStartOver={startOver}
        />
      )}
      {screen === "settings" && (
        <MetadataForm
          initialTitle={title}
          initialSubtitle={subtitle}
          initialTextPosition={textPosition}
          initialMapPosition={mapPosition}
          initialShowCoordinates={showCoordinates}
          onCancel={closeSettings}
          onApply={applySettings}
        />
      )}
    </>
  );
}
