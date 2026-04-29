import { type DragEvent, useState } from "react";

interface Props {
  icon: string;
  label: React.ReactNode;
  accept: string;
  fileName: string | null;
  onFile: (file: File) => void;
}

export function DropArea({ icon, label, accept, fileName, onFile }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const className = ["drop-area", dragOver ? "drag-over" : "", fileName ? "selected" : ""].filter(Boolean).join(" ");

  return (
    <label className={className} onDragOver={handleDragOver} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      <div className="icon">{icon}</div>
      <span>{label}</span>
      {fileName && <span className="filename">{fileName}</span>}
      <input
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
