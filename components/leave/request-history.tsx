"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { RequestActions } from "@/components/leave/request-actions";
import { RequestRow } from "@/components/leave/request-row";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/async-state";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { leaveApi } from "@/lib/api/leave-api";
import type { LeaveRequest, PaginationMeta } from "@/lib/api/types";
import type { LeaveRequestStatus } from "@/generated/prisma/enums";

export function RequestHistory() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LeaveRequestStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leaveApi.getLeaveRequests({
        page,
        pageSize: 10,
        status: status || undefined,
      });
      setRequests(response.data);
      setMeta(response.meta);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load leave requests.");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    let active = true;
    leaveApi.getLeaveRequests({
      page,
      pageSize: 10,
      status: status || undefined,
    })
      .then((response) => {
        if (active) {
          setError(null);
          setRequests(response.data);
          setMeta(response.meta);
        }
      })
      .catch((caughtError: unknown) => {
        if (active) setError(caughtError instanceof Error ? caughtError.message : "Unable to load leave requests.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [page, status]);

  async function cancelRequest(id: string) {
    await leaveApi.cancelLeaveRequest(id);
    await loadRequests();
  }

  return (
    <div className="page-stack">
      <PageHeader
        actions={<Link className="button button-primary" href="/leave/new"><Icon name="plus" /> Request leave</Link>}
        description="Track, review, and manage your submitted requests."
        eyebrow="My time away"
        title="Leave requests"
      />

      <section className="card history-card">
        <div className="history-toolbar">
          <div>
            <label htmlFor="status-filter">Filter by status</label>
            <select
              id="status-filter"
              value={status}
              onChange={(event) => {
                setLoading(true);
                setStatus(event.target.value as LeaveRequestStatus | "");
                setPage(1);
              }}
            >
              <option value="">All requests</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          {meta ? <span className="result-count">{meta.total} {meta.total === 1 ? "request" : "requests"}</span> : null}
        </div>

        {loading ? <LoadingState label="Loading leave requests…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={loadRequests} /> : null}
        {!loading && !error && !requests.length ? (
          <EmptyState
            title={status ? `No ${status.toLowerCase()} requests` : "No leave requests yet"}
            message={status ? "Try another status filter." : "Submit your first request when you need time away."}
            action={!status ? <Link className="button button-primary" href="/leave/new">Request leave</Link> : undefined}
          />
        ) : null}
        {!loading && !error && requests.length ? (
          <div className="request-list request-list-spaced">
            {requests.map((request) => (
              <RequestRow
                request={request}
                key={request.id}
                actions={<RequestActions request={request} onCancel={cancelRequest} />}
              />
            ))}
          </div>
        ) : null}

        {meta && meta.totalPages > 1 ? (
          <div className="pagination" aria-label="Request history pages">
            <button className="button button-secondary" type="button" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</button>
            <span>Page {meta.page} of {meta.totalPages}</span>
            <button className="button button-secondary" type="button" disabled={page >= meta.totalPages || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
