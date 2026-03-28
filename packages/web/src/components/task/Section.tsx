export function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-background/55 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`border px-2 py-1 text-[10px] transition-colors ${
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-background/50 text-muted-foreground hover:bg-background"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
