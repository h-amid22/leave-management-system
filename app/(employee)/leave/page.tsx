import type { Metadata } from "next";

import { RequestHistory } from "@/components/leave/request-history";

export const metadata: Metadata = { title: "My Leave · LeaveFlow" };

export default function LeaveHistoryPage() {
  return <RequestHistory />;
}
