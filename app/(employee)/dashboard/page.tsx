import type { Metadata } from "next";

import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";

export const metadata: Metadata = { title: "Dashboard · LeaveFlow" };

export default function DashboardPage() {
  return <EmployeeDashboard />;
}
