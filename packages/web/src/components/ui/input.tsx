import * as React from "react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  default: "h-9 text-sm px-3 py-1",
  sm: "h-7 text-xs px-2 py-0.5",
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "default" | "sm";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-none border border-input bg-card/80 transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          sizeClasses[inputSize],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
