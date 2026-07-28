import type { LeaveRequestStatus } from "@/generated/prisma/enums";

interface StatusBadgeProps {
  status: LeaveRequestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span aria-hidden="true" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
