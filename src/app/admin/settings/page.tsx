import Link from "next/link";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/auth";
import { parseJson } from "@/lib/json";
import { db } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();

  // Everything under `seo.` has its own screen at /admin/seo, which owns the
  // field list. Showing it here as well would give the same key two editors.
  const settings = await db.setting.findMany({
    where: { NOT: { key: { startsWith: "seo." } } },
    orderBy: [{ groupName: "asc" }, { key: "asc" }],
  });

  return (
    <>
      <AdminHeader
        title="Settings"
        description="Platform configuration. Values are typed: numbers stay numbers, switches stay booleans."
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Configuration">
          <SettingsForm
            settings={settings.map((setting) => ({
              key: setting.key,
              label: setting.label ?? setting.key,
              groupName: setting.groupName,
              value: parseJson<unknown>(setting.value, ""),
            }))}
          />
        </Panel>

        <Panel title="What these control">
          <ul style={{ display: "grid", gap: 16, fontSize: 14.5, lineHeight: 1.6, color: "var(--text-secondary)" }}>
            <li>
              <strong style={{ display: "block", color: "var(--ink)" }}>General</strong>
              Site name and contact address, used in structured data and the footer.
            </li>
            <li>
              <strong style={{ display: "block", color: "var(--ink)" }}>SEO</strong>
              Titles, robots, schema, the sitemap and the AI crawler rules live on their own screen.{" "}
              <Link href="/admin/seo">Open Global SEO</Link>.
            </li>
            <li>
              <strong style={{ display: "block", color: "var(--ink)" }}>Editorial</strong>
              Methodology version and review cadence. The cadence drives the &ldquo;due re-check&rdquo;
              flag on the rankings list.
            </li>
            <li>
              <strong style={{ display: "block", color: "var(--ink)" }}>Billing</strong>
              Currency, trial length and the invoice number prefix.
            </li>
            <li>
              <strong style={{ display: "block", color: "var(--ink)" }}>Analytics</strong>
              Event retention and the hour the nightly rollup runs.
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
