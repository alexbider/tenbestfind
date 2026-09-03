import { db } from "./db";
import { crawlSite } from "./site-crawl";
import { extractFromSite } from "./site-extract";
import { fillServiceAreas } from "./geo";
import { normalizeName } from "./enrich";
import { PermanentError, type Effort } from "./anthropic";
import { stringify } from "./json";

// Filling in what a listing is missing from the company's own website.
//
// The rule the whole thing turns on: it never overwrites. A field an editor
// filled, or the writer produced, is left exactly as it is. Enrichment only
// ever puts something where there was nothing, which means it can be re-run on
// anything at any time without anyone having to check what it might undo.

const SLICE = 3;

export type EnrichAdvance = { changed: boolean; note: string };

export type EnrichEntry = {
  business: string;
  filled: string[];
  staff: number;
  photos: number;
  note: string | null;
};

export async function queueEnrichment(input: {
  businessIds: string[];
  batchId?: string;
  useModel?: boolean;
  userId?: string;
}): Promise<{ id: string; requested: number }> {
  // A company with no website has nothing to read, so it never enters the run.
  const withSites = await db.business.findMany({
    where: { id: { in: input.businessIds }, website: { not: null } },
    select: { id: true },
  });

  const run = await db.enrichRun.create({
    data: {
      businessIds: JSON.stringify(withSites.map((row) => row.id)),
      batchId: input.batchId ?? null,
      useModel: input.useModel ?? true,
      requested: withSites.length,
      skipped: input.businessIds.length - withSites.length,
      createdById: input.userId,
    },
  });

  return { id: run.id, requested: withSites.length };
}

/** One step, called by the worker until the run stops changing. */
export async function advanceEnrichment(runId: string): Promise<EnrichAdvance> {
  const run = await db.enrichRun.findUnique({ where: { id: runId } });
  if (!run) return { changed: false, note: "gone" };
  if (run.status !== "QUEUED" && run.status !== "RUNNING") {
    return { changed: false, note: run.status.toLowerCase() };
  }

  const ids = JSON.parse(run.businessIds) as string[];
  const done = run.processed;

  if (done >= ids.length) {
    await db.enrichRun.update({
      where: { id: runId },
      data: { status: "DONE", finishedAt: new Date() },
    });
    return {
      changed: true,
      note: `done: ${run.fieldsFilled} fields, ${run.photosAdded} photos, ${run.staffFound} people across ${run.processed} companies`,
    };
  }

  if (run.status === "QUEUED") {
    await db.enrichRun.update({
      where: { id: runId },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  }

  const slice = ids.slice(done, done + SLICE);
  const entries: EnrichEntry[] = [];
  let fields = 0;
  let staff = 0;
  let photos = 0;

  for (const businessId of slice) {
    try {
      const result = await enrichBusiness(businessId, {
        useModel: run.useModel,
        model: process.env.IMPORT_MODEL || undefined,
        effort: (process.env.IMPORT_EFFORT as Effort | undefined) ?? "low",
      });
      entries.push(result);
      fields += result.filled.length;
      staff += result.staff;
      photos += result.photos;
    } catch (error) {
      // A run that stops on the first bad website is useless, so anything that
      // is not a dead API key is recorded against the company and skipped.
      if (error instanceof PermanentError) {
        await db.enrichRun.update({
          where: { id: runId },
          data: {
            status: "FAILED",
            error: `${error.message} ${error.hint}`.slice(0, 900),
            finishedAt: new Date(),
          },
        });
        return { changed: true, note: `stopped: ${error.message}` };
      }
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });
      entries.push({
        business: business?.name ?? businessId,
        filled: [],
        staff: 0,
        photos: 0,
        note: error instanceof Error ? error.message.slice(0, 200) : String(error),
      });
    }
  }

  const existing = run.report ? (JSON.parse(run.report) as EnrichEntry[]) : [];
  await db.enrichRun.update({
    where: { id: runId },
    data: {
      processed: { increment: slice.length },
      fieldsFilled: { increment: fields },
      staffFound: { increment: staff },
      photosAdded: { increment: photos },
      report: JSON.stringify([...existing, ...entries].slice(-200)),
    },
  });

  return {
    changed: true,
    note: `${slice.length} read, ${fields} fields, ${photos} photos, ${staff} people`,
  };
}

/**
 * Reads one company's website and fills the gaps in its listing.
 *
 * Returns what it changed rather than a boolean, because the useful question
 * afterwards is always "what did that actually do".
 */
export async function enrichBusiness(
  businessId: string,
  options: { useModel?: boolean; model?: string; effort?: Effort } = {},
): Promise<EnrichEntry> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      category: { select: { serviceName: true, id: true } },
      city: { select: { name: true } },
      photos: { select: { url: true } },
      staff: { select: { name: true } },
      credentials: { select: { identifier: true, label: true } },
      services: { select: { subserviceId: true } },
    },
  });
  if (!business) throw new Error("That business no longer exists.");
  if (!business.website) {
    return { business: business.name, filled: [], staff: 0, photos: 0, note: "No website on file." };
  }

  const site = await crawlSite(business.website);
  if (site.pagesRead === 0) {
    return {
      business: business.name,
      filled: [],
      staff: 0,
      photos: 0,
      note: "Could not read the website. It may be down, or blocking crawlers.",
    };
  }

  const extraction = options.useModel
    ? await extractFromSite(
        {
          name: business.name,
          city: business.city?.name ?? null,
          trade: business.category.serviceName,
        },
        site,
        { model: options.model, effort: options.effort },
      )
    : null;

  // ------------------------------------------------------------ plain fields
  const data: Record<string, unknown> = {};
  const filled: string[] = [];

  const fill = (field: string, value: unknown, current: unknown) => {
    const empty = current === null || current === undefined || current === "";
    if (!empty || value === null || value === undefined || value === "") return;
    data[field] = value;
    filled.push(field);
  };

  fill("logoUrl", site.logo, business.logoUrl);
  fill("phone", extraction?.phone ?? site.phones[0] ?? null, business.phone);
  fill("email", site.emails[0] ?? null, business.email);
  fill("addressLine", extraction?.addressLine ?? null, business.addressLine);
  fill("yearFounded", extraction?.yearFounded ?? site.yearFounded, business.yearFounded);
  fill("employeeCount", extraction?.employeeCount ?? null, business.employeeCount);
  fill("warrantyTerms", extraction?.warrantyTerms ?? null, business.warrantyTerms);
  fill("licenseNumber", extraction?.licenseNumbers[0] ?? site.licenseNumbers[0] ?? null, business.licenseNumber);
  fill("description", extraction?.summary ?? site.summary, business.description);
  fill(
    "socialLinks",
    Object.keys(site.social).length > 0 ? stringify(site.social) : null,
    business.socialLinks,
  );
  fill(
    "paymentMethods",
    extraction?.paymentMethods.length ? stringify(extraction.paymentMethods) : null,
    business.paymentMethods,
  );
  fill("awards", extraction?.awards.length ? stringify(extraction.awards) : null, business.awards);
  fill("brands", extraction?.brands.length ? stringify(extraction.brands) : null, business.brands);

  // The three service flags are false by default rather than null, so "already
  // set" cannot be told from "never asked". They are only ever turned on.
  for (const flag of ["emergency", "financing", "freeEstimates", "insured"] as const) {
    if (extraction?.[flag] === true && business[flag] === false) {
      data[flag] = true;
      filled.push(flag);
    }
  }

  data.siteCrawledAt = new Date(site.crawledAt);

  if (Object.keys(data).length > 0) {
    await db.business.update({ where: { id: businessId }, data });
  }

  // ----------------------------------------------------------------- photos
  const have = new Set(business.photos.map((photo) => photo.url));
  const room = Math.max(0, 10 - business.photos.length);
  const newPhotos = site.images.filter((image) => !have.has(image.url)).slice(0, room);
  if (newPhotos.length > 0) {
    await db.businessPhoto.createMany({
      data: newPhotos.map((image, index) => ({
        businessId,
        url: image.url,
        // The site's own caption describes what is in the picture. Falling back
        // to the company name is honest but tells a screen reader nothing, so it
        // is only used when the site gave no alt text at all.
        alt: image.alt ?? `${business.name}${business.city ? ` in ${business.city.name}` : ""}`,
        sortOrder: business.photos.length + index,
      })),
    });
  }

  // ------------------------------------------------------------------ staff
  let staffAdded = 0;
  if (extraction?.staff.length) {
    const known = new Set(business.staff.map((person) => normalizeName(person.name)));
    const fresh = extraction.staff.filter((person) => !known.has(normalizeName(person.name)));
    if (fresh.length > 0) {
      await db.staffMember.createMany({
        data: fresh.map((person, index) => ({
          businessId,
          name: person.name,
          role: person.role,
          bio: person.bio,
          yearsExperience: person.yearsExperience,
          credentials: person.credentials.length > 0 ? stringify(person.credentials) : null,
          sortOrder: business.staff.length + index,
          source: "WEBSITE",
        })),
      });
      staffAdded = fresh.length;
    }
  }

  // ------------------------------------------------------------ credentials
  // Licence numbers and named certifications, both recorded as reported rather
  // than verified: the site printing it is a claim, not a register check.
  const heldIds = new Set(
    business.credentials.map((row) => (row.identifier ?? "").toUpperCase()).filter(Boolean),
  );
  const heldLabels = new Set(business.credentials.map((row) => normalizeName(row.label)));

  const newCredentials: {
    businessId: string;
    label: string;
    identifier?: string;
    imageUrl?: string;
    status: string;
    sourceUrl: string | null;
    sortOrder: number;
  }[] = [];

  // Both sources: the model reads them in context, the parser catches the ones
  // printed in a footer the model never sees because the page was too long.
  const licenceNumbers = [
    ...new Set([...(extraction?.licenseNumbers ?? []), ...site.licenseNumbers]),
  ];

  for (const identifier of licenceNumbers) {
    if (heldIds.has(identifier.toUpperCase())) continue;
    heldIds.add(identifier.toUpperCase());
    newCredentials.push({
      businessId,
      label: `${business.category.serviceName} licence`,
      identifier,
      status: "REPORTED",
      sourceUrl: business.website,
      sortOrder: business.credentials.length + newCredentials.length,
    });
  }

  // A badge image whose alt text matches the certification is attached to it,
  // so the mark and the words arrive as one thing rather than two.
  for (const certification of extraction?.certifications ?? []) {
    const key = normalizeName(certification);
    if (heldLabels.has(key)) continue;
    heldLabels.add(key);

    const badge = site.badges.find((row) => {
      const label = normalizeName(row.label);
      return label.length > 2 && (label.includes(key) || key.includes(label));
    });

    newCredentials.push({
      businessId,
      label: certification,
      imageUrl: badge?.url,
      status: "REPORTED",
      sourceUrl: business.website,
      sortOrder: business.credentials.length + newCredentials.length,
    });
  }

  if (newCredentials.length > 0) {
    await db.credential.createMany({ data: newCredentials });
    filled.push(
      `${newCredentials.length} credential${newCredentials.length === 1 ? "" : "s"}`,
    );
  }

  // --------------------------------------------------------------- services
  // Matched against the subservices this category actually offers, so a listing
  // never claims work that is not on the site's own taxonomy.
  if (extraction?.services.length) {
    const offered = await db.subservice.findMany({
      where: { categoryId: business.category.id },
      select: { id: true, name: true },
    });
    const already = new Set(business.services.map((row) => row.subserviceId));
    const wanted = extraction.services.map((service) => normalizeName(service));

    const matched = offered.filter((subservice) => {
      if (already.has(subservice.id)) return false;
      const target = normalizeName(subservice.name);
      return wanted.some(
        (service) => service === target || service.includes(target) || target.includes(service),
      );
    });

    if (matched.length > 0) {
      await db.businessService.createMany({
        data: matched.map((subservice) => ({ businessId, subserviceId: subservice.id })),
      });
      filled.push(`${matched.length} service${matched.length === 1 ? "" : "s"}`);
    }
  }

  // ------------------------------------------------------------------ areas
  const areas = await fillServiceAreas(businessId).catch(() => ({ added: 0, total: 0 }));
  if (areas.added > 0) filled.push(`${areas.added} area${areas.added === 1 ? "" : "s"}`);

  return {
    business: business.name,
    filled,
    staff: staffAdded,
    photos: newPhotos.length,
    note:
      filled.length === 0 && staffAdded === 0 && newPhotos.length === 0
        ? "Read the site, but everything it carries was already on the listing."
        : null,
  };
}
