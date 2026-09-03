import Link from "next/link";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { BusinessEditor } from "@/components/admin/BusinessEditor";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "New business" };

export default async function AdminNewBusiness() {
  await requireStaff();

  const [categories, cities, subservices] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.city.findMany({
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, region: { select: { code: true } } },
    }),
    db.subservice.findMany({
      orderBy: [{ category: { name: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true, categoryId: true, category: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <AdminHeader
        title="New business"
        description="Add a company by hand. It stays a draft until someone checks the details."
        actions={
          <Link href="/admin/businesses" className="btn btn--secondary btn--sm">
            Back to businesses
          </Link>
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Profile">
          <BusinessEditor
            business={{
              name: "",
              slug: "",
              categoryId: "",
              cityId: "",
              status: "DRAFT",
              tagline: "",
              overview: "",
              description: "",
              bestFor: "",
              editorialTake: "",
              strengths: [],
              considerations: [],
              logoUrl: "",
              website: "",
              phone: "",
              email: "",
              addressLine: "",
              postalCode: "",
              yearFounded: "",
              employeeCount: "",
              licenseNumber: "",
              warrantyTerms: "",
              emergency: false,
              financing: false,
              freeEstimates: false,
              verified: false,
              claimed: false,
              googleRating: "",
              googleReviewCount: "",
              hours: [],
              services: [],
              areas: [],
              staff: [],
              credentials: [],
              photos: [],
            }}
            categories={categories.map((category) => ({ id: category.id, label: category.name }))}
            cities={cities.map((city) => ({
              id: city.id,
              label: `${city.name}, ${city.region.code.toUpperCase()}`,
            }))}
            subservices={subservices.map((sub) => ({
              id: sub.id,
              label: sub.name,
              group: sub.category.name,
              categoryId: sub.categoryId,
            }))}
          />
        </Panel>

        <Panel title="Before you publish">
          <ul style={{ display: "grid", gap: 10, fontSize: 14.5, color: "var(--text-secondary)" }}>
            <li>The licence number goes in the credentials list, with the authority that issued it.</li>
            <li>Only tick verified once someone has actually checked against the register.</li>
            <li>
              Google&apos;s rating and review count are republished with attribution, so record them
              only when you have read them today.
            </li>
            <li>SEO overrides become editable once the company is saved.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
