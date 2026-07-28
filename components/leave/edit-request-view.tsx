"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { leaveApi } from "@/lib/api/leave-api";
import type { LeaveRequest } from "@/lib/api/types";

export function EditRequestView({ requestId }: { requestId: string }) {
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    leaveApi.getLeaveRequest(requestId)
      .then((value) => { if (active) setRequest(value); })
      .catch((caughtError: unknown) => { if (active) setError(caughtError instanceof Error ? caughtError.message : "Unable to load request."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestId]);

  if (loading) return <LoadingState label="Loading request…" />;
  if (error) return <ErrorState message={error} />;
  if (!request) return null;

  if (request.status !== "PENDING") {
    return (
      <ErrorState
        message="This request is no longer pending and cannot be edited."
        onRetry={undefined}
      />
    );
  }

  return (
    <div className="form-page">
      <div className="breadcrumb"><Link href={`/leave/${request.id}`}>Request details</Link><span>/</span><span>Edit</span></div>
      <header className="page-header"><div><span className="eyebrow">Leave request</span><h1>Edit pending request</h1><p>Changes will be revalidated against your balance and existing leave.</p></div></header>
      <LeaveRequestForm mode="edit" initialRequest={request} />
    </div>
  );
}
