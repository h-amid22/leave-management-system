"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api/client";
import { leaveApi } from "@/lib/api/leave-api";
import type { LeaveRequest, LeaveRequestInput, LeaveType } from "@/lib/api/types";
import {
  calculateInclusiveDays,
  getTodayDateInputValue,
  toDateInputValue,
} from "@/lib/leave/dates";

interface LeaveRequestFormProps {
  mode: "create" | "edit";
  initialRequest?: LeaveRequest;
}

export interface LeaveFormValues {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export function validateLeaveRequestForm(
  values: LeaveFormValues,
  today = getTodayDateInputValue(),
) {
  if (!values.leaveTypeId) return "Select a leave type.";
  if (!values.startDate || !values.endDate) return "Choose both a start and end date.";
  if (values.startDate < today) return "The start date cannot be in the past.";
  if (values.endDate < values.startDate) return "The end date cannot be before the start date.";
  if (calculateInclusiveDays(values.startDate, values.endDate) < 1) {
    return "Choose a valid date range.";
  }
  if (values.reason.trim().length > 1000) return "Reason must be 1000 characters or fewer.";
  return null;
}

export function LeaveRequestForm({ mode, initialRequest }: LeaveRequestFormProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [values, setValues] = useState<LeaveFormValues>({
    leaveTypeId: initialRequest?.leaveTypeId ?? "",
    startDate: initialRequest ? toDateInputValue(initialRequest.startDate) : "",
    endDate: initialRequest ? toDateInputValue(initialRequest.endDate) : "",
    reason: initialRequest?.reason ?? "",
  });
  const today = getTodayDateInputValue();
  const requestedDays = useMemo(
    () => calculateInclusiveDays(values.startDate, values.endDate),
    [values.startDate, values.endDate],
  );

  useEffect(() => {
    let active = true;

    leaveApi
      .getLeaveTypes()
      .then((types) => {
        if (active) setLeaveTypes(types);
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load leave types.");
        }
      })
      .finally(() => {
        if (active) setLoadingTypes(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function updateField(field: keyof LeaveFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) return;

    const validationError = validateLeaveRequestForm(values, today);
    if (validationError) {
      setError(validationError);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const input: LeaveRequestInput = {
      leaveTypeId: values.leaveTypeId,
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason.trim() || null,
    };

    try {
      const request =
        mode === "edit" && initialRequest
          ? await leaveApi.updateLeaveRequest(initialRequest.id, input)
          : await leaveApi.createLeaveRequest(input);
      setSuccess(mode === "edit" ? "Leave request updated." : "Leave request submitted.");
      router.push(`/leave/${request.id}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError || caughtError instanceof Error
          ? caughtError.message
          : "The leave request could not be saved.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="leave-form card" onSubmit={handleSubmit} noValidate>
      <div className="form-section-head">
        <span className="section-number">1</span>
        <div><h2>Leave details</h2><p>Choose the type of leave and requested dates.</p></div>
      </div>

      <div className="field-group">
        <label htmlFor="leaveTypeId">Leave type</label>
        <select
          id="leaveTypeId"
          value={values.leaveTypeId}
          onChange={(event) => updateField("leaveTypeId", event.target.value)}
          disabled={loadingTypes || isSubmitting}
          required
        >
          <option value="">{loadingTypes ? "Loading leave types…" : "Select leave type"}</option>
          {leaveTypes.map((leaveType) => (
            <option value={leaveType.id} key={leaveType.id}>
              {leaveType.name}{leaveType.isPaid ? "" : " (unpaid)"}
            </option>
          ))}
        </select>
      </div>

      <div className="date-grid">
        <div className="field-group">
          <label htmlFor="startDate">Start date</label>
          <input
            id="startDate"
            type="date"
            min={today}
            value={values.startDate}
            onChange={(event) => updateField("startDate", event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="field-group">
          <label htmlFor="endDate">End date</label>
          <input
            id="endDate"
            type="date"
            min={values.startDate || today}
            value={values.endDate}
            onChange={(event) => updateField("endDate", event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <div className="duration-callout" aria-live="polite">
        <Icon name="calendar" />
        <span>Requested duration</span>
        <strong>{requestedDays || "—"} {requestedDays === 1 ? "day" : "days"}</strong>
      </div>

      <div className="form-divider" />
      <div className="form-section-head">
        <span className="section-number">2</span>
        <div><h2>Additional information</h2><p>Add an optional note for your approver.</p></div>
      </div>

      <div className="field-group">
        <div className="label-line"><label htmlFor="reason">Reason</label><span>{values.reason.length}/1000</span></div>
        <textarea
          id="reason"
          rows={5}
          maxLength={1000}
          placeholder="Briefly explain your request…"
          value={values.reason}
          onChange={(event) => updateField("reason", event.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {success ? <p className="form-success" role="status">{success}</p> : null}

      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </button>
        <button className="button button-primary" type="submit" disabled={isSubmitting || loadingTypes}>
          {isSubmitting ? "Saving…" : mode === "edit" ? "Save changes" : "Submit request"}
          {!isSubmitting ? <Icon name="arrow-right" /> : null}
        </button>
      </div>
    </form>
  );
}
