/** Hysteresis avoids flickering quality changes. Only cosmetic detail is affected. */
export class VisualQuality {
  economical = false;
  private slowMs = 0;
  private fastMs = 0;

  update(frameMs: number) {
    // Ignore startup, visibility changes and invalid samples.
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 250) return;
    if (frameMs > 24) {
      this.slowMs += frameMs;
      this.fastMs = 0;
    } else if (frameMs < 19) {
      this.fastMs += frameMs;
      this.slowMs = Math.max(0, this.slowMs - frameMs);
    } else {
      this.fastMs = 0;
      this.slowMs = Math.max(0, this.slowMs - frameMs * .25);
    }
    if (!this.economical && this.slowMs >= 1800) {
      this.economical = true;
      this.slowMs = 0;
    } else if (this.economical && this.fastMs >= 6000) {
      this.economical = false;
      this.fastMs = 0;
    }
  }
}
