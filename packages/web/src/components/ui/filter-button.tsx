import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const filterButtonVariants = cva(
  "inline-flex items-center gap-1 border font-mono transition-colors cursor-pointer rounded-none",
  {
    variants: {
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-1 text-[11px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface FilterButtonProps extends VariantProps<typeof filterButtonVariants> {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FilterButton({ active, onClick, children, size, className }: FilterButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        filterButtonVariants({ size }),
        active
          ? "border-primary/45 bg-primary/15 text-primary"
          : "border-border bg-background/45 text-muted-foreground hover:bg-background",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export { filterButtonVariants };
