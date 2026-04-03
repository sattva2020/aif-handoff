import { useState } from "react";
import { Markdown } from "@/components/ui/markdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ToggleButton } from "@/components/ui/toggle-button";

interface TaskPlanProps {
  plan: string | null;
}

export function TaskPlan({ plan }: TaskPlanProps) {
  const [expanded, setExpanded] = useState(false);

  if (!plan) {
    return <EmptyState message="No plan generated yet" />;
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
