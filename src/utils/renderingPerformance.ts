import { archiveVisualConfig } from "../config/archiveVisualConfig";

const CANVAS_DEVICE_PIXEL_RATIO: [number, number] = [1, archiveVisualConfig.rendering.maxDevicePixelRatio];

export function getCanvasDevicePixelRatio(): [number, number] {
  return CANVAS_DEVICE_PIXEL_RATIO;
}
