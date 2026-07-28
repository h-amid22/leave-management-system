import Link from "next/link";

import { Icon } from "@/components/ui/icon";

export default function ForbiddenPage() {
  return (
    <section className="card empty-state forbidden-state">
      <span className="empty-icon"><Icon name="alert" /></span>
      <h1>Access restricted</h1>
      <p>Your account does not have permission to open this area.</p>
      <Link className="button button-primary" href="/dashboard">Return to dashboard</Link>
    </section>
  );
}
