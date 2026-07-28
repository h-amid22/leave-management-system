import Link from "next/link";
import type { Metadata } from "next";

import { LeaveRequestForm } from "@/components/leave/leave-request-form";

export const metadata: Metadata = { title: "Request Leave · LeaveFlow" };

export default function NewLeaveRequestPage() {
  return (
    <div className="form-page">
      <div className="breadcrumb"><Link href="/leave">My leave</Link><span>/</span><span>New request</span></div>
      <header className="page-header"><div><span className="eyebrow">Leave request</span><h1>Request time away</h1><p>Submit your dates for approval. Calendar days are counted inclusively.</p></div></header>
      <LeaveRequestForm mode="create" />
    </div>
  );
}
