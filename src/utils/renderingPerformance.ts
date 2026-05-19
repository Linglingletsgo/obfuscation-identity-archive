import { archiveVisualConfig } from "../config/archiveVisualConfig";

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

const CANVAS_DEVICE_PIXEL_RATIO: [number, number] = [1, archiveVisualConfig.rendering.maxDevicePixelRatio];

function isLowPowerDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const { deviceMemory, hardwareConcurrency } = navigator as NavigatorWithDeviceMemory;
  return Boolean(
    (typeof deviceMemory === "number" && deviceMemory <= 4) ||
      (typeof hardwareConcurrency === "number" && hardwareConcurrency <= 4),
  );
}

export function getCollectiveAvatarPointSamples(): number {
  return isLowPowerDevice()
    ? archiveVisualConfig.assets.stage2CollectivePointSamplesLowPower
    : archiveVisualConfig.assets.stage2CollectivePointSamples;
}

export function getCollectiveEnvironmentPointSamples(): number {
  return isLowPowerDevice()
    ? archiveVisualConfig.assets.collectiveEnvironmentPointSamplesLowPower
    : archiveVisualConfig.assets.collectiveEnvironmentPointSamples;
}

export function getCanvasDevicePixelRatio(): [number, number] {
  return CANVAS_DEVICE_PIXEL_RATIO;
}
