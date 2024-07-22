import { PropsWithChildren } from "react";

export const AnimatePulse = ({
  isActive,
  children,
}: PropsWithChildren<{ isActive: boolean }>) => {
  return (
    <div className="relative">
      {children}
      {isActive && (
        <div className="z-10 absolute flex inset-0 bg-white/60 dark:bg-black/60 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};
