import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { SeoSection, SeoPlaceholder } from "@/components/admin/SeoSection";
import {
  CategoryEditor,
  CityEditor,
  CountryEditor,
  RegionEditor,
} from "@/components/admin/TaxonomyEditors";
import { StatusPill } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { parseJson, parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const metadata = { title: "Taxonomy" };

const KINDS = ["services", "countries", "regions", "cities"] as const;
type Kind = (typeof KINDS)[number];

type Props = { params: Promise<{ kind: string; id: string }> };

type Licensing = { trade: string; authority?: string; licensed?: boolean; note?: string };
type Condition = { title: string; body?: string; iconKey?: string };

export default async function AdminTaxonomyEditor({ params }: Props) {
  await requireStaff();
  const { kind, id } = await params;
  if (!KINDS.includes(kind as Kind)) notFound();
  const isNew = id === "new";

  if (kind === "services") {
    const category = isNew
      ? null
      : await db.category.findUnique({
          where: { id },
          include: { subservices: { orderBy: { sortOrder: "asc" } } },
        });
    if (!isNew && !category) notFound();

    return (
      <>
        <AdminHeader
          title={category ? category.name : "New service"}
          description={
            category
              ? `${routes.category(category.slug)} · ${category.subservices.length} subservices`
              : "Add a trade to the taxonomy."
          }
          actions={
            <>
              {category ? <StatusPill status={category.published ? "PUBLISHED" : "DRAFT"} /> : null}
              {category ? (
                <Link
                  href={routes.category(category.slug)}
                  target="_blank"
                  className="btn btn--secondary btn--sm"
                >
                  View
                </Link>
              ) : null}
              <Link href="/admin/taxonomy" className="btn btn--secondary btn--sm">
                Back to taxonomy
              </Link>
            </>
          }
        />
        <div className="panel-grid panel-grid--wide">
          <Panel title="Service">
            <CategoryEditor
              category={{
                id: category?.id,
                name: category?.name ?? "",
                singular: category?.singular ?? "",
                serviceName: category?.serviceName ?? "",
                slug: category?.slug ?? "",
                iconKey: category?.iconKey ?? "wrench",
                tagline: category?.tagline ?? "",
                description: category?.description ?? "",
                groupName: category?.groupName ?? "",
                navGroup: category?.navGroup ?? "",
                navOrder: String(category?.navOrder ?? 0),
                sortOrder: String(category?.sortOrder ?? 0),
                featured: category?.featured ?? false,
                wide: category?.wide ?? false,
                trending: category?.trending ?? false,
                published: category?.published ?? true,
                subservices:
                  category?.subservices.map((sub) => ({
                    name: sub.name,
                    slug: sub.slug,
                    description: sub.description ?? "",
                    iconKey: sub.iconKey ?? "",
                    trending: sub.trending ? "yes" : "no",
                  })) ?? [],
              }}
            />
          </Panel>
          {category ? (
            <SeoSection
              entityType="category"
              entityId={category.id}
              path={routes.category(category.slug)}
              fallbackTitle={category.name}
              fallbackDescription={category.description ?? category.tagline ?? ""}
              contentSample={[category.description ?? "", category.tagline ?? ""].join(" ")}
            />
          ) : (
            <SeoPlaceholder what="service" />
          )}
        </div>
      </>
    );
  }

  if (kind === "countries") {
    const country = isNew
      ? null
      : await db.country.findUnique({
          where: { id },
          include: { faqs: { orderBy: { sortOrder: "asc" } }, _count: { select: { regions: true } } },
        });
    if (!isNew && !country) notFound();

    return (
      <>
        <AdminHeader
          title={country ? country.name : "New country"}
          description={
            country
              ? `${routes.country(country.code)} · ${country._count.regions} ${country.regionLabel}`
              : "Add a country to the location tree."
          }
          actions={
            <>
              {country ? (
                <Link
                  href={routes.country(country.code)}
                  target="_blank"
                  className="btn btn--secondary btn--sm"
                >
                  View
                </Link>
              ) : null}
              <Link href="/admin/taxonomy" className="btn btn--secondary btn--sm">
                Back to taxonomy
              </Link>
            </>
          }
        />
        <div className="panel-grid panel-grid--wide">
          <Panel title="Country">
            <CountryEditor
              country={{
                id: country?.id,
                code: country?.code ?? "",
                name: country?.name ?? "",
                slug: country?.slug ?? "",
                demonym: country?.demonym ?? "",
                currency: country?.currency ?? "USD",
                blurb: country?.blurb ?? "",
                heroImage: country?.heroImage ?? "",
                regionLabel: country?.regionLabel ?? "states",
                sortOrder: String(country?.sortOrder ?? 0),
                published: country?.published ?? true,
                faqs:
                  country?.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })) ?? [],
              }}
            />
          </Panel>
          {country ? (
            <SeoSection
              entityType="country"
              entityId={country.id}
              path={routes.country(country.code)}
              fallbackTitle={country.name}
              fallbackDescription={country.blurb ?? ""}
              contentSample={country.blurb ?? ""}
            />
          ) : (
            <SeoPlaceholder what="country" />
          )}
        </div>
      </>
    );
  }

  if (kind === "regions") {
    const region = isNew
      ? null
      : await db.region.findUnique({
          where: { id },
          include: { country: true, _count: { select: { cities: true } } },
        });
    if (!isNew && !region) notFound();

    const countries = await db.country.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    });

    const path = region ? routes.region(region.country.code, region.slug) : null;

    return (
      <>
        <AdminHeader
          title={region ? region.name : "New region"}
          description={
            region ? `${path} · ${region._count.cities} cities` : "Add a state or province."
          }
          actions={
            <>
              {region ? <StatusPill status={region.published ? "PUBLISHED" : "DRAFT"} /> : null}
              {path ? (
                <Link href={path} target="_blank" className="btn btn--secondary btn--sm">
                  View
                </Link>
              ) : null}
              <Link href="/admin/taxonomy" className="btn btn--secondary btn--sm">
                Back to taxonomy
              </Link>
            </>
          }
        />
        <div className="panel-grid panel-grid--wide">
          <Panel title="Region">
            <RegionEditor
              region={{
                id: region?.id,
                countryId: region?.countryId ?? countries[0]?.id ?? "",
                code: region?.code ?? "",
                name: region?.name ?? "",
                slug: region?.slug ?? "",
                blurb: region?.blurb ?? "",
                heroImage: region?.heroImage ?? "",
                groupName: region?.groupName ?? "",
                sortOrder: String(region?.sortOrder ?? 0),
                published: region?.published ?? true,
                licensing: parseJson<Licensing[]>(region?.licensing, []).map((row) => ({
                  trade: row.trade,
                  authority: row.authority ?? "",
                  licensed: row.licensed === false ? "no" : "yes",
                  note: row.note ?? "",
                })),
              }}
              countries={countries.map((country) => ({ id: country.id, label: country.name }))}
            />
          </Panel>
          {region && path ? (
            <SeoSection
              entityType="region"
              entityId={region.id}
              path={path}
              fallbackTitle={`${region.name} home services`}
              fallbackDescription={region.blurb ?? ""}
              contentSample={region.blurb ?? ""}
            />
          ) : (
            <SeoPlaceholder what="region" />
          )}
        </div>
      </>
    );
  }

  const city = isNew
    ? null
    : await db.city.findUnique({
        where: { id },
        include: {
          region: { include: { country: true } },
          _count: { select: { businesses: true, rankings: true } },
        },
      });
  if (!isNew && !city) notFound();

  const regions = await db.region.findMany({
    orderBy: [{ country: { sortOrder: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, country: { select: { name: true } } },
  });

  const cityPath = city
    ? routes.city(city.region.country.code, city.region.slug, city.slug)
    : null;

  return (
    <>
      <AdminHeader
        title={city ? city.name : "New city"}
        description={
          city
            ? `${cityPath} · ${city._count.rankings} rankings · ${city._count.businesses} companies`
            : "Add a city to the location tree."
        }
        actions={
          <>
            {city ? <StatusPill status={city.published ? "PUBLISHED" : "DRAFT"} /> : null}
            {cityPath ? (
              <Link href={cityPath} target="_blank" className="btn btn--secondary btn--sm">
                View
              </Link>
            ) : null}
            <Link href="/admin/taxonomy" className="btn btn--secondary btn--sm">
              Back to taxonomy
            </Link>
          </>
        }
      />
      <div className="panel-grid panel-grid--wide">
        <Panel title="City">
          <CityEditor
            city={{
              id: city?.id,
              regionId: city?.regionId ?? regions[0]?.id ?? "",
              name: city?.name ?? "",
              slug: city?.slug ?? "",
              county: city?.county ?? "",
              latitude: city?.latitude?.toString() ?? "",
              longitude: city?.longitude?.toString() ?? "",
              population: city?.population?.toString() ?? "",
              blurb: city?.blurb ?? "",
              heroImage: city?.heroImage ?? "",
              neighborhoods: city ? parseList(city.neighborhoods) : [],
              conditions: parseJson<Condition[]>(city?.conditions, []).map((row) => ({
                title: row.title,
                body: row.body ?? "",
                iconKey: row.iconKey ?? "",
              })),
              topMetro: city?.topMetro ?? false,
              sortOrder: String(city?.sortOrder ?? 0),
              published: city?.published ?? true,
            }}
            regions={regions.map((region) => ({
              id: region.id,
              label: `${region.name}, ${region.country.name}`,
            }))}
          />
        </Panel>
        {city && cityPath ? (
          <SeoSection
            entityType="city"
            entityId={city.id}
            path={cityPath}
            fallbackTitle={`${city.name} home services`}
            fallbackDescription={city.blurb ?? ""}
            contentSample={city.blurb ?? ""}
          />
        ) : (
          <SeoPlaceholder what="city" />
        )}
      </div>
    </>
  );
}
