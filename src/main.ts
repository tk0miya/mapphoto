import { parseKmz } from "./kmz";
import { type Corner, type DateFormat, type DateSource, type RenderOptions, render } from "./renderer";
import type { Feature } from "./types";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const dropPhoto = $<HTMLDivElement>("drop-photo");
const dropKmz = $<HTMLDivElement>("drop-kmz");
const photoInput = $<HTMLInputElement>("photo-input");
const kmzInput = $<HTMLInputElement>("kmz-input");
const photoName = $<HTMLSpanElement>("photo-name");
const kmzName = $<HTMLSpanElement>("kmz-name");

const titleInput = $<HTMLInputElement>("title-input");
const subtitleInput = $<HTMLInputElement>("subtitle-input");
const dateFormatSelect = $<HTMLSelectElement>("date-format");
const textPositionSelect = $<HTMLSelectElement>("text-position");
const showMapCheckbox = $<HTMLInputElement>("show-map");
const mapPositionSelect = $<HTMLSelectElement>("map-position");
const mapPositionField = $<HTMLDivElement>("map-position-field");

const step1Next = $<HTMLButtonElement>("step1-next");
const step2Back = $<HTMLButtonElement>("step2-back");
const step2Next = $<HTMLButtonElement>("step2-next");
const step3Back = $<HTMLButtonElement>("step3-back");

const canvasWrapper = $<HTMLDivElement>("canvas-wrapper");
const loadingOverlay = $<HTMLDivElement>("loading-overlay");
const canvas = $<HTMLCanvasElement>("map-canvas");
const downloadBtn = $<HTMLButtonElement>("download-btn");
const statusEl = $<HTMLParagraphElement>("status");

let photoFile: File | null = null;
let kmzFile: File | null = null;

type Step = 1 | 2 | 3;

function goToStep(step: Step) {
  for (const n of [1, 2, 3] as const) {
    const panel = document.getElementById(`panel-${n}`);
    panel?.classList.toggle("active", n === step);
  }
  for (const el of document.querySelectorAll<HTMLElement>(".stepper .step")) {
    const n = Number(el.dataset.step);
    el.classList.toggle("active", n === step);
    el.classList.toggle("done", n < step);
  }
}

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

function setFile(type: "photo" | "kmz", file: File) {
  if (type === "photo") {
    photoFile = file;
    photoName.textContent = file.name;
    dropPhoto.classList.add("selected");
  } else {
    kmzFile = file;
    kmzName.textContent = file.name;
    dropKmz.classList.add("selected");
  }
  step1Next.disabled = !(photoFile && kmzFile);
}

function bindDropArea(el: HTMLDivElement, input: HTMLInputElement, type: "photo" | "kmz") {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("drag-over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drag-over");
    const file = e.dataTransfer?.files[0];
    if (file) setFile(type, file);
  });
  el.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) setFile(type, file);
  });
}

function readOptions(): RenderOptions {
  const dateSource =
    (document.querySelector<HTMLInputElement>('input[name="date-source"]:checked')?.value as DateSource) ?? "exif";
  return {
    title: titleInput.value.trim(),
    subtitle: subtitleInput.value.trim(),
    dateSource,
    dateFormat: dateFormatSelect.value as DateFormat,
    textPosition: textPositionSelect.value as Corner,
    showMap: showMapCheckbox.checked,
    mapPosition: mapPositionSelect.value as Corner,
  };
}

async function generate() {
  if (!photoFile || !kmzFile) return;

  goToStep(3);
  setStatus("読み込み中...");
  downloadBtn.disabled = true;

  const isFirstRender = !canvasWrapper.classList.contains("visible");
  if (!isFirstRender) loadingOverlay.classList.add("active");

  try {
    const features: Feature[] = await parseKmz(kmzFile);
    if (features.length === 0) throw new Error("Placemark が見つかりませんでした");

    setStatus("描画中...");
    await render(canvas, photoFile, features, readOptions());
    canvasWrapper.classList.add("visible");
    downloadBtn.disabled = false;
    setStatus("");
  } catch (e) {
    setStatus(`エラー: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    loadingOverlay.classList.remove("active");
  }
}

bindDropArea(dropPhoto, photoInput, "photo");
bindDropArea(dropKmz, kmzInput, "kmz");

step1Next.addEventListener("click", () => goToStep(2));
step2Back.addEventListener("click", () => goToStep(1));
step2Next.addEventListener("click", () => generate());
step3Back.addEventListener("click", () => goToStep(2));

showMapCheckbox.addEventListener("change", () => {
  mapPositionField.style.display = showMapCheckbox.checked ? "" : "none";
});

downloadBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "map.png";
  a.click();
});
