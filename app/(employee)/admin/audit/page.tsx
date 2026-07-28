import Link from "next/link";
import { requireAdminUser } from "@/lib/auth/admin";
import { auditService } from "@/services/audit-service";
import { auditQuerySchema } from "@/validators/audit";
import { PageHeader } from "@/components/ui/page-header";

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>>; }

function text(value: string | string[] | undefined) { return typeof value === "string" ? value : undefined; }
function describe(action: string, actor: string, entity: string) {
  return `${actor} ${action.toLowerCase().replaceAll("_", " ")} ${entity}.`;
}

export default async function AuditPage({ searchParams }: Props) {
  const actor = await requireAdminUser();
  const raw = await searchParams;
  const filters = auditQuerySchema.parse({
    page: text(raw.page), pageSize: text(raw.pageSize), search: text(raw.search),
    action: text(raw.action), actorUserId: text(raw.actorUserId), entityType: text(raw.entityType),
    startDate: text(raw.startDate), endDate: text(raw.endDate), order: text(raw.order),
  });
  const result = await auditService.list(actor, filters);

  return <div className="page-stack">
    <PageHeader eyebrow="Governance" title="Administrative audit" description="Immutable, request-correlated business activity." />
    <section className="card">
      <form className="filters-grid" method="get" aria-label="Audit filters">
        <label>Search<input defaultValue={text(raw.search)} maxLength={100} name="search" /></label>
        <label>Action<input defaultValue={text(raw.action)} maxLength={100} name="action" /></label>
        <label>Entity<input defaultValue={text(raw.entityType)} maxLength={100} name="entityType" /></label>
        <label>From<input defaultValue={text(raw.startDate)} name="startDate" type="date" /></label>
        <label>To<input defaultValue={text(raw.endDate)} name="endDate" type="date" /></label>
        <label>Sort<select defaultValue={filters.order} name="order"><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label>
        <button className="button button-primary" type="submit">Apply filters</button>
      </form>
    </section>
    <section className="card" aria-label="Audit entries">
      {result.data.length ? <div className="table-wrap"><table><thead><tr><th>Time</th><th>Event</th><th>Entity</th><th>Request</th><th>Details</th></tr></thead><tbody>
        {result.data.map((event) => <tr key={event.id}>
          <td><time dateTime={event.createdAt.toISOString()}>{event.createdAt.toLocaleString()}</time></td>
          <td>{describe(event.action, event.actorName, event.targetEntityType)}</td>
          <td>{event.targetEntityId ?? "—"}</td><td><code>{event.requestId}</code></td>
          <td><details><summary>Metadata</summary><pre>{JSON.stringify(event.metadata, null, 2)}</pre></details></td>
        </tr>)}
      </tbody></table></div> : <p>No audit events match these filters.</p>}
      <nav aria-label="Audit pagination">
        {filters.page > 1 ? <Link href={`?page=${filters.page - 1}`}>Previous</Link> : null}
        <span> Page {result.meta.page} of {Math.max(1, result.meta.totalPages)} </span>
        {filters.page < result.meta.totalPages ? <Link href={`?page=${filters.page + 1}`}>Next</Link> : null}
      </nav>
    </section>
  </div>;
}
