import { useRef } from "react";
import { cn } from "../../lib/utils";
import { useRadiogroupArrows } from "../../hooks/useRadiogroupArrows";

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-7" : "translate-x-1",
        )}
      />
    </button>
  );
}

interface ToggleGroupProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  size?: "sm" | "md";
}

export function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: ToggleGroupProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  useRadiogroupArrows(ref);
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-xl bg-muted p-1"
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
            value === o.value
              ? "bg-card shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
