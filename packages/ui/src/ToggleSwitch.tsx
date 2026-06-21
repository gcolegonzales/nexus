import type { ReactNode } from "react";

export type ToggleSwitchSize = "md" | "sm";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-label": string;
  id?: string;
  disabled?: boolean;
  size?: ToggleSwitchSize;
  /** Shown in the thumb when `checked` is false. */
  offIcon?: ReactNode;
  /** Shown in the thumb when `checked` is true. */
  onIcon?: ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<
  ToggleSwitchSize,
  { track: string; thumb: string; thumbOn: string }
> = {
  md: {
    track: "h-7 w-12",
    thumb: "top-0.5 left-0.5 h-5 w-5",
    thumbOn: "translate-x-6",
  },
  sm: {
    track: "h-5 w-9",
    thumb: "top-0.5 left-0.5 h-4 w-4",
    thumbOn: "translate-x-4",
  },
};

export function ToggleSwitch({
  checked,
  onChange,
  "aria-label": ariaLabel,
  id,
  disabled = false,
  size = "md",
  offIcon,
  onIcon,
  className = "",
}: ToggleSwitchProps) {
  const hasIcons = Boolean(offIcon || onIcon);
  const sizeClass = SIZE_CLASSES[size];

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 cursor-pointer rounded-full border transition-colors duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass.track} ${
        checked
          ? "border-primary/60 bg-primary/35 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]"
          : "border-primary/40 bg-primary/15 shadow-[inset_0_1px_2px_rgba(30,41,59,0.08)]"
      } ${className}`}
    >
      <span
        className={`absolute flex items-center justify-center rounded-full bg-surface transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${sizeClass.thumb} ${
          checked
            ? `${sizeClass.thumbOn} shadow-sm ring-1 ring-primary/25`
            : "translate-x-0 shadow-[0_1px_4px_rgba(30,41,59,0.18)] ring-1 ring-primary/20"
        }`}
      >
        {hasIcons ? (
          <>
            {offIcon ? (
              <span
                className={`absolute flex items-center justify-center transition-all duration-300 ${
                  checked
                    ? "scale-75 rotate-90 opacity-0"
                    : "scale-100 rotate-0 opacity-100"
                }`}
              >
                {offIcon}
              </span>
            ) : null}
            {onIcon ? (
              <span
                className={`absolute flex items-center justify-center transition-all duration-300 ${
                  checked
                    ? "scale-100 rotate-0 opacity-100"
                    : "scale-75 -rotate-90 opacity-0"
                }`}
              >
                {onIcon}
              </span>
            ) : null}
          </>
        ) : null}
      </span>
    </button>
  );
}
