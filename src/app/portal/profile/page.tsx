import Link from "next/link";
import { AdminHeader, EmptyState, Panel } from "@/components/admin/shell";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DescriptionForm, DetailsForm, ServicesForm, UploadButton } from "@/components/portal/ProfileForms";
import { Badge, StatusPill } from "@/components/ui/primitives";
import {
  deletePhoto,
  movePhoto,
  removeLogo,
  savePhotoAlt,
  withdrawDescription,
} from "@/app/actions/portal-profile";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { fullDate } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { resolvePortalBusiness } from "@/lib/portal";
import {
  DESCRIPTION_EDIT,
  MAX_OWNER_PHOTOS,
  descriptionEditKey,
  pendingDescriptionEdit,
  type DescriptionEditPayload,
} from "@/lib/portal-profile";
import { routes } from "@/lib/urls";

export const metadata = { title: "Profile" };

type Props = { searchParams: Promise<{ businessId?: string }> };

type OpeningHours = { day: string; opens?: string; closes?: string; closed?: boolean };

const DECISION_COPY: Record<string, string> = {
  approved: "approved and published",
  declined: "not approved",
  withdrawn: "withdrawn",
};

export default async function PortalProfile({ searchParams }: Props) {
  const user = await requireOwner();
  const params = await searchParams;
  const { business: chosen } = await resolvePortalBusiness(user, params.businessId);

  if (!chosen) {
    return (
      <>
        <AdminHeader title="Profile" />
        <Panel>
          <EmptyState
            title="No listing is attached to this account yet"
            body="Once a claim is approved, you can edit your profile here."
          />
        </Panel>
      </>
    );
  }

  const business = await db.business.findUnique({
    where: { id: chosen.id },
    include: {
      category: { select: { name: true } },
      city: { select: { regionId: true } },
      photos: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      services: { select: { subserviceId: true } },
      areas: { orderBy: { primary: "desc" }, select: { cityId: true, city: { select: { regionId: true } } } },
    },
  });
  if (!business) return null;

  // Places nearby: the company's own region, plus any region it already serves.
  const regionIds = [
    ...new Set([business.city?.regionId, ...business.areas.map((row) => row.city.regionId)].filter(Boolean)),
  ] as string[];

  const [subservices, cities, pending, decided] = await Promise.all([
    db.subservice.findMany({
      where: { categoryId: business.categoryId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.city.findMany({
      where: regionIds.length > 0 ? { regionId: { in: regionIds } } : undefined,
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, region: { select: { name: true } } },
      take: 1000,
    }),
    pendingDescriptionEdit(business.id),
    db.submission.findFirst({
      where: {
        kind: DESCRIPTION_EDIT,
        status: { in: ["RESOLVED", "CLOSED"] },
        payload: { startsWith: descriptionEditKey(business.id) },
      },
      orderBy: { resolvedAt: "desc" },
    }),
  ]);

  const pendingText = parseJson<Partial<DescriptionEditPayload>>(pending?.payload, {}).description ?? "";
  const decision = parseJson<{ decision?: string }>(decided?.payload, {}).decision;
  const live = business.status === "PUBLISHED";
  const hidden = { name: "businessId", value: business.id };

  return (
    <>
      <AdminHeader
        title="Profile"
        description={`${business.name} · ${business.category.name}`}
        actions={
          <>
            {business.status === "PENDING" ? (
              <Badge tone="warning">Not live yet, in editorial review</Badge>
            ) : (
              <StatusPill status={business.status} />
            )}
            {live ? (
              <Link href={routes.business(business.slug)} target="_blank" className="btn btn--secondary btn--sm">
                View profile
              </Link>
            ) : null}
          </>
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel
          title="Contact details and hours"
          description={live ? "Changes go live as soon as you save." : "Saved now, shown once your listing is live."}
        >
          <DetailsForm
            businessId={business.id}
            details={{
              phone: business.phone ?? "",
              website: business.website ?? "",
              email: business.email ?? "",
              addressLine: business.addressLine ?? "",
              postalCode: business.postalCode ?? "",
              licenseNumber: business.licenseNumber ?? "",
              insured: business.insured,
              hours: parseJson<OpeningHours[]>(business.hours, []).map((row) => ({
                day: row.day,
                opens: row.opens ?? "",
                closes: row.closes ?? "",
                closed: row.closed ? "yes" : "no",
              })),
            }}
          />
        </Panel>

        <Panel title="Services and service area" description="Changes go live as soon as you save.">
          <ServicesForm
            businessId={business.id}
            serviceOptions={subservices.map((row) => ({ id: row.id, label: row.name }))}
            areaOptions={cities.map((row) => ({ id: row.id, label: row.name, group: row.region.name }))}
            services={business.services.map((row) => row.subserviceId)}
            areas={business.areas.map((row) => row.cityId)}
          />
        </Panel>

        <Panel
          title="Description"
          description="An editor reads a new description before it goes on your profile."
        >
          {pending ? (
            <div style={{ marginBottom: 16 }}>
              <p style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <Badge tone="warning">Waiting for editor review</Badge>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Sent {fullDate(pending.createdAt)}. Your profile shows the old description until then.
                </span>
              </p>
              <form action={withdrawDescription}>
                <input type="hidden" {...hidden} />
                <ConfirmButton question="Withdraw this description change?">Withdraw change</ConfirmButton>
              </form>
            </div>
          ) : decided && decision ? (
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Your last change was {DECISION_COPY[decision] ?? decision}
              {decided.resolvedAt ? ` on ${fullDate(decided.resolvedAt)}` : ""}.
            </p>
          ) : null}
          <DescriptionForm businessId={business.id} current={business.description ?? ""} draft={pendingText} />
        </Panel>

        <Panel
          title="Logo"
          description="Square works best. Changes go live as soon as you upload."
        >
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl}
                alt=""
                width={72}
                height={72}
                style={{ objectFit: "contain", borderRadius: 8, border: "1px solid var(--border-subtle)" }}
              />
            ) : null}
            <div style={{ display: "grid", gap: 8 }}>
              <UploadButton
                businessId={business.id}
                target="logo"
                label={business.logoUrl ? "Replace logo" : "Upload logo"}
              />
              {business.logoUrl ? (
                <form action={removeLogo}>
                  <input type="hidden" {...hidden} />
                  <ConfirmButton question="Remove your logo?">Remove logo</ConfirmButton>
                </form>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel
          title={`Photos (${business.photos.length} of ${MAX_OWNER_PHOTOS})`}
          description="Your own work, team and vans. Describe each one so search engines and screen readers know what it shows."
          padded={business.photos.length === 0}
          actions={
            business.photos.length < MAX_OWNER_PHOTOS ? (
              <UploadButton businessId={business.id} target="photo" label="Add photos" />
            ) : null
          }
        >
          {business.photos.length === 0 ? (
            <EmptyState title="No photos yet" body="Profiles with photos of real jobs get more enquiries." />
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Photo</th>
                    <th scope="col">Description</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {business.photos.map((photo, index) => (
                    <tr key={photo.id}>
                      <td style={{ width: 120 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.alt ?? ""}
                          width={104}
                          height={72}
                          style={{ objectFit: "cover", borderRadius: 6 }}
                        />
                      </td>
                      <td>
                        <form action={savePhotoAlt} style={{ display: "flex", gap: 8 }}>
                          <input type="hidden" {...hidden} />
                          <input type="hidden" name="photoId" value={photo.id} />
                          <input
                            name="alt"
                            type="text"
                            maxLength={200}
                            defaultValue={photo.alt ?? ""}
                            placeholder="e.g. New boiler fitted in a loft"
                            aria-label="Photo description"
                            style={{ flex: 1, minWidth: 0 }}
                          />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Save
                          </button>
                        </form>
                      </td>
                      <td>
                        <div className="admin-table__actions">
                          {index > 0 ? (
                            <form action={movePhoto}>
                              <input type="hidden" {...hidden} />
                              <input type="hidden" name="photoId" value={photo.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button type="submit" className="btn btn--ghost btn--sm" aria-label="Move up">
                                ↑
                              </button>
                            </form>
                          ) : null}
                          {index < business.photos.length - 1 ? (
                            <form action={movePhoto}>
                              <input type="hidden" {...hidden} />
                              <input type="hidden" name="photoId" value={photo.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button type="submit" className="btn btn--ghost btn--sm" aria-label="Move down">
                                ↓
                              </button>
                            </form>
                          ) : null}
                          <form action={deletePhoto}>
                            <input type="hidden" {...hidden} />
                            <input type="hidden" name="photoId" value={photo.id} />
                            <ConfirmButton question="Delete this photo from your profile?">Delete</ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Set by our editors">
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
            Your ranking position and the editorial summary are written by our editors and can&apos;t be
            changed here. Think something is wrong? Reply to any email from us.
          </p>
        </Panel>
      </div>
    </>
  );
}
