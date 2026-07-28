import { PageHeader } from "@/components/ui/page-header";

export default function AdminSettingsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Review the system configuration boundaries available to administrators."
      />
      <section className="card detail-section">
        <h2>Application configuration</h2>
        <p>
          Authentication credentials and deployment settings are managed through
          server environment variables. They are intentionally unavailable in the
          browser and cannot be changed from this workspace.
        </p>
      </section>
    </div>
  );
}
