import { cn } from "@/lib/utils";

export function TimestampLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("text-3xs font-mono text-muted-foreground tracking-tight", className)}>
      {children}
    </span>
  );
}
