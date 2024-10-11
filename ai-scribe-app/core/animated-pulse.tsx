import { PropsWithChildren } from "react";

type AnimatedPulseProps = PropsWithChildren<{
  isPulsing: boolean;
}>;

export const AnimatedPulse = ({ isPulsing, children }: AnimatedPulseProps) => (
  <div className="relative">
    {children}
    {isPulsing && (
      <div className="z-10 absolute flex inset-0 bg-white/60 dark:bg-black/60 animate-pulse pointer-events-none" />
    )}
  </div>
);
