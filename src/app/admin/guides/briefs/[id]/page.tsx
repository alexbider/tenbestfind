import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { PromptTemplateForm, type TemplateDraft } from "@/components/admin/PromptTemplateForm";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_INSTRUCTIONS, DEFAULT_SYSTEM } from "@/lib/guide-writer";
import { parseList } from "@/lib/json";

export const metadata = { title: "Brief" };

export default async function PromptTemplateEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const stored = id === "new" ? null : await db.promptTemplate.findUnique({ where: { id } });
  if (id !== "new" && !stored) notFound();

  // A new template starts from the built-in defaults rather than an empty box,
  // because the useful thing to do with these is edit them, not compose them.
  const template: TemplateDraft = stored
    ? {
        id: stored.id,
        name: stored.name,
        slug: stored.slug,
        guideType: stored.guideType,
        system: stored.system,
        instructions: stored.instructions,
        model: stored.model,
        effort: stored.effort,
        wordTarget: stored.wordTarget,
        skills: parseList(stored.skills),
        notes: stored.notes,
        isDefault: stored.isDefault,
        archived: stored.archived,
      }
    : {
        name: "",
        slug: "",
        guideType: null,
        system: DEFAULT_SYSTEM,
        instructions: DEFAULT_INSTRUCTIONS,
        model: "claude-opus-5",
        effort: "high",
        wordTarget: 1400,
        skills: ["eeat-signals", "aeo-first", "no-fluff"],
        notes: null,
        isDefault: false,
        archived: false,
      };

  return (
    <>
      <AdminHeader
        title={stored ? stored.name : "New prompt template"}
        description={
          stored
            ? `${stored.slug} · ${stored.model} at ${stored.effort} effort`
            : "Starts from the built-in default. Edit it rather than writing one from nothing."
        }
      />
      <Panel>
        <PromptTemplateForm template={template} />
      </Panel>
    </>
  );
}
