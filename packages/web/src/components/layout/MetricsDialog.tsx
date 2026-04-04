import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskMetricsSummary } from "@/lib/taskMetrics";

interface MetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskMetrics: TaskMetricsSummary;
}

const integerFmt = new Intl.NumberFormat("en-US");
const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtInt = (v: number) => integerFmt.format(Math.round(v));
const fmtUsd = (v: number) => usdFmt.format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export function MetricsDialog({ open, onOpenChange, taskMetrics }: MetricsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Task Metrics</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Completed tasks</p>
            <p className="text-lg font-semibold">{fmtInt(taskMetrics.completedTasks)}</p>
            <p className="text-xs text-muted-foreground">
              {fmtPct(taskMetrics.completionRate)} of {fmtInt(taskMetrics.totalTasks)}
            </p>
          </div>
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Total token usage</p>
            <p className="text-lg font-semibold">{fmtInt(taskMetrics.totalTokenTotal)}</p>
            <p className="text-xs text-muted-foreground">
              in {fmtInt(taskMetrics.totalTokenInput)} / out {fmtInt(taskMetrics.totalTokenOutput)}
            </p>
          </div>
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Total cost</p>
            <p className="text-lg font-semibold">{fmtUsd(taskMetrics.totalCostUsd)}</p>
            <p className="text-xs text-muted-foreground">
              avg {fmtUsd(taskMetrics.averageCostPerTaskUsd)} per task
            </p>
          </div>
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Average tokens per task</p>
            <p className="text-lg font-semibold">{fmtInt(taskMetrics.averageTokensPerTask)}</p>
            <p className="text-xs text-muted-foreground">across all tracked tasks</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-base font-medium">{fmtInt(taskMetrics.activeTasks)}</p>
          </div>
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Blocked</p>
            <p className="text-base font-medium">{fmtInt(taskMetrics.blockedTasks)}</p>
          </div>
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Backlog</p>
            <p className="text-base font-medium">{fmtInt(taskMetrics.backlogTasks)}</p>
          </div>
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Verified</p>
            <p className="text-base font-medium">{fmtInt(taskMetrics.verifiedTasks)}</p>
          </div>
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Auto mode tasks</p>
            <p className="text-base font-medium">{fmtInt(taskMetrics.autoModeTasks)}</p>
          </div>
          <div className="border border-border bg-card/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Fix tasks / Retries</p>
            <p className="text-base font-medium">
              {fmtInt(taskMetrics.fixTasks)} / {fmtInt(taskMetrics.totalRetries)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
