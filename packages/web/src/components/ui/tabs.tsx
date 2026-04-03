import { cn } from "@/lib/utils";

export interface TabsItem {
  value: string;
  label: string;
}

export interface TabsProps {
  items: TabsItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onValueChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(
              "border px-2 py-1 text-[10px] transition-colors rounded-none",
              isActive
                ? "border-primary/45 bg-primary/15 text-primary"
                : "border-border/40 text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onValueChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
