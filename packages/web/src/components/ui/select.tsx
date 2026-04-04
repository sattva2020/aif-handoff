import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOutsideClick } from "@/hooks/useOutsideClick";

const sizeClasses = {
  default: "h-9 text-sm px-3",
  sm: "h-7 text-xs px-2",
};

interface SelectProps {
  value?: string;
  options: { value: string; label: string }[];
  onChange?: (e: { target: { value: string } }) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  selectSize?: "default" | "sm";
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, options, value, onChange, disabled, placeholder, selectSize = "default" }, ref) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setOpen(false), []);
    useOutsideClick(containerRef, close, open);

    const selected = options.find((o) => o.value === value);

    const handleSelect = (optValue: string) => {
      onChange?.({ target: { value: optValue } });
      setOpen(false);
    };

    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-between border border-input bg-card py-1 transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            sizeClasses[selectSize],
            open && "ring-1 ring-ring",
          )}
        >
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder ?? "Select…"}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full border border-border bg-popover py-1 shadow-md">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                  "hover:bg-accent/50",
                  opt.value === value ? "text-primary font-medium" : "text-foreground",
                )}
              >
                <Check
                  className={cn(
                    "h-3 w-3 shrink-0",
                    opt.value === value ? "opacity-100" : "opacity-0",
                  )}
                />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };
export type { SelectProps };
