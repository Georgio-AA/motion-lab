const levels = [
  { dpr: 1.5, shadows: true, dust: 45, smoke: 9, drones: 2, sparks: 12 },
  { dpr: 1.25, shadows: false, dust: 30, smoke: 6, drones: 1, sparks: 8 },
  { dpr: 1, shadows: false, dust: 16, smoke: 3, drones: 1, sparks: 6 },
];

// Monotonic quality: sixty visible RAF intervals, then a single downward step if needed.
export function createQualityController(deviceDpr, mobile, lowTier) {
  const controller = {
    tier: mobile ? 2 : lowTier ? 1 : 0,
    frames: 0, sum: 0, average: 0,
    get settings() { return levels[this.tier]; },
    get dpr() { return Math.min(deviceDpr, this.settings.dpr); },
    resetWindow() { this.frames = 0; this.sum = 0; },
    recordFrame(milliseconds) {
      if (!(milliseconds > 0)) return false;
      this.sum += milliseconds; this.frames++;
      if (this.frames < 60) return false;
      this.average = this.sum / this.frames;
      this.resetWindow();
      if (this.average <= 20 || this.tier === 2) return false;
      this.tier++;
      return true;
    },
  };
  return controller;
}
