/** Keep logical gameplay coordinates independent of the display's pixel grid. */
export function canvasResolution(width: number, height: number, displayWidth: number, pixelRatio: number) {
  const density = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const scale = Math.max(1, Math.min(2, displayWidth / width * density || 1));
  const pixelWidth = Math.round(width * scale);
  const pixelHeight = Math.round(height * scale);
  return { width: pixelWidth, height: pixelHeight, scaleX: pixelWidth / width, scaleY: pixelHeight / height };
}
