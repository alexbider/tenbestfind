import Link from "next/link";
import { AdminHeader, EmptyState, Panel } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { GUIDE_TYPE_LABELS, guideTypeOf } from "@/lib/enums";
import { fullDate } from "@/lib/format";
import { parseList } from "@/lib/json";

export const metadata = { title: "Prompt templates" };

export default async function PromptTemplates() {
  await requireStaff();

  const templates = await db.promptTemplate.findMany({
    orderBy: [{ archived: "asc" }, { isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { jobs: true } } },
  });

  return (
    <>
      <AdminHeader
        title="Prompt templates"
        description="How each kind of guide gets written. Edited here rather than in the code, because what a cost guide should open with is an editorial decision."
        actions={
          <Link href="/admin/prompts/new" className="btn btn--primary btn--sm">
            New template
          </Link>
        }
      />

      <Panel padded={false}>
        {templates.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              title="No templates yet"
              body="The writer falls back to a built-in default. Create a template to change how it writes without a deploy."
            />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Written for</th>
                <th>House rules</th>
                <th>Model</th>
                <th>Words</th>
                <th>Used by</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} style={template.archived ? { opacity: 0.55 } : undefined}>
                  <td>
                    <Link href={`/admin/prompts/${template.id}`}>{template.name}</Link>
                    {template.isDefault ? (
                      <span style={{ marginLeft: 8, fontSize: 12, color: "var(--color-primary)" }}>default</span>
                    ) : null}
                  </td>
                  <td>
                    {template.guideType ? GUIDE_TYPE_LABELS[guideTypeOf(template.guideType)] : "Any"}
                  </td>
                  <td>{parseList(template.skills).length}</td>
                  <td>
                    {template.model}
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
                      {template.effort}
                    </span>
                  </td>
                  <td>{template.wordTarget}</td>
                  <td>{template._count.jobs}</td>
                  <td>{fullDate(template.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
