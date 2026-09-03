import Link from "next/link";
import { AdminHeader, Panel, StatRow } from "@/components/admin/shell";
import { Badge } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const metadata = { title: "Services & locations" };

export default async function AdminTaxonomyPage() {
  await requireStaff();

  const [categories, countries, subserviceCount, cityCount] = await Promise.all([
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { subservices: true, rankings: true, businesses: true } },
      },
    }),
    db.country.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        regions: {
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { cities: true, rankings: true } },
            cities: { orderBy: { name: "asc" }, include: { _count: { select: { rankings: true } } } },
          },
        },
      },
    }),
    db.subservice.count(),
    db.city.count({ where: { published: true } }),
  ]);

  const regionCount = countries.reduce((total, country) => total + country.regions.length, 0);

  return (
    <>
      <AdminHeader
        title="Services and locations"
        description="The taxonomy behind every URL. Changing a slug changes the public address, so the old one is redirected for you."
        actions={
          <>
            <Link href="/admin/taxonomy/services/new" className="btn btn--secondary btn--sm">
              New service
            </Link>
            <Link href="/admin/taxonomy/cities/new" className="btn btn--primary btn--sm">
              New city
            </Link>
          </>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Services", value: categories.length },
          { label: "Subservices", value: subserviceCount },
          { label: "Regions", value: regionCount },
          { label: "Cities live", value: cityCount },
        ]}
      />

      <Panel
        title="Services"
        description="Order here drives the homepage grid and the header mega menu."
        padded={false}
      >
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Band</th>
                <th scope="col">Nav group</th>
                <th scope="col">Subservices</th>
                <th scope="col">Rankings</th>
                <th scope="col">Businesses</th>
                <th scope="col">Flags</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <Link
                      href={`/admin/taxonomy/services/${category.id}`}
                      className="admin-table__primary"
                    >
                      {category.name}
                    </Link>
                    <span className="admin-table__meta">/{category.slug}/</span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{category.groupName ?? "—"}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{category.navGroup ?? "Not in menu"}</td>
                  <td className="admin-table__num">{category._count.subservices}</td>
                  <td className="admin-table__num">{category._count.rankings}</td>
                  <td className="admin-table__num">{category._count.businesses}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {category.featured ? <Badge tone="brand">Featured</Badge> : null}
                      {category.wide ? <Badge tone="neutral">Wide tile</Badge> : null}
                      {!category.published ? <Badge tone="warning">Hidden</Badge> : null}
                    </div>
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <Link
                        href={routes.category(category.slug)}
                        target="_blank"
                        className="btn btn--ghost btn--sm"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/taxonomy/services/${category.id}`}
                        className="btn btn--secondary btn--sm"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {countries.map((country) => (
        <Panel
          key={country.id}
          title={country.name}
          description={`${country.regions.length} ${country.regionLabel} · ${routes.country(country.code)}`}
          padded={false}
          actions={
            <>
              <Link
                href={`/admin/taxonomy/countries/${country.id}`}
                className="btn btn--ghost btn--sm"
              >
                Edit country
              </Link>
              <Link href="/admin/taxonomy/regions/new" className="btn btn--ghost btn--sm">
                New region
              </Link>
            </>
          }
        >
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{country.regionLabel === "provinces" ? "Province" : "State"}</th>
                  <th scope="col">Code</th>
                  <th scope="col">Group</th>
                  <th scope="col">Cities</th>
                  <th scope="col">Rankings</th>
                  <th scope="col">Licensing notes</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {country.regions.map((region) => (
                  <tr key={region.id}>
                    <td>
                      <Link
                        href={`/admin/taxonomy/regions/${region.id}`}
                        className="admin-table__primary"
                      >
                        {region.name}
                      </Link>
                      <span className="admin-table__meta">
                        {region.cities.map((city) => city.name).join(" · ") || "No cities yet"}
                      </span>
                    </td>
                    <td>{region.code.toUpperCase()}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{region.groupName ?? "—"}</td>
                    <td className="admin-table__num">{region._count.cities}</td>
                    <td className="admin-table__num">{region._count.rankings}</td>
                    <td>{region.licensing ? <Badge tone="positive">Recorded</Badge> : "—"}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Link
                          href={routes.region(country.code, region.slug)}
                          target="_blank"
                          className="btn btn--ghost btn--sm"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/taxonomy/regions/${region.id}`}
                          className="btn btn--secondary btn--sm"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}

      <Panel
        title="Cities"
        description="Every city, whether or not it has a list yet."
        padded={false}
      >
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">City</th>
                <th scope="col">Region</th>
                <th scope="col">Rankings</th>
                <th scope="col">Flags</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {countries.flatMap((country) =>
                country.regions.flatMap((region) =>
                  region.cities.map((city) => (
                    <tr key={city.id}>
                      <td>
                        <Link
                          href={`/admin/taxonomy/cities/${city.id}`}
                          className="admin-table__primary"
                        >
                          {city.name}
                        </Link>
                        <span className="admin-table__meta">
                          {routes.city(country.code, region.slug, city.slug)}
                        </span>
                      </td>
                      <td>
                        {region.name}, {country.name}
                      </td>
                      <td className="admin-table__num">{city._count.rankings}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {city.topMetro ? <Badge tone="brand">Top metro</Badge> : null}
                          {!city.published ? <Badge tone="warning">Hidden</Badge> : null}
                        </div>
                      </td>
                      <td>
                        <div className="admin-table__actions">
                          <Link
                            href={routes.city(country.code, region.slug, city.slug)}
                            target="_blank"
                            className="btn btn--ghost btn--sm"
                          >
                            View
                          </Link>
                          <Link
                            href={`/admin/taxonomy/cities/${city.id}`}
                            className="btn btn--secondary btn--sm"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )),
                ),
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
