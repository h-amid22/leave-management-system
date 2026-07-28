"use client";

import { useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { adminApi } from "@/lib/api/admin-api";
import type { AdminSummary } from "@/lib/api/admin-types";

function DataBars({ title, data }: { title: string; data: Array<{ label: string; value: number }> }) {
  const maximum = Math.max(1, ...data.map((item) => item.value));
  return <section className="card admin-chart" aria-label={title}><h2>{title}</h2>{data.length ? <div className="data-bars">{data.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.value / maximum * 100}%` }} /></div><strong>{item.value}</strong></div>)}</div> : <p>No data available.</p>}</section>;
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; adminApi.getSummary().then((value) => { if (active) setData(value); }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load organization summary."); }); return () => { active = false; }; }, []);
  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Loading administration overview…" />;
  const metrics = data.metrics;
  return <div className="page-stack"><PageHeader eyebrow="Organization" title="Administration overview" description="Operational workforce, policy, and leave metrics from authorized organization data." /><section className="admin-metric-grid"><MetricCard icon="users" label="Active employees" value={metrics.activeEmployees} detail="enabled accounts" tone="sage" /><MetricCard icon="clock" label="Pending requests" value={metrics.pendingRequests} detail="organization-wide" tone="sand" /><MetricCard icon="check" label="Approved this month" value={metrics.approvedThisMonth} detail="completed decisions" tone="mint" /><MetricCard icon="alert" label="Rejected this month" value={metrics.rejectedThisMonth} detail="completed decisions" /><MetricCard icon="calendar" label="Currently on leave" value={metrics.currentlyOnLeave} detail="approved today" /><MetricCard icon="file" label="Active policies" value={metrics.activePolicies} detail="effective today" /><MetricCard icon="alert" label="Balance attention" value={metrics.balancesAttention} detail="negative balances" tone="sand" /></section><div className="admin-chart-grid"><DataBars title="Employees by role" data={data.employeesByRole} /><DataBars title="Employees by department" data={data.employeesByDepartment} /><DataBars title="Requests by leave type" data={data.requestsByLeaveType} /></div></div>;
}
