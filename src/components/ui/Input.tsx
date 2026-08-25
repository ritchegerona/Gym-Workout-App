import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const base =
  "h-12 w-full rounded-xl border border-input bg-card px-3.5 text-base " +
  "placeholder:text-muted-foreground focus:border-primary focus:outline-2 " +
  "focus:outline-offset-0 focus:outline-ring disabled:opacity-50";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, className)} {...props} />
));
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(base, "appearance-none pr-8", className)} {...props} />
));
Select.displayName = "Select";
