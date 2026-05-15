import { useEffect, useRef, useState } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { removeNearWhitePixels } from "../utils/removeNearWhite";

export function AvatarImage({ alt, src }: { src: string; alt: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setFailed(true);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      imageData.data.set(removeNearWhitePixels(imageData.data, archiveVisualConfig.assets.nearWhiteThreshold));
      context.putImageData(imageData, 0, 0);
      setFailed(false);
    };
    image.onerror = () => setFailed(true);
    image.src = src;
  }, [src]);

  if (failed) {
    return (
      <div className="avatar-placeholder" role="img" aria-label={`${alt} missing`}>
        Missing avatar
      </div>
    );
  }

  return <canvas ref={canvasRef} className="avatar-image" aria-label={alt} />;
}
