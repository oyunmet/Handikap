import { FixedStepLoop, type FixedStepResult } from "./fixed-step-loop";

export const GAME_RUNTIME_DEFAULTS = {
  stepSeconds: 1 / 60,
  maxFrameDeltaSeconds: 0.1,
  maxStepsPerFrame: 6,
} as const;

export type FixedUpdateSystem = (stepSeconds: number) => void;

export class GameRuntime {
  private readonly clock = new FixedStepLoop(GAME_RUNTIME_DEFAULTS);
  private readonly systems = new Set<FixedUpdateSystem>();

  register(system: FixedUpdateSystem): () => void {
    this.systems.add(system);
    return () => this.systems.delete(system);
  }

  advanceFrame(frameDeltaSeconds: number): FixedStepResult {
    return this.clock.advance(frameDeltaSeconds, (stepSeconds) => {
      for (const system of this.systems) system(stepSeconds);
    });
  }

  reset(): void {
    this.clock.reset();
  }
}

export const sharedGameRuntime = new GameRuntime();
