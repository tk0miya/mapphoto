import { forwardRef } from "react";

interface Props {
  visible: boolean;
  loading: boolean;
}

export const MapPreview = forwardRef<HTMLCanvasElement, Props>(({ visible, loading }, ref) => {
  if (!visible) return null;
  return (
    <div className="canvas-wrapper">
      <canvas ref={ref} className="map-canvas" />
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
});
MapPreview.displayName = "MapPreview";
