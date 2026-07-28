"use client";

import Link from "next/link";

import { DeleteConfirmationDialog } from "@/components/leave/delete-confirmation-dialog";
import { Icon } from "@/components/ui/icon";
import type { LeaveRequest } from "@/lib/api/types";

interface RequestActionsProps {
  request: LeaveRequest;
  onCancel: (id: string) => Promise<void>;
}

export function RequestActions({ request, onCancel }: RequestActionsProps) {
  if (request.status !== "PENDING") return null;

  return (
    <>
      <Link className="icon-button" href={`/leave/${request.id}/edit`} aria-label={`Edit ${request.leaveType.name} request`}>
        <Icon name="edit" />
      </Link>
      <DeleteConfirmationDialog
        requestLabel={`${request.leaveType.name} request`}
        onConfirm={() => onCancel(request.id)}
      />
    </>
  );
}
