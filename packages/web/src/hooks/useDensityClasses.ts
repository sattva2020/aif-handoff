import { useMemo } from "react";

export type Density = "compact" | "comfortable";

export interface DensityClasses {
  isCompact: boolean;
  px: string;
  py: string;
  gap: string;
  text: string;
  textSm: string;
  space: string;
  width: string;
}

export function useDensityClasses(density: Density): DensityClasses {
  return useMemo(
    () => ({
      isCompact: density === "compact",
      px: density === "compact" ? "px-2" : "px-3",
      py: density === "compact" ? "py-1.5" : "py-2",
      gap: density === "compact" ? "gap-2" : "gap-3",
      text: density === "compact" ? "text-[10px]" : "text-[11px]",
      textSm: density === "compact" ? "text-[9px]" : "text-[10px]",
      space: density === "compact" ? "space-y-2" : "space-y-3",
      width: density === "compact" ? "w-72" : "w-80",
    }),
    [density],
  );
}
