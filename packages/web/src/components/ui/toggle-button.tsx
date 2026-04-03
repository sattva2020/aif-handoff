import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToggleButtonProps {
  expanded: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ToggleButton({ expanded, onClick, children, className }: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      className={cn(
        "inline-flex items-center gap-1 border border-border bg-background/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground rounded-none",
        className,
      )}
      onClick={onClick}
    >
      {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      {children}
    </button>
  );
}
