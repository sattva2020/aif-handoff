import { useState } from "react";
import { Markdown } from "@/components/ui/markdown";
import { ToggleButton } from "@/components/ui/toggle-button";

interface TaskPlanProps {
  plan: string | null;
}

export function TaskPlan({ plan }: TaskPlanProps) {
  const [expanded, setExpanded] = useState(false);

  if (!plan) {
    return <div className="text-sm text-muted-foreground italic">No plan generated yet</div>;
  }

  return (
    <div className="space-y-3">
      <ToggleButton expanded={expanded} onClick={() => setExpanded((prev) => !prev)}>
        {expanded ? "Hide plan" : "Show plan"}
      </ToggleButton>

      {expanded && <Markdown content={plan} className="text-sm text-foreground/90" />}
    </div>
  );
}
