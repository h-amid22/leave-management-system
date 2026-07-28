"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApprovalDecisionDialog, type ApprovalDecision } from "@/components/approvals/approval-decision-dialog";
import { DeleteConfirmationDialog } from "@/components/leave/delete-confirmation-dialog";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { leaveApi } from "@/lib/api/leave-api";
import type { CurrentUser, LeaveBalance, LeaveRequest } from "@/lib/api/types";
import { formatDate, formatDateRange } from "@/lib/leave/dates";

interface RequestDetailsData {
  request: LeaveRequest;
  user: CurrentUser;
  balance: LeaveBalance | null;
}

function isApprover(user: CurrentUser) {
  return user.role === "MANAGER" || user.role === "HR" || user.role === "ADMIN";
}

export function RequestDetails({ requestId }: { requestId: string }) {
  const [data, setData] = useState<RequestDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const loadRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [request, user] = await Promise.all([
        leaveApi.getLeaveRequest(requestId),
        leaveApi.getCurrentUser(),
      ]);
      const balances =
        request.requester.id === user.id
          ? await leaveApi.getBalances()
          : isApprover(user)
            ? await leaveApi.getUserBalances(request.requester.id)
            : [];
      const balance = balances.find(
        (item) => item.leaveType.id === request.leaveTypeId && item.year === new Date(request.startDate).getUTCFullYear(),
      ) ?? null;
      setData({ request, user, balance });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load request.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    let active = true;
    Promise.all([leaveApi.getLeaveRequest(requestId), leaveApi.getCurrentUser()])
      .then(async ([request, user]) => {
        const balances = request.requester.id === user.id
          ? await leaveApi.getBalances()
          : isApprover(user)
            ? await leaveApi.getUserBalances(request.requester.id)
            : [];
        if (active) {
          setData({
            request,
            user,
            balance: balances.find((item) => item.leaveType.id === request.leaveTypeId && item.year === new Date(request.startDate).getUTCFullYear()) ?? null,
          });
        }
      })
      .catch((caughtError: unknown) => { if (active) setError(caughtError instanceof Error ? caughtError.message : "Unable to load request."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestId]);

  async function cancelRequest() {
    await leaveApi.cancelLeaveRequest(requestId);
    await loadRequest();
  }

  async function decide(decision: ApprovalDecision, comment: string) {
    if (acting) return;
    setActing(true);
    setNotice(null);
    try {
      if (decision === "approve") await leaveApi.approveLeaveRequest(requestId, comment);
      else await leaveApi.rejectLeaveRequest(requestId, comment);
      await loadRequest();
      setNotice(`Request ${decision === "approve" ? "approved" : "rejected"} successfully.`);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && (caughtError.status === 409 || caughtError.status === 403)) {
        await loadRequest();
        throw new Error(caughtError.status === 409 ? "This request was already processed or changed. Details have been refreshed." : "You no longer have permission to act on this request.");
      }
      throw caughtError;
    } finally {
      setActing(false);
    }
  }

  if (loading) return <LoadingState label="Loading leave request…" />;
  if (error) return <ErrorState message={error} onRetry={loadRequest} />;
  if (!data) return null;

  const { request, user, balance } = data;
  const isOwner = user.id === request.requester.id;
  const canDecide = !isOwner && isApprover(user) && request.status === "PENDING";

  return (
    <div className="page-stack detail-page">
      <div className="breadcrumb"><Link href={isOwner ? "/leave" : "/approvals"}>{isOwner ? "My leave" : "Pending approvals"}</Link><span>/</span><span>Request details</span></div>
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      <section className="page-header detail-header">
        <div><div className="title-with-status"><h1>{request.leaveType.name}</h1><StatusBadge status={request.status} /></div><p>Submitted {formatDate(request.submittedAt)}</p></div>
        {isOwner && request.status === "PENDING" ? (
          <div className="header-actions"><Link className="button button-secondary" href={`/leave/${request.id}/edit`}><Icon name="edit" /> Edit request</Link><DeleteConfirmationDialog requestLabel="leave request" onConfirm={cancelRequest} /></div>
        ) : null}
        {canDecide ? (
          <div className="header-actions">
            <ApprovalDecisionDialog decision="reject" disabled={acting} onDecision={decide} request={request} />
            <ApprovalDecisionDialog decision="approve" disabled={acting} onDecision={decide} request={request} />
          </div>
        ) : null}
      </section>

      <div className="detail-grid">
        <section className="card detail-card">
          <h2>Request information</h2>
          <dl className="detail-list">
            <div><dt>Employee</dt><dd>{request.requester.name}</dd></div>
            {!isOwner ? <div><dt>Email</dt><dd>{request.requester.email}</dd></div> : null}
            <div><dt>Department</dt><dd>{request.requester.department?.name ?? "Not assigned"}</dd></div>
            <div><dt>Manager</dt><dd>{request.requester.manager?.name ?? "Not assigned"}</dd></div>
            <div><dt>Leave type</dt><dd>{request.leaveType.name}{request.leaveType.isPaid ? " · Paid" : " · Unpaid"}</dd></div>
            <div><dt>Dates</dt><dd>{formatDateRange(request.startDate, request.endDate)}</dd></div>
            <div><dt>Duration</dt><dd>{Number(request.requestedDays)} {Number(request.requestedDays) === 1 ? "day" : "days"}</dd></div>
            <div><dt>Available balance</dt><dd>{balance ? `${balance.remainingDays} days` : "Not available"}</dd></div>
            <div className="detail-full"><dt>Reason</dt><dd>{request.reason || "No reason provided"}</dd></div>
          </dl>
        </section>

        <aside className="card timeline-card">
          <h2>Request timeline</h2>
          <ol className="timeline">
            <li><span className="timeline-dot timeline-dot-complete"><Icon name="check" /></span><div><strong>Request submitted</strong><small>{formatDate(request.submittedAt)}</small></div></li>
            {request.approvals.map((approval) => (
              <li key={approval.id}><span className={`timeline-dot timeline-dot-${approval.status.toLowerCase()}`}><Icon name={approval.status === "APPROVED" ? "check" : "alert"} /></span><div><strong>{approval.status === "APPROVED" ? "Approved" : "Rejected"} by {approval.approver.name}</strong><small>{approval.decidedAt ? formatDate(approval.decidedAt) : "Decision pending"}</small>{approval.comment ? <p>{approval.comment}</p> : null}</div></li>
            ))}
            {request.status === "PENDING" ? <li><span className="timeline-dot"><Icon name="clock" /></span><div><strong>Awaiting approval</strong><small>Waiting for an authorized reviewer.</small></div></li> : null}
          </ol>
          <div className="timestamp-list"><span>Last updated</span><strong>{formatDate(request.updatedAt)}</strong></div>
        </aside>
      </div>
    </div>
  );
}
