export interface FixedStepOptions {
  stepSeconds?: number;
  maxFrameDeltaSeconds?: number;
  maxStepsPerFrame?: number;
}

export interface FixedStepResult {
  steps: number;
  alpha: number;
  droppedSeconds: number;
}

export class FixedStepLoop {
  readonly stepSeconds: number;
  readonly maxFrameDeltaSeconds: number;
  readonly maxStepsPerFrame: number;
  private accumulator = 0;
  private readonly result: FixedStepResult = { steps: 0, alpha: 0, droppedSeconds: 0 };

  constructor(options: FixedStepOptions = {}) {
    this.stepSeconds = options.stepSeconds ?? 1 / 60;
    this.maxFrameDeltaSeconds = options.maxFrameDeltaSeconds ?? 0.1;
    this.maxStepsPerFrame = options.maxStepsPerFrame ?? 6;
    if (!(this.stepSeconds > 0) || !(this.maxFrameDeltaSeconds > 0)) {
      throw new RangeError("Fixed-step durations must be positive.");
    }
    if (!Number.isInteger(this.maxStepsPerFrame) || this.maxStepsPerFrame < 1) {
      throw new RangeError("maxStepsPerFrame must be a positive integer.");
    }
  }

  advance(frameDeltaSeconds: number, update: (stepSeconds: number) => void): FixedStepResult {
    const safeDelta = Number.isFinite(frameDeltaSeconds)
      ? Math.min(Math.max(frameDeltaSeconds, 0), this.maxFrameDeltaSeconds)
      : 0;
    this.accumulator += safeDelta;
    let steps = 0;
    while (this.accumulator >= this.stepSeconds && steps < this.maxStepsPerFrame) {
      update(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      steps += 1;
    }

    let droppedSeconds = 0;
    if (this.accumulator >= this.stepSeconds) {
      const droppedSteps = Math.floor(this.accumulator / this.stepSeconds);
      droppedSeconds = droppedSteps * this.stepSeconds;
      this.accumulator -= droppedSeconds;
    }

    this.result.steps = steps;
    this.result.alpha = this.accumulator / this.stepSeconds;
    this.result.droppedSeconds = droppedSeconds;
    return this.result;
  }

  reset(): void {
    this.accumulator = 0;
    this.result.steps = 0;
    this.result.alpha = 0;
    this.result.droppedSeconds = 0;
  }
}
