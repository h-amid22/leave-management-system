import type { Metadata } from "next";

import { ApprovalQueue } from "@/components/approvals/approval-queue";

export const metadata: Metadata = { title: "Pending approvals · LeaveFlow" };

export default function ApprovalsPage() {
  return <ApprovalQueue />;
}
