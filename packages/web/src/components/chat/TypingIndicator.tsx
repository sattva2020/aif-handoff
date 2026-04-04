import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  hasAssistantMessage: boolean;
}

export function TypingIndicator({ hasAssistantMessage }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1.5", hasAssistantMessage && "pl-12")}>
      <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
      <span className="text-xs text-muted-foreground">Working...</span>
    </div>
  );
}
