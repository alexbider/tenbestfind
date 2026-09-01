import { AdminHeader, Panel } from "@/components/admin/shell";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/auth";
import { parseJson } from "@/lib/json";
import { db } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();

  const settings = await db.setting.findMany({ orderBy: [{ groupName: "asc" }, { key: "asc" }] });

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
              <strong style={{ display: "block", color: "var(--ink)" }}>SEO defaults</strong>
              Title template, sitemap generation, and whether paginated archives and search results
              are indexable. Per-page overrides always win.
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
