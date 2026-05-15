export function removeNearWhitePixels(source: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(source);

  for (let index = 0; index < output.length; index += 4) {
    if (output[index] > threshold && output[index + 1] > threshold && output[index + 2] > threshold) {
      output[index + 3] = 0;
    }
  }

  return output;
}
