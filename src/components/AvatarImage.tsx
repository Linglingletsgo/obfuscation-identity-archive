import { useEffect, useMemo, useState } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { removeNearWhitePixels } from "../utils/removeNearWhite";

export function AvatarImage({ alt, src }: { src: string | string[]; alt: string }) {
  const [failed, setFailed] = useState(false);
  const [processedSource, setProcessedSource] = useState<string | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const sources = useMemo(() => (Array.isArray(src) ? src.filter(Boolean) : [src].filter(Boolean)), [src]);
  const activeSource = sources[activeSourceIndex];

  useEffect(() => {
    setActiveSourceIndex(0);
    setFailed(false);
    setProcessedSource(null);
  }, [sources.join("\n")]);

  useEffect(() => {
    setProcessedSource(null);
    if (!activeSource) {
      setFailed(true);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      if (!context || cancelled) return;

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      imageData.data.set(removeNearWhitePixels(imageData.data, archiveVisualConfig.assets.nearWhiteThreshold));
      context.putImageData(imageData, 0, 0);
      setProcessedSource(canvas.toDataURL("image/png"));
      setFailed(false);
    };
    image.onerror = () => {
      if (cancelled) return;
      if (activeSourceIndex < sources.length - 1) {
        setActiveSourceIndex((current) => current + 1);
        return;
      }
      setFailed(true);
    };
    image.src = activeSource;

    return () => {
      cancelled = true;
    };
  }, [activeSource, activeSourceIndex, sources.length]);

  if (failed) {
    return (
      <div className="avatar-placeholder" role="img" aria-label={`${alt} missing`}>
        Missing avatar
      </div>
    );
  }

  if (!processedSource) {
    return <div className="avatar-placeholder" role="img" aria-label={`${alt} loading`} />;
  }

  return <img className="avatar-image" src={processedSource} alt={alt} draggable />;
}
