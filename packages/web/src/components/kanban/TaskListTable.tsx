import { STATUS_CONFIG, type Task } from "@aif/shared/browser";
import { TableHeaderCell } from "@/components/ui/table-header-cell";

interface TaskListTableProps {
  tasks: Task[];
  isCompact: boolean;
  onTaskClick: (taskId: string) => void;
}

export function TaskListTable({ tasks, isCompact, onTaskClick }: TaskListTableProps) {
  return (
    <div className="overflow-x-auto border border-border bg-card/65">
      <table className="w-full table-fixed border-collapse text-left">
        <thead className="border-b border-border bg-secondary/35">
          <tr>
            <TableHeaderCell isCompact={isCompact} className="w-auto">
              Task
            </TableHeaderCell>
            <TableHeaderCell isCompact={isCompact} className="w-28">
              Status
            </TableHeaderCell>
            <TableHeaderCell isCompact={isCompact} className="w-24">
              Priority
            </TableHeaderCell>
            <TableHeaderCell isCompact={isCompact} className="w-20">
              Owner
            </TableHeaderCell>
            <TableHeaderCell isCompact={isCompact} className="w-44">
              Updated
            </TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="cursor-pointer border-b border-border/80 transition-colors hover:bg-accent/45"
              onClick={() => onTaskClick(task.id)}
            >
              <td className={`px-3 overflow-hidden ${isCompact ? "py-1" : "py-2.5"}`}>
                <div
                  className={`truncate ${isCompact ? "text-xs" : "text-sm"} font-medium tracking-tight`}
                >
                  {task.title}
                </div>
                {task.description && (
                  <div
                    className={`truncate text-muted-foreground ${isCompact ? "text-2xs" : "text-xs"}`}
                  >
                    {task.description}
                  </div>
                )}
              </td>
              <td className={`px-3 ${isCompact ? "py-1" : "py-2.5"}`}>
                <span
                  className={`inline-flex border ${isCompact ? "px-1.5 py-0 text-3xs" : "px-2 py-0.5 text-2xs"}`}
                  style={{
                    borderColor: `${STATUS_CONFIG[task.status].color}66`,
                    color: STATUS_CONFIG[task.status].color,
                    backgroundColor: `${STATUS_CONFIG[task.status].color}1A`,
                  }}
                >
                  {STATUS_CONFIG[task.status].label}
                </span>
              </td>
              <td
                className={`px-3 text-muted-foreground ${isCompact ? "py-1 text-2xs" : "py-2.5 text-xs"}`}
              >
                {task.priority || "-"}
              </td>
              <td
                className={`px-3 text-muted-foreground ${isCompact ? "py-1 text-2xs" : "py-2.5 text-xs"}`}
              >
                {task.autoMode ? "AI" : "Manual"}
              </td>
              <td
                className={`px-3 text-muted-foreground ${isCompact ? "py-1 text-2xs" : "py-2.5 text-xs"}`}
              >
                {new Date(task.updatedAt).toLocaleString()}
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">
                No tasks match current list search
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
