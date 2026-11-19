export const GAME_INPUT_ACTIONS = [
  "jump",
  "dodge",
  "interact",
  "primary",
  "secondary",
  "reload",
  "pause",
] as const;

export type GameInputAction = (typeof GAME_INPUT_ACTIONS)[number];

export interface GameInputSnapshot {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  actions: ReadonlySet<GameInputAction>;
}

const KEY_ACTIONS: Readonly<Record<string, GameInputAction>> = {
  Space: "jump",
  ShiftLeft: "dodge",
  ShiftRight: "dodge",
  KeyE: "interact",
  Enter: "interact",
  KeyF: "primary",
  KeyR: "reload",
  Escape: "pause",
};

export class GameInputManager {
  private readonly keys = new Set<string>();
  private readonly actions = new Set<GameInputAction>();
  private touchMoveX = 0;
  private touchMoveY = 0;
  private pendingLookX = 0;
  private pendingLookY = 0;
  private readonly snapshot: GameInputSnapshot = {
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    actions: this.actions,
  };
  private target: Window | null = null;

  attach(target: Window = window): () => void {
    this.detach();
    this.target = target;
    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
    target.addEventListener("blur", this.clear);
    return () => this.detach();
  }

  setTouchMovement(x: number, y: number): void {
    this.touchMoveX = clampAxis(x);
    this.touchMoveY = clampAxis(y);
  }

  addLookDelta(x: number, y: number): void {
    this.pendingLookX += finiteOrZero(x);
    this.pendingLookY += finiteOrZero(y);
  }

  setAction(action: GameInputAction, pressed: boolean): void {
    if (pressed) this.actions.add(action);
    else this.actions.delete(action);
  }

  readFrame(): GameInputSnapshot {
    const keyboardX = Number(this.keys.has("KeyD") || this.keys.has("ArrowRight"))
      - Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
    const keyboardY = Number(this.keys.has("KeyW") || this.keys.has("ArrowUp"))
      - Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"));
    let moveX = clampAxis(keyboardX + this.touchMoveX);
    let moveY = clampAxis(keyboardY + this.touchMoveY);
    const magnitude = Math.hypot(moveX, moveY);
    if (magnitude > 1) {
      moveX /= magnitude;
      moveY /= magnitude;
    }
    this.snapshot.moveX = moveX;
    this.snapshot.moveY = moveY;
    this.snapshot.lookX = this.pendingLookX;
    this.snapshot.lookY = this.pendingLookY;
    this.pendingLookX = 0;
    this.pendingLookY = 0;
    return this.snapshot;
  }

  detach(): void {
    if (!this.target) return;
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.clear);
    this.target = null;
    this.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return;
    this.keys.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) {
      event.preventDefault();
      this.actions.add(action);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) this.actions.delete(action);
  };

  private readonly clear = (): void => {
    this.keys.clear();
    this.actions.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.pendingLookX = 0;
    this.pendingLookY = 0;
  };
}

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, finiteOrZero(value)));
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
