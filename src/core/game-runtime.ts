import { FixedStepLoop, type FixedStepResult } from "./fixed-step-loop";

export const GAME_RUNTIME_DEFAULTS = {
  stepSeconds: 1 / 60,
  maxFrameDeltaSeconds: 0.1,
  maxStepsPerFrame: 6,
} as const;

export type FixedUpdateSystem = (stepSeconds: number) => void;
export type GameFrameUpdate = (frame: Readonly<FixedStepResult>) => void;

export class GameRuntime {
  private readonly clock = new FixedStepLoop(GAME_RUNTIME_DEFAULTS);
  private readonly systems = new Set<FixedUpdateSystem>();
  private readonly frameSystems = new Set<GameFrameUpdate>();

  register(system: FixedUpdateSystem): () => void {
    this.systems.add(system);
    return () => this.systems.delete(system);
  }

  registerFrame(system: GameFrameUpdate): () => void {
    this.frameSystems.add(system);
    return () => this.frameSystems.delete(system);
  }

  advanceFrame(frameDeltaSeconds: number): FixedStepResult {
    const result = this.clock.advance(frameDeltaSeconds, (stepSeconds) => {
      for (const system of this.systems) system(stepSeconds);
    });
    for (const system of this.frameSystems) system(result);
    return result;
  }

  reset(): void {
    this.clock.reset();
  }
}

export const sharedGameRuntime = new GameRuntime();
