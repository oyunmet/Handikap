import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { GameCanvasProvider, GameCanvasStage } from "./GameCanvasHost";

export interface GameShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const GameShell = forwardRef<HTMLDivElement, GameShellProps>(
  function GameShell({ children, ...rootProps }, ref) {
    return (
      <GameCanvasProvider>
        <div {...rootProps} ref={ref}>
          <GameCanvasStage />
          {children}
        </div>
      </GameCanvasProvider>
    );
  },
);
