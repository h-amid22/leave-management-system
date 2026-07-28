"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminConfirmationDialog } from "@/components/admin/admin-confirmation-dialog";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { PageHeader } from "@/components/ui/page-header";
import { adminApi } from "@/lib/api/admin-api";
import type { AdminEmployeeDetail } from "@/lib/api/admin-types";
import { formatDate } from "@/lib/leave/dates";

export function EmployeeDetail({ employeeId }: { employeeId: string }) {
  const [employee, setEmployee] = useState<AdminEmployeeDetail | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; adminApi.getEmployee(employeeId).then((value) => { if (active) setEmployee(value); }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load employee."); }); return () => { active = false; }; }, [employeeId]);
  if (error) return <ErrorState message={error} />; if (!employee) return <LoadingState label="Loading employee profile…" />;
  async function deactivate() { const updated = await adminApi.deactivateEmployee(employeeId); setEmployee((current) => current ? { ...current, isActive: updated.isActive } : current); }
  return <div className="page-stack"><PageHeader eyebrow="Employee profile" title={employee.name} description={employee.email} actions={<><Link className="button button-secondary" href={`/admin/employees/${employee.id}/edit`}>Edit employee</Link>{employee.isActive ? <AdminConfirmationDialog trigger="Deactivate" title="Deactivate employee?" description="This blocks application access while preserving all leave and approval history." confirm="Deactivate account" danger onConfirm={deactivate} /> : null}</>} /><section className="card detail-card"><dl className="detail-list"><div><dt>Role</dt><dd>{employee.role}</dd></div><div><dt>Status</dt><dd>{employee.isActive ? "Active" : "Inactive"}</dd></div><div><dt>Department</dt><dd>{employee.department?.name ?? "Unassigned"}</dd></div><div><dt>Manager</dt><dd>{employee.manager?.name ?? "Not assigned"}</dd></div><div><dt>Authentication</dt><dd>{employee.authenticationLinked ? "Supabase linked" : "Not linked"}</dd></div><div><dt>Created</dt><dd>{formatDate(employee.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{formatDate(employee.updatedAt)}</dd></div></dl></section><section className="card admin-section"><h2>Leave balances</h2>{employee.leaveBalances.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Leave type</th><th>Year</th><th>Allowance</th><th>Used</th></tr></thead><tbody>{employee.leaveBalances.map((balance) => <tr key={balance.id}><td>{balance.leaveType.name}</td><td>{balance.year}</td><td>{balance.entitledDays}</td><td>{balance.usedDays}</td></tr>)}</tbody></table></div> : <p>No balances available.</p>}</section><section className="card admin-section"><h2>Recent leave requests</h2>{employee.leaveRequests.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Leave type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead><tbody>{employee.leaveRequests.map((request) => <tr key={request.id}><td>{request.leaveType.name}</td><td>{formatDate(request.startDate)} – {formatDate(request.endDate)}</td><td>{request.requestedDays}</td><td>{request.status}</td></tr>)}</tbody></table></div> : <p>No leave requests.</p>}</section></div>;
}
