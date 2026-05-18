import { useEffect, useMemo, useRef, useState } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { removeNearWhitePixels } from "../utils/removeNearWhite";

export function AvatarImage({ alt, src }: { src: string | string[]; alt: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const sources = useMemo(() => (Array.isArray(src) ? src.filter(Boolean) : [src].filter(Boolean)), [src]);
  const activeSource = sources[activeSourceIndex];

  useEffect(() => {
    setActiveSourceIndex(0);
    setFailed(false);
  }, [sources.join("\n")]);

  useEffect(() => {
    if (!activeSource) {
      setFailed(true);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      if (!canvas || !context) return;

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      imageData.data.set(removeNearWhitePixels(imageData.data, archiveVisualConfig.assets.nearWhiteThreshold));
      context.putImageData(imageData, 0, 0);
      setFailed(false);
    };
    image.onerror = () => {
      if (activeSourceIndex < sources.length - 1) {
        setActiveSourceIndex((current) => current + 1);
        return;
      }
      setFailed(true);
    };
    image.src = activeSource;
  }, [activeSource, activeSourceIndex, sources.length]);

  if (failed) {
    return (
      <div className="avatar-placeholder" role="img" aria-label={`${alt} missing`}>
        Missing avatar
      </div>
    );
  }

  return <canvas ref={canvasRef} className="avatar-image" aria-label={alt} />;
}
