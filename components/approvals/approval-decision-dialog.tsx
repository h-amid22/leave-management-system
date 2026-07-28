"use client";

import { useRef, useState } from "react";

import type { PendingApprovalRequest } from "@/lib/api/types";
import { formatDateRange } from "@/lib/leave/dates";

export type ApprovalDecision = "approve" | "reject";

interface ApprovalDecisionDialogProps {
  decision: ApprovalDecision;
  request: PendingApprovalRequest;
  disabled?: boolean;
  onDecision: (decision: ApprovalDecision, comment: string) => Promise<void>;
}

export function ApprovalDecisionDialog({
  decision,
  request,
  disabled = false,
  onDecision,
}: ApprovalDecisionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isReject = decision === "reject";

  function close() {
    if (submitting) return;
    dialogRef.current?.close();
    setComment("");
    setError(null);
    openerRef.current?.focus();
  }

  async function submit() {
    if (submittingRef.current) return;
    const normalizedComment = comment.trim();

    if (isReject && !normalizedComment) {
      setError("Enter a reason for rejecting this request.");
      return;
    }

    if (normalizedComment.length > 1000) {
      setError("Comment must be 1000 characters or fewer.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      await onDecision(decision, normalizedComment);
      dialogRef.current?.close();
      setComment("");
      openerRef.current?.focus();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to process this request.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        className={isReject ? "button button-secondary" : "button button-primary"}
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
        ref={openerRef}
        type="button"
      >
        {isReject ? "Reject" : "Approve"}
      </button>
      <dialog
        aria-describedby={`${decision}-${request.id}-summary`}
        aria-labelledby={`${decision}-${request.id}-title`}
        className="confirmation-dialog approval-dialog"
        onCancel={(event) => {
          if (submitting) event.preventDefault();
        }}
        ref={dialogRef}
      >
        <h2 id={`${decision}-${request.id}-title`}>
          {isReject ? "Reject leave request?" : "Approve leave request?"}
        </h2>
        <p id={`${decision}-${request.id}-summary`}>
          {request.requester.name} · {request.leaveType.name} · {formatDateRange(request.startDate, request.endDate)}
        </p>
        <div className="field-group">
          <div className="label-line">
            <label htmlFor={`${decision}-${request.id}-comment`}>
              {isReject ? "Rejection reason" : "Approval comment (optional)"}
            </label>
            <span>{comment.length}/1000</span>
          </div>
          <textarea
            autoFocus
            id={`${decision}-${request.id}-comment`}
            maxLength={1000}
            onChange={(event) => {
              setComment(event.target.value);
              setError(null);
            }}
            required={isReject}
            rows={4}
            value={comment}
          />
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="dialog-actions">
          <button className="button button-secondary" disabled={submitting} onClick={close} type="button">Cancel</button>
          <button
            className={isReject ? "button button-danger" : "button button-primary"}
            disabled={submitting}
            onClick={() => void submit()}
            type="button"
          >
            {submitting ? "Processing…" : isReject ? "Confirm rejection" : "Confirm approval"}
          </button>
        </div>
      </dialog>
    </>
  );
}
