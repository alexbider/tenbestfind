import Link from "next/link";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { GlobalsEditor } from "@/components/admin/GlobalsEditor";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Questions & criteria" };

export default async function AdminGlobalsPage() {
  await requireStaff();

  const [faqs, criteria, scoped] = await Promise.all([
    db.faq.findMany({ where: { scope: "GLOBAL" }, orderBy: { sortOrder: "asc" } }),
    db.criterion.findMany({ where: { scope: "GLOBAL" }, orderBy: { sortOrder: "asc" } }),
    db.faq.groupBy({ by: ["scope"], _count: { _all: true } }),
  ]);

  return (
    <>
      <AdminHeader
        title="Questions and criteria"
        description="The answers and the method that are not tied to one page."
        actions={
          <Link href="/how-we-rank/" target="_blank" className="btn btn--secondary btn--sm">
            View How we rank
          </Link>
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Site-wide content">
          <GlobalsEditor
            faqs={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))}
            criteria={criteria.map((criterion) => ({
              title: criterion.title,
              body: criterion.body,
              importance: criterion.importance,
              iconKey: criterion.iconKey ?? "",
            }))}
          />
        </Panel>

        <Panel title="Questions elsewhere" description="Edited on the page they belong to.">
          <dl className="transparency__grid" style={{ background: "none", padding: 0 }}>
            {scoped
              .filter((row) => row.scope !== "GLOBAL")
              .map((row) => (
                <div key={row.scope}>
                  <dt>{row.scope.toLowerCase()}</dt>
                  <dd>{row._count._all}</dd>
                </div>
              ))}
          </dl>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            A page with its own questions publishes those instead of the site-wide set, so the
            answers are the ones a reader on that page actually needs.
          </p>
        </Panel>
      </div>
    </>
  );
}
