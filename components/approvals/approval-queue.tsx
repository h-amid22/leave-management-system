"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ApprovalDecisionDialog, type ApprovalDecision } from "@/components/approvals/approval-decision-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/async-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api/client";
import { leaveApi } from "@/lib/api/leave-api";
import type { PendingApprovalRequest } from "@/lib/api/types";
import { formatDate, formatDateRange } from "@/lib/leave/dates";

type ApprovalSort = "startDate" | "submittedOldest" | "submittedNewest";

export function ApprovalQueue() {
  const [requests, setRequests] = useState<PendingApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [department, setDepartment] = useState("");
  const [sort, setSort] = useState<ApprovalSort>("startDate");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leaveApi.getPendingApprovals({ page: 1, pageSize: 100 });
      setRequests(response.data);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        setError("Your session has expired. Sign in again to continue.");
      } else if (caughtError instanceof ApiError && caughtError.status === 403) {
        setError("Your account no longer has permission to review approvals.");
      } else {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load approvals.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    leaveApi.getPendingApprovals({ page: 1, pageSize: 100 })
      .then((response) => { if (active) setRequests(response.data); })
      .catch((caughtError: unknown) => {
        if (!active) return;
        if (caughtError instanceof ApiError && caughtError.status === 401) setError("Your session has expired. Sign in again to continue.");
        else if (caughtError instanceof ApiError && caughtError.status === 403) setError("Your account no longer has permission to review approvals.");
        else setError(caughtError instanceof Error ? caughtError.message : "Unable to load approvals.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const leaveTypes = useMemo(
    () => Array.from(new Map(requests.map((request) => [request.leaveType.id, request.leaveType])).values()),
    [requests],
  );
  const departments = useMemo(
    () => Array.from(new Set(requests.map((request) => request.requester.department?.name).filter((name): name is string => Boolean(name)))).sort(),
    [requests],
  );
  const visibleRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return requests
      .filter((request) => !normalizedSearch || request.requester.name.toLocaleLowerCase().includes(normalizedSearch))
      .filter((request) => !leaveType || request.leaveType.id === leaveType)
      .filter((request) => !department || request.requester.department?.name === department)
      .toSorted((left, right) => {
        if (sort === "submittedNewest") return Date.parse(right.submittedAt) - Date.parse(left.submittedAt);
        if (sort === "submittedOldest") return Date.parse(left.submittedAt) - Date.parse(right.submittedAt);
        return Date.parse(left.startDate) - Date.parse(right.startDate);
      });
  }, [department, leaveType, requests, search, sort]);

  async function decide(request: PendingApprovalRequest, decision: ApprovalDecision, comment: string) {
    if (actingId) return;
    setActingId(request.id);
    setError(null);
    setNotice(null);

    try {
      if (decision === "approve") await leaveApi.approveLeaveRequest(request.id, comment);
      else await leaveApi.rejectLeaveRequest(request.id, comment);

      setRequests((current) => current.filter((item) => item.id !== request.id));
      setNotice(`${request.requester.name}’s request was ${decision === "approve" ? "approved" : "rejected"}.`);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 409) {
        await loadRequests();
        setError("This request was already processed or changed. The queue has been refreshed.");
        return;
      }
      if (caughtError instanceof ApiError && caughtError.status === 401) throw new Error("Your session has expired. Sign in again to continue.");
      if (caughtError instanceof ApiError && caughtError.status === 403) {
        await loadRequests();
        setError("You no longer have permission to act on this request.");
        return;
      }
      throw caughtError;
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader description="Only requests within your server-authorized scope are shown." eyebrow="Team workflow" title="Pending approvals" />

      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      {error ? <ErrorState message={error} onRetry={loadRequests} /> : null}
      {loading ? <LoadingState label="Loading pending approvals…" /> : null}

      {!loading && requests.length ? (
        <section className="card approval-toolbar" aria-label="Approval filters">
          <div className="field-group"><label htmlFor="approval-search">Employee</label><input id="approval-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" type="search" value={search} /></div>
          <div className="field-group"><label htmlFor="approval-type">Leave type</label><select id="approval-type" onChange={(event) => setLeaveType(event.target.value)} value={leaveType}><option value="">All leave types</option>{leaveTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>
          <div className="field-group"><label htmlFor="approval-department">Department</label><select id="approval-department" onChange={(event) => setDepartment(event.target.value)} value={department}><option value="">All departments</option>{departments.map((name) => <option key={name}>{name}</option>)}</select></div>
          <div className="field-group"><label htmlFor="approval-sort">Sort</label><select id="approval-sort" onChange={(event) => setSort(event.target.value as ApprovalSort)} value={sort}><option value="startDate">Earliest leave first</option><option value="submittedOldest">Oldest submitted</option><option value="submittedNewest">Newest submitted</option></select></div>
        </section>
      ) : null}

      {!loading && !requests.length ? <EmptyState title="No requests awaiting review" message="There are currently no requests requiring your action." /> : null}
      {!loading && requests.length && !visibleRequests.length ? <EmptyState title="No matching requests" message="Adjust the search or filters to see other pending requests." /> : null}

      {!loading && visibleRequests.length ? (
        <section className="card approval-list" aria-label="Pending leave requests">
          {visibleRequests.map((request) => (
            <article className="approval-row" key={request.id}>
              <div className="approval-copy">
                <div className="request-title-line"><strong>{request.requester.name}</strong><StatusBadge status={request.status} /></div>
                <p>{request.requester.role.toLowerCase()} · {request.requester.department?.name ?? "No department"}</p>
                <p>{request.leaveType.name} · {formatDateRange(request.startDate, request.endDate)} · {Number(request.requestedDays)} {Number(request.requestedDays) === 1 ? "day" : "days"}</p>
                <small>Submitted {formatDate(request.submittedAt)}{request.reason ? ` · ${request.reason}` : " · No reason provided"}</small>
              </div>
              <div className="approval-actions">
                <Link className="button button-secondary" href={`/leave/${request.id}`}>View details</Link>
                <ApprovalDecisionDialog decision="reject" disabled={actingId !== null} onDecision={(decision, comment) => decide(request, decision, comment)} request={request} />
                <ApprovalDecisionDialog decision="approve" disabled={actingId !== null} onDecision={(decision, comment) => decide(request, decision, comment)} request={request} />
              </div>
            </article>
          ))}
        </section>
      ) : null}
      {requests.length >= 100 ? <p className="page-note">Showing the first 100 authorized pending requests.</p> : null}
    </div>
  );
}
