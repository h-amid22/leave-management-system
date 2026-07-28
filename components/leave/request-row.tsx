import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import type { LeaveRequest } from "@/lib/api/types";
import { formatDateRange } from "@/lib/leave/dates";

interface RequestRowProps {
  request: LeaveRequest;
  compact?: boolean;
  actions?: React.ReactNode;
}

export function RequestRow({ request, compact = false, actions }: RequestRowProps) {
  return (
    <article className={compact ? "request-row request-row-compact" : "request-row"}>
      <div className="request-type-mark" aria-hidden="true">
        {request.leaveType.code.slice(0, 1)}
      </div>
      <div className="request-primary">
        <div className="request-title-line">
          <Link href={`/leave/${request.id}`}>{request.leaveType.name}</Link>
          <StatusBadge status={request.status} />
        </div>
        <p>{formatDateRange(request.startDate, request.endDate)}</p>
      </div>
      <div className="request-days">
        <strong>{Number(request.requestedDays)}</strong>
        <span>{Number(request.requestedDays) === 1 ? "day" : "days"}</span>
      </div>
      {actions ? <div className="request-actions">{actions}</div> : null}
    </article>
  );
}
