"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BalanceCard } from "@/components/leave/balance-card";
import { RequestRow } from "@/components/leave/request-row";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/async-state";
import { Icon } from "@/components/ui/icon";
import { MetricCard } from "@/components/ui/metric-card";
import { leaveApi } from "@/lib/api/leave-api";
import type { CurrentUser, LeaveBalance, LeaveRequest, PendingApprovalRequest } from "@/lib/api/types";

interface DashboardData {
  user: CurrentUser;
  balances: LeaveBalance[];
  requests: LeaveRequest[];
  pendingCount: number;
  approvalCount: number | null;
  upcomingApprovals: PendingApprovalRequest[];
}

function hasApprovalRole(user: CurrentUser) {
  return user.role === "MANAGER" || user.role === "HR" || user.role === "ADMIN";
}

async function fetchDashboardData(): Promise<DashboardData> {
  const user = await leaveApi.getCurrentUser();
  const [balances, recent, pending, approvals] = await Promise.all([
    leaveApi.getBalances(),
    leaveApi.getLeaveRequests({ page: 1, pageSize: 5 }),
    leaveApi.getLeaveRequests({ page: 1, pageSize: 1, status: "PENDING" }),
    hasApprovalRole(user)
      ? leaveApi.getPendingApprovals({ page: 1, pageSize: 3 })
      : Promise.resolve(null),
  ]);

  return {
    user,
    balances,
    requests: recent.data,
    pendingCount: pending.meta.total,
    approvalCount: approvals?.meta.total ?? null,
    upcomingApprovals: approvals?.data ?? [],
  };
}

export function EmployeeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchDashboardData());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchDashboardData()
      .then((value) => { if (active) setData(value); })
      .catch((caughtError: unknown) => {
        if (active) setError(caughtError instanceof Error ? caughtError.message : "Unable to load dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const currentBalances = useMemo(() => {
    if (!data) return [];
    const currentYear = new Date().getFullYear();
    return data.balances.filter((balance) => balance.year === currentYear);
  }, [data]);

  if (loading) return <LoadingState label="Loading your leave overview…" />;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;
  if (!data) return null;

  const findBalance = (code: string) => currentBalances.find((balance) => balance.leaveType.code === code);
  const totalAllowance = currentBalances.reduce((total, balance) => total + Number(balance.entitledDays), 0);
  const totalUsed = currentBalances.reduce((total, balance) => total + Number(balance.usedDays), 0);
  const totalRemaining = currentBalances.reduce((total, balance) => total + Number(balance.remainingDays), 0);

  return (
    <div className="page-stack">
      <section className="welcome-panel">
        <div>
          <span className="eyebrow">Your time away</span>
          <h1>Welcome back, {data.user.name.split(" ")[0]}</h1>
          <p>A clear view of your balance, requests, and the work that needs your attention.</p>
        </div>
        <Link className="button button-primary button-large" href="/leave/new">
          <Icon name="plus" /> Request leave
        </Link>
      </section>

      <section aria-labelledby="balances-heading">
        <div className="section-heading">
          <div><h2 id="balances-heading">Leave balances</h2><p>Current year entitlement and usage.</p></div>
          <span className="year-chip">{new Date().getFullYear()}</span>
        </div>
        <div className="balance-grid">
          <BalanceCard balance={findBalance("ANNUAL")} code="ANNUAL" name="Annual leave" tone="violet" />
          <BalanceCard balance={findBalance("SICK")} code="SICK" name="Sick leave" tone="blue" />
          <BalanceCard balance={findBalance("UNPAID")} code="UNPAID" name="Unpaid leave" tone="amber" />
        </div>
      </section>

      <section className="summary-grid" aria-label="Leave summary">
        <MetricCard detail="days this year" icon="calendar" label="Total allowance" tone="neutral" value={totalAllowance} />
        <MetricCard detail="across all leave" icon="check" label="Used leave" tone="mint" value={totalUsed} />
        <MetricCard detail="available to request" icon="sparkle" label="Remaining leave" tone="sage" value={totalRemaining} />
        <MetricCard detail="awaiting review" icon="clock" label="Pending requests" tone="sand" value={data.pendingCount} />
      </section>

      {data.approvalCount !== null ? (
        <section className="card approval-summary-card" aria-labelledby="approval-summary-heading">
          <div className="section-heading section-heading-compact">
            <div><span className="eyebrow">Team approvals</span><h2 id="approval-summary-heading">{data.approvalCount} awaiting your action</h2><p>Separate from your personal leave and balances above.</p></div>
            <Link className="button button-secondary" href="/approvals">Review queue <Icon name="arrow-right" /></Link>
          </div>
          {data.upcomingApprovals.length ? (
            <div className="approval-summary-list">
              {data.upcomingApprovals.map((request) => (
                <Link href={`/leave/${request.id}`} key={request.id}>
                  <strong>{request.requester.name}</strong>
                  <span>{request.leaveType.name} · {Number(request.requestedDays)} {Number(request.requestedDays) === 1 ? "day" : "days"}</span>
                </Link>
              ))}
            </div>
          ) : <p className="page-note">No requests currently require your action.</p>}
        </section>
      ) : null}

      <section className="card recent-card" aria-labelledby="recent-heading">
        <div className="section-heading section-heading-compact">
          <div><h2 id="recent-heading">Recent requests</h2><p>Your latest leave activity.</p></div>
          <Link className="text-link" href="/leave">View all <Icon name="arrow-right" /></Link>
        </div>
        {data.requests.length ? (
          <div className="request-list">
            {data.requests.map((request) => <RequestRow compact request={request} key={request.id} />)}
          </div>
        ) : (
          <EmptyState
            title="No leave requests yet"
            message="When you submit leave, its progress will appear here."
            action={<Link className="button button-secondary" href="/leave/new">Create first request</Link>}
          />
        )}
      </section>
    </div>
  );
}
