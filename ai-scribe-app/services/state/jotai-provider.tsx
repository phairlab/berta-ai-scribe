import { ReactNode } from "react";

import { Provider } from "jotai";

type ProviderProps = { children: ReactNode };

export function JotaiProvider({ children }: ProviderProps) {
  return <Provider>{children}</Provider>;
}
