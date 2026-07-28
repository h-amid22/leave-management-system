"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";

interface DeleteConfirmationDialogProps {
  requestLabel: string;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmationDialog({
  requestLabel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (isDeleting) return;
    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      dialogRef.current?.close();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to cancel request.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        className="icon-button icon-button-danger"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`Cancel ${requestLabel}`}
      >
        <Icon name="trash" />
      </button>
      <dialog className="confirmation-dialog" ref={dialogRef}>
        <div className="dialog-icon"><Icon name="alert" /></div>
        <h2>Cancel leave request?</h2>
        <p>
          This marks the pending request as cancelled. Only pending requests can be
          cancelled, and this action cannot be undone here.
        </p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="dialog-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={isDeleting}
          >
            Keep request
          </button>
          <button
            className="button button-danger"
            type="button"
            onClick={confirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Cancelling…" : "Cancel request"}
          </button>
        </div>
      </dialog>
    </>
  );
}
