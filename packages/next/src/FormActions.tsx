import type { MouseEvent, ReactNode } from "react";
import { Button } from "./Button";
import { PrimaryButton } from "./PrimaryButton";

interface FormActionsProps {
  onSave?: (event: MouseEvent<HTMLButtonElement>) => void;
  onCancel?: (event: MouseEvent<HTMLButtonElement>) => void;
  cancelHref?: string;
  saveLabel?: string;
  cancelLabel?: string;
  left?: ReactNode;
  className?: string;
}

export function FormActions({
  onSave,
  onCancel,
  cancelHref,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  left,
  className = "",
}: FormActionsProps) {
  const showRight = onSave || onCancel || cancelHref;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 pt-5 ${className}`}
    >
      <div className="flex flex-wrap gap-3">{left}</div>

      {showRight && (
        <div className="flex flex-wrap gap-3 sm:ml-auto">
          {(onCancel || cancelHref) && (
            <Button
              variant="secondary"
              href={cancelHref}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          )}
          {onSave && <PrimaryButton onClick={onSave}>{saveLabel}</PrimaryButton>}
        </div>
      )}
    </div>
  );
}
