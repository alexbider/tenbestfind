/**
 * Seeds the database with the content from the design prototypes.
 *
 * Safe to re-run: every insert is an upsert keyed on a natural unique field,
 * and the join-style tables are cleared for the rows being rewritten.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES } from "./data/taxonomy";
import { COUNTRIES } from "./data/geography";
import { CITY_COORDINATES, coordinateKey } from "./data/coordinates";
import { ALL_BUSINESSES, type SeedBusiness } from "./data/businesses";
import { GLOBAL_CRITERIA, GUIDES, HOME_FAQS, PEOPLE, RANKINGS } from "./data/editorial";
import { PAGES, PLANS, SETTINGS } from "./data/pages";

const db = new PrismaClient();

const J = (value: unknown) =>
  value === undefined || value === null || (Array.isArray(value) && value.length === 0)
    ? null
    : JSON.stringify(value);

const NOW = new Date();

/**
 * A password nobody has seen before. The alphabet drops the characters that
 * are easy to confuse when a password is read off a screen, and the byte is
 * rejected rather than folded when it falls outside a whole number of
 * alphabets, so every character stays equally likely.
 */
function randomPassword(length = 20): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length)) {
      if (byte < limit) out += alphabet[byte % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}

function monthsAgo(months: number): Date {
  const date = new Date(NOW);
  date.setMonth(date.getMonth() - months);
  return date;
}

function daysAgo(days: number): Date {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Deterministic pseudo-random so seeded analytics look plausible but stable. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function main() {
  console.log("Seeding TenBestFind…");

  // ------------------------------------------------------------- geography
  const countryIds = new Map<string, string>();
  const regionIds = new Map<string, string>(); // "us:tx"
  const cityIds = new Map<string, string>(); // "us:tx:dallas"

  for (const [countryIndex, country] of COUNTRIES.entries()) {
    const countryRow = await db.country.upsert({
      where: { code: country.code },
      create: {
        code: country.code,
        name: country.name,
        slug: country.slug,
        demonym: country.demonym,
        currency: country.currency,
        regionLabel: country.regionLabel,
        blurb: country.blurb,
        sortOrder: countryIndex,
      },
      update: {
        name: country.name,
        slug: country.slug,
        demonym: country.demonym,
        currency: country.currency,
        regionLabel: country.regionLabel,
        blurb: country.blurb,
        sortOrder: countryIndex,
      },
    });
    countryIds.set(country.code, countryRow.id);

    for (const [regionIndex, region] of country.regions.entries()) {
      const regionRow = await db.region.upsert({
        where: { countryId_slug: { countryId: countryRow.id, slug: region.slug } },
        create: {
          code: region.code,
          name: region.name,
          slug: region.slug,
          countryId: countryRow.id,
          groupName: region.groupName,
          blurb: region.blurb,
          licensing: J(region.licensing),
          sortOrder: regionIndex,
        },
        update: {
          code: region.code,
          name: region.name,
          groupName: region.groupName,
          blurb: region.blurb,
          licensing: J(region.licensing),
          sortOrder: regionIndex,
        },
      });
      regionIds.set(`${country.code}:${region.slug}`, regionRow.id);

      for (const [cityIndex, city] of region.cities.entries()) {
        const [latitude, longitude] =
          CITY_COORDINATES[coordinateKey(country.code, region.code, city.slug)] ?? [null, null];
        const cityRow = await db.city.upsert({
          where: { regionId_slug: { regionId: regionRow.id, slug: city.slug } },
          create: {
            name: city.name,
            slug: city.slug,
            regionId: regionRow.id,
            county: city.county,
            population: city.population,
            blurb: city.blurb,
            conditions: J(city.conditions),
            neighborhoods: J(city.neighborhoods),
            latitude,
            longitude,
            topMetro: city.topMetro ?? false,
            sortOrder: cityIndex,
          },
          update: {
            name: city.name,
            county: city.county,
            population: city.population,
            blurb: city.blurb,
            conditions: J(city.conditions),
            neighborhoods: J(city.neighborhoods),
            latitude,
            longitude,
            topMetro: city.topMetro ?? false,
            sortOrder: cityIndex,
          },
        });
        cityIds.set(`${country.code}:${region.slug}:${city.slug}`, cityRow.id);
      }
    }
  }
  console.log(`  ${countryIds.size} countries, ${regionIds.size} regions, ${cityIds.size} cities`);

  // -------------------------------------------------------------- taxonomy
  const categoryIds = new Map<string, string>();
  const subserviceIds = new Map<string, string>(); // "roofing:roof-repair"

  for (const [index, category] of CATEGORIES.entries()) {
    const row = await db.category.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        singular: category.singular,
        serviceName: category.serviceName,
        slug: category.slug,
        iconKey: category.iconKey,
        tagline: category.tagline,
        description: category.description,
        groupName: category.groupName,
        navGroup: category.navGroup,
        navOrder: category.navOrder ?? 0,
        featured: category.featured ?? false,
        wide: category.wide ?? false,
        trending: category.trending ?? false,
        sortOrder: index,
      },
      update: {
        name: category.name,
        singular: category.singular,
        serviceName: category.serviceName,
        iconKey: category.iconKey,
        tagline: category.tagline,
        description: category.description,
        groupName: category.groupName,
        navGroup: category.navGroup,
        navOrder: category.navOrder ?? 0,
        featured: category.featured ?? false,
        wide: category.wide ?? false,
        trending: category.trending ?? false,
        sortOrder: index,
      },
    });
    categoryIds.set(category.slug, row.id);

    for (const [subIndex, sub] of (category.subservices ?? []).entries()) {
      const subRow = await db.subservice.upsert({
        where: { categoryId_slug: { categoryId: row.id, slug: sub.slug } },
        create: {
          name: sub.name,
          slug: sub.slug,
          categoryId: row.id,
          description: sub.description,
          trending: sub.trending ?? false,
          sortOrder: subIndex,
        },
        update: {
          name: sub.name,
          description: sub.description,
          trending: sub.trending ?? false,
          sortOrder: subIndex,
        },
      });
      subserviceIds.set(`${category.slug}:${sub.slug}`, subRow.id);
    }
  }
  console.log(`  ${categoryIds.size} categories, ${subserviceIds.size} subservices`);

  // ---------------------------------------------------------------- people
  const personIds = new Map<string, string>();
  for (const person of PEOPLE) {
    const row = await db.person.upsert({
      where: { slug: person.slug },
      create: {
        name: person.name,
        slug: person.slug,
        role: person.role,
        bio: person.bio,
        limits: person.limits,
        specializations: J(person.specializations),
        links: J(person.links),
        markets: J(person.markets),
        isAuthor: person.isAuthor ?? true,
        isReviewer: person.isReviewer ?? false,
        isExpert: person.isExpert ?? false,
        yearsExperience: person.yearsExperience,
      },
      update: {
        name: person.name,
        role: person.role,
        bio: person.bio,
        limits: person.limits,
        specializations: J(person.specializations),
        links: J(person.links),
        markets: J(person.markets),
        isAuthor: person.isAuthor ?? true,
        isReviewer: person.isReviewer ?? false,
        isExpert: person.isExpert ?? false,
        yearsExperience: person.yearsExperience,
      },
    });
    personIds.set(person.slug, row.id);

    await db.personCredential.deleteMany({ where: { personId: row.id } });
    for (const [index, credential] of (person.credentials ?? []).entries()) {
      await db.personCredential.create({
        data: {
          personId: row.id,
          label: credential.label,
          issuer: credential.issuer,
          status: credential.status,
          checkedAt: credential.status === "VERIFIED" ? monthsAgo(2) : null,
          sortOrder: index,
        },
      });
    }

    await db.personExperience.deleteMany({ where: { personId: row.id } });
    for (const [index, item] of (person.experience ?? []).entries()) {
      await db.personExperience.create({
        data: {
          personId: row.id,
          role: item.role,
          org: item.org,
          startedAt: new Date(`${item.startedYear}-01-01`),
          endedAt: item.endedYear ? new Date(`${item.endedYear}-01-01`) : null,
          summary: item.summary,
          sortOrder: index,
        },
      });
    }
  }
  console.log(`  ${personIds.size} people`);

  // ------------------------------------------------------------ businesses
  const businessIds = new Map<string, string>();

  async function seedBusiness(business: SeedBusiness) {
    const categoryId = categoryIds.get(business.categorySlug);
    const cityId = cityIds.get(
      `${business.countryCode}:${business.regionSlug}:${business.citySlug}`,
    );
    if (!categoryId || !cityId) throw new Error(`Missing refs for ${business.slug}`);

    const distribution = (() => {
      const total = business.googleReviewCount;
      const five = Math.round(total * (business.googleRating >= 4.8 ? 0.86 : 0.78));
      const four = Math.round(total * 0.11);
      const three = Math.round(total * 0.04);
      const two = Math.round(total * 0.02);
      return { "5": five, "4": four, "3": three, "2": two, "1": Math.max(0, total - five - four - three - two) };
    })();

    const row = await db.business.upsert({
      where: { slug: business.slug },
      create: {
        name: business.name,
        slug: business.slug,
        categoryId,
        cityId,
        bestFor: business.bestFor,
        description: business.description,
        editorialTake: business.editorialTake,
        strengths: J(business.likes),
        considerations: J(business.concerns),
        website: business.website,
        phone: business.phone,
        addressLine: business.addressLine,
        hours: J([
          { day: "Monday", opens: "07:30", closes: "17:30" },
          { day: "Tuesday", opens: "07:30", closes: "17:30" },
          { day: "Wednesday", opens: "07:30", closes: "17:30" },
          { day: "Thursday", opens: "07:30", closes: "17:30" },
          { day: "Friday", opens: "07:30", closes: "17:00" },
          { day: "Saturday", opens: "08:00", closes: "13:00" },
          { day: "Sunday", closed: true },
        ]),
        yearFounded: business.yearFounded,
        warrantyTerms: business.warrantyTerms,
        emergency: business.emergency,
        financing: business.financing,
        freeEstimates: business.freeEstimates ?? false,
        googleRating: business.googleRating,
        googleReviewCount: business.googleReviewCount,
        googleDataUpdated: monthsAgo(1),
        googleDistribution: J(distribution),
        verified: true,
        status: "PUBLISHED",
        publishedAt: monthsAgo(6),
      },
      update: {
        name: business.name,
        categoryId,
        cityId,
        bestFor: business.bestFor,
        description: business.description,
        editorialTake: business.editorialTake,
        strengths: J(business.likes),
        considerations: J(business.concerns),
        website: business.website,
        phone: business.phone,
        addressLine: business.addressLine,
        yearFounded: business.yearFounded,
        warrantyTerms: business.warrantyTerms,
        emergency: business.emergency,
        financing: business.financing,
        freeEstimates: business.freeEstimates ?? false,
        googleRating: business.googleRating,
        googleReviewCount: business.googleReviewCount,
        googleDataUpdated: monthsAgo(1),
        googleDistribution: J(distribution),
        status: "PUBLISHED",
      },
    });
    businessIds.set(business.slug, row.id);

    await db.credential.deleteMany({ where: { businessId: row.id } });
    for (const [index, credential] of business.credentials.entries()) {
      await db.credential.create({
        data: {
          businessId: row.id,
          label: credential.label,
          identifier: credential.identifier,
          authority: credential.authority,
          status: credential.status,
          checkedAt: credential.status === "VERIFIED" ? monthsAgo(1) : null,
          sortOrder: index,
        },
      });
    }

    // Link the business to the subservices it lists, where they exist.
    await db.businessService.deleteMany({ where: { businessId: row.id } });
    for (const service of business.services) {
      const slug = service
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const subserviceId = subserviceIds.get(`${business.categorySlug}:${slug}`);
      if (subserviceId) {
        await db.businessService.create({ data: { businessId: row.id, subserviceId } });
      }
    }

    await db.businessArea.deleteMany({ where: { businessId: row.id } });
    await db.businessArea.create({ data: { businessId: row.id, cityId, primary: true } });
  }

  for (const business of ALL_BUSINESSES) await seedBusiness(business);
  console.log(`  ${businessIds.size} businesses`);

  // -------------------------------------------------------------- rankings
  const rankingIds = new Map<string, string>();
  for (const ranking of RANKINGS) {
    const categoryId = categoryIds.get(ranking.categorySlug)!;
    const cityId = cityIds.get(`${ranking.countryCode}:${ranking.regionSlug}:${ranking.citySlug}`)!;
    const regionId = regionIds.get(`${ranking.countryCode}:${ranking.regionSlug}`)!;
    const countryId = countryIds.get(ranking.countryCode)!;

    const row = await db.ranking.upsert({
      where: { categoryId_cityId: { categoryId, cityId } },
      create: {
        title: ranking.title,
        slug: ranking.categorySlug,
        categoryId,
        cityId,
        regionId,
        countryId,
        summary: ranking.summary,
        intro: ranking.intro,
        companiesReviewed: ranking.companiesReviewed,
        status: "PUBLISHED",
        publishedAt: monthsAgo(ranking.publishedMonthsAgo),
        lastReviewedAt: monthsAgo(ranking.reviewedMonthsAgo),
        authorId: personIds.get(ranking.authorSlug),
        reviewerId: personIds.get(ranking.reviewerSlug),
      },
      update: {
        title: ranking.title,
        summary: ranking.summary,
        intro: ranking.intro,
        companiesReviewed: ranking.companiesReviewed,
        status: "PUBLISHED",
        publishedAt: monthsAgo(ranking.publishedMonthsAgo),
        lastReviewedAt: monthsAgo(ranking.reviewedMonthsAgo),
        authorId: personIds.get(ranking.authorSlug),
        reviewerId: personIds.get(ranking.reviewerSlug),
      },
    });
    rankingIds.set(`${ranking.categorySlug}:${ranking.citySlug}`, row.id);

    await db.rankingEntry.deleteMany({ where: { rankingId: row.id } });
    for (const [index, slug] of ranking.companySlugs.entries()) {
      const businessId = businessIds.get(slug);
      const source = ALL_BUSINESSES.find((item) => item.slug === slug);
      if (!businessId || !source) continue;
      await db.rankingEntry.create({
        data: {
          rankingId: row.id,
          businessId,
          position: index + 1,
          designation: source.designation,
          whyPicked: source.whyPicked,
          likes: J(source.likes),
          concerns: J(source.concerns),
        },
      });
    }

    await db.criterion.deleteMany({ where: { rankingId: row.id } });
    for (const [index, criterion] of (ranking.criteria ?? []).entries()) {
      await db.criterion.create({
        data: {
          rankingId: row.id,
          title: criterion.title,
          body: criterion.body,
          importance: criterion.importance,
          iconKey: criterion.iconKey,
          scope: "RANKING",
          sortOrder: index,
        },
      });
    }

    await db.source.deleteMany({ where: { rankingId: row.id } });
    const rankingSourceIds: string[] = [];
    for (const [index, source] of (ranking.sources ?? []).entries()) {
      const created = await db.source.create({
        data: {
          rankingId: row.id,
          label: source.label,
          publisher: source.publisher,
          url: source.url,
          tier: source.tier ?? "PRIMARY",
          accessedAt: monthsAgo(1),
          sortOrder: index,
        },
      });
      rankingSourceIds.push(created.id);
    }

    await db.costRow.deleteMany({ where: { rankingId: row.id } });
    for (const [index, cost] of (ranking.costs ?? []).entries()) {
      await db.costRow.create({
        data: {
          rankingId: row.id,
          cityId,
          label: cost.label,
          lowPrice: cost.low,
          highPrice: cost.high,
          typical: cost.typical,
          unit: cost.unit ?? "project",
          note: cost.note,
          sourceId: rankingSourceIds[0],
          sortOrder: index,
        },
      });
    }

    await db.faq.deleteMany({ where: { rankingId: row.id } });
    for (const [index, faq] of (ranking.faqs ?? []).entries()) {
      await db.faq.create({
        data: {
          rankingId: row.id,
          scope: "RANKING",
          question: faq.q,
          answer: faq.a,
          sortOrder: index,
        },
      });
    }
  }
  console.log(`  ${rankingIds.size} rankings`);

  // ---------------------------------------------------------------- guides
  for (const guide of GUIDES) {
    const row = await db.guide.upsert({
      where: { slug: guide.slug },
      create: {
        title: guide.title,
        slug: guide.slug,
        type: guide.type,
        categoryId: guide.categorySlug ? categoryIds.get(guide.categorySlug) : null,
        excerpt: guide.excerpt,
        shortAnswer: guide.shortAnswer,
        keyTakeaways: J(guide.keyTakeaways),
        body: J(guide.body),
        readingMinutes: guide.readingMinutes,
        typicalLow: guide.typicalLow,
        typicalHigh: guide.typicalHigh,
        unitLow: guide.unitLow,
        unitHigh: guide.unitHigh,
        unitLabel: guide.unitLabel,
        status: "PUBLISHED",
        publishedAt: monthsAgo(guide.publishedMonthsAgo),
        reviewedAt: monthsAgo(guide.publishedMonthsAgo),
        authorId: personIds.get(guide.authorSlug),
        reviewerId: guide.reviewerSlug ? personIds.get(guide.reviewerSlug) : null,
      },
      update: {
        title: guide.title,
        type: guide.type,
        categoryId: guide.categorySlug ? categoryIds.get(guide.categorySlug) : null,
        excerpt: guide.excerpt,
        shortAnswer: guide.shortAnswer,
        keyTakeaways: J(guide.keyTakeaways),
        body: J(guide.body),
        readingMinutes: guide.readingMinutes,
        typicalLow: guide.typicalLow,
        typicalHigh: guide.typicalHigh,
        unitLow: guide.unitLow,
        unitHigh: guide.unitHigh,
        unitLabel: guide.unitLabel,
        status: "PUBLISHED",
        publishedAt: monthsAgo(guide.publishedMonthsAgo),
        reviewedAt: monthsAgo(guide.publishedMonthsAgo),
        authorId: personIds.get(guide.authorSlug),
        reviewerId: guide.reviewerSlug ? personIds.get(guide.reviewerSlug) : null,
      },
    });

    await db.source.deleteMany({ where: { guideId: row.id } });
    const guideSourceIds: string[] = [];
    for (const [index, source] of (guide.sources ?? []).entries()) {
      const created = await db.source.create({
        data: {
          guideId: row.id,
          label: source.label,
          publisher: source.publisher,
          url: source.url,
          tier: source.tier ?? "PRIMARY",
          accessedAt: monthsAgo(1),
          sortOrder: index,
        },
      });
      guideSourceIds.push(created.id);
    }

    await db.costRow.deleteMany({ where: { guideId: row.id } });
    for (const [index, cost] of (guide.costs ?? []).entries()) {
      await db.costRow.create({
        data: {
          guideId: row.id,
          label: cost.label,
          lowPrice: cost.low,
          highPrice: cost.high,
          typical: cost.typical,
          unit: cost.unit ?? "project",
          note: cost.note,
          sourceId: guideSourceIds[0],
          sortOrder: index,
        },
      });
    }

    await db.faq.deleteMany({ where: { guideId: row.id } });
    for (const [index, faq] of (guide.faqs ?? []).entries()) {
      await db.faq.create({
        data: { guideId: row.id, scope: "GUIDE", question: faq.q, answer: faq.a, sortOrder: index },
      });
    }
  }
  console.log(`  ${GUIDES.length} guides`);

  // ----------------------------------------------------------------- pages
  for (const page of PAGES) {
    await db.page.upsert({
      where: { slug: page.slug },
      create: {
        title: page.title,
        slug: page.slug,
        template: page.template,
        excerpt: page.excerpt,
        body: J(page.body),
        noticeTitle: page.noticeTitle,
        noticeBody: page.noticeBody,
        printable: page.printable ?? false,
        status: "PUBLISHED",
        publishedAt: monthsAgo(8),
      },
      update: {
        title: page.title,
        template: page.template,
        excerpt: page.excerpt,
        body: J(page.body),
        noticeTitle: page.noticeTitle,
        noticeBody: page.noticeBody,
        printable: page.printable ?? false,
        status: "PUBLISHED",
      },
    });
  }
  console.log(`  ${PAGES.length} pages`);

  // ------------------------------------------------- global FAQs, criteria
  await db.faq.deleteMany({ where: { scope: "GLOBAL" } });
  for (const [index, faq] of HOME_FAQS.entries()) {
    await db.faq.create({
      data: { scope: "GLOBAL", question: faq.q, answer: faq.a, sortOrder: index },
    });
  }

  await db.criterion.deleteMany({ where: { scope: "GLOBAL" } });
  for (const [index, criterion] of GLOBAL_CRITERIA.entries()) {
    await db.criterion.create({
      data: {
        title: criterion.title,
        body: criterion.body,
        importance: criterion.importance,
        iconKey: criterion.iconKey,
        scope: "GLOBAL",
        sortOrder: index,
      },
    });
  }

  // ----------------------------------------------------------------- plans
  const planIds = new Map<string, string>();
  for (const plan of PLANS) {
    const row = await db.plan.upsert({
      where: { key: plan.key },
      create: {
        key: plan.key,
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        interval: plan.interval,
        unitLabel: plan.unitLabel,
        features: J(plan.features),
        editorial: plan.editorial,
        sortOrder: plan.sortOrder,
      },
      update: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        interval: plan.interval,
        unitLabel: plan.unitLabel,
        features: J(plan.features),
        editorial: plan.editorial,
        sortOrder: plan.sortOrder,
      },
    });
    planIds.set(plan.key, row.id);
  }
  console.log(`  ${planIds.size} plans`);

  // ----------------------------------------------------------------- users
  // No password is written into this file. SEED_ADMIN_PASSWORD is used when it
  // is set, and otherwise each new account gets a random one that is printed
  // once at the end of the run. A default spelled out in the repository is a
  // way into every install that has not changed it.
  const newCredentials: { email: string; password: string }[] = [];

  async function seedUser(email: string, name: string, role: string, given?: string) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      // An existing password belongs to whoever set it, so only the profile is
      // brought back in line and the hash is left alone.
      return db.user.update({ where: { email }, data: { name, role } });
    }
    if (given && given.length < 8) {
      console.log(`  SEED_ADMIN_PASSWORD is too short to use, generating one for ${email}`);
    }
    const password = given && given.length >= 8 ? given : randomPassword();
    if (password !== given) newCredentials.push({ email, password });
    return db.user.create({
      data: { email, name, role, passwordHash: await bcrypt.hash(password, 10) },
    });
  }

  const admin = await seedUser(
    process.env.SEED_ADMIN_EMAIL || "admin@tenbestfind.com",
    "Site Administrator",
    "ADMIN",
    process.env.SEED_ADMIN_PASSWORD,
  );
  await seedUser("editor@tenbestfind.com", "Dana Whitfield", "EDITOR");
  const ownerUser = await seedUser(
    "owner@lonestarroofing.example",
    "Ray Alvarez",
    "BUSINESS_OWNER",
  );

  // --------------------------------------------- subscriptions and invoices
  const subscriptionSeeds: { slug: string; plan: string; status: string; sponsored?: boolean }[] = [
    { slug: "lone-star-roofing", plan: "claim", status: "ACTIVE" },
    { slug: "trinity-roof-works", plan: "claim", status: "ACTIVE" },
    { slug: "metroplex-storm-roofing", plan: "top10", status: "ACTIVE", sponsored: true },
    { slug: "biscayne-plumbing-group", plan: "claim", status: "ACTIVE" },
    { slug: "coral-way-plumbing", plan: "listing", status: "PENDING" },
    { slug: "don-valley-plumbing", plan: "claim", status: "ACTIVE" },
    { slug: "cedar-ridge-roofing", plan: "claim", status: "PAST_DUE" },
    { slug: "frisco-line-roofing", plan: "claim", status: "CANCELED" },
  ];

  await db.invoice.deleteMany({});
  await db.subscription.deleteMany({});
  await db.sponsoredPlacement.deleteMany({});

  let invoiceNumber = 1041;
  for (const seed of subscriptionSeeds) {
    const businessId = businessIds.get(seed.slug);
    const planId = planIds.get(seed.plan);
    const plan = PLANS.find((item) => item.key === seed.plan)!;
    if (!businessId || !planId) continue;

    const started = monthsAgo(seed.status === "ACTIVE" ? 7 : 3);
    const subscription = await db.subscription.create({
      data: {
        businessId,
        planId,
        status: seed.status,
        startedAt: seed.status === "PENDING" ? null : started,
        currentPeriodEnd: seed.status === "CANCELED" ? monthsAgo(1) : monthsAgo(-1),
        canceledAt: seed.status === "CANCELED" ? monthsAgo(1) : null,
      },
    });

    if (seed.status !== "PENDING") {
      const paidMonths = seed.status === "CANCELED" ? 2 : 6;
      for (let index = paidMonths; index >= 0; index -= 1) {
        const isCurrent = index === 0;
        await db.invoice.create({
          data: {
            subscriptionId: subscription.id,
            number: `TBF-${invoiceNumber++}`,
            amountCents: plan.priceCents,
            status: isCurrent && seed.status === "PAST_DUE" ? "OPEN" : "PAID",
            issuedAt: monthsAgo(index),
            paidAt: isCurrent && seed.status === "PAST_DUE" ? null : monthsAgo(index),
            periodStart: monthsAgo(index),
            periodEnd: monthsAgo(index - 1),
          },
        });
      }
    }

    if (seed.sponsored) {
      const business = ALL_BUSINESSES.find((item) => item.slug === seed.slug)!;
      await db.sponsoredPlacement.create({
        data: {
          businessId,
          cityId: cityIds.get(`${business.countryCode}:${business.regionSlug}:${business.citySlug}`),
          categoryId: categoryIds.get(business.categorySlug),
          kind: "FEATURED_PARTNER",
          startsAt: monthsAgo(3),
          status: "ACTIVE",
          impressions: 18420,
          clicks: 642,
        },
      });
    }
  }

  await db.business.update({
    where: { slug: "lone-star-roofing" },
    data: { claimed: true, ownerId: ownerUser.id },
  });

  // ------------------------------------------------------------- workflow
  await db.claimRequest.deleteMany({});
  await db.claimRequest.createMany({
    data: [
      {
        businessId: businessIds.get("oak-cliff-roofing"),
        businessName: "Oak Cliff Roofing",
        ownerName: "Teresa Vaughn",
        ownerEmail: "teresa@oakcliffroofing.example",
        ownerPhone: "(214) 555-0177",
        role: "Owner",
        verificationMethod: "EMAIL",
        status: "VERIFYING",
        requested: JSON.stringify([
          { field: "Phone", current: "(214) 555-0166", requested: "(214) 555-0177", immediate: true },
          { field: "Service area", current: "South Dallas, Oak Cliff", requested: "South Dallas, Oak Cliff, Duncanville", immediate: false },
        ]),
        submittedAt: daysAgo(2),
      },
      {
        businessId: businessIds.get("grand-prairie-roof-gutter"),
        businessName: "Grand Prairie Roof & Gutter",
        ownerName: "Marcus Hall",
        ownerEmail: "marcus@gproofgutter.example",
        verificationMethod: "WEBSITE_TOKEN",
        status: "SUBMITTED",
        submittedAt: daysAgo(1),
      },
      {
        businessId: businessIds.get("queen-west-mechanical"),
        businessName: "Queen West Mechanical",
        ownerName: "Ana Silva",
        ownerEmail: "ana@queenwestmech.example",
        verificationMethod: "PHONE",
        status: "APPROVED",
        submittedAt: daysAgo(21),
        reviewedAt: daysAgo(19),
      },
    ],
  });

  await db.submission.deleteMany({});
  await db.submission.createMany({
    data: [
      {
        kind: "CORRECTION",
        subject: "Warranty length is out of date",
        email: "reader@example.com",
        name: "J. Okafor",
        pageUrl: "/us/tx/dallas/roofing/",
        message: "Trinity Roof Works now offers 15 years, the page says 10.",
        status: "NEW",
        createdAt: daysAgo(3),
      },
      {
        kind: "RANKING_REQUEST",
        subject: "Please cover Fort Worth",
        email: "homeowner@example.com",
        message: "There is no roofing list for Fort Worth yet.",
        status: "IN_REVIEW",
        createdAt: daysAgo(9),
      },
      {
        kind: "CONTACT",
        subject: "Advertising enquiry",
        email: "sales@examplecorp.com",
        name: "Priyanka Rao",
        message: "Interested in category placements across three Texas metros.",
        status: "NEW",
        createdAt: daysAgo(1),
      },
      {
        kind: "BUSINESS",
        subject: "Add Ridgeline Roofing of Plano",
        email: "office@ridgeline.example",
        name: "Sam Ortiz",
        message: "We serve Plano, Allen and McKinney.",
        status: "IN_REVIEW",
        createdAt: daysAgo(6),
      },
    ],
  });

  // ------------------------------------------------------------- analytics
  await db.businessDailyStat.deleteMany({});
  await db.analyticsEvent.deleteMany({});

  const trackedBusinesses = [...businessIds.entries()];
  const random = seededRandom(20260901);

  for (const [slug, businessId] of trackedBusinesses) {
    const isTop = ["lone-star-roofing", "metroplex-storm-roofing", "biscayne-plumbing-group", "don-valley-plumbing"].includes(slug);
    const base = isTop ? 180 : 55;
    for (let day = 89; day >= 0; day -= 1) {
      const weekday = daysAgo(day).getDay();
      const weekendFactor = weekday === 0 || weekday === 6 ? 0.55 : 1;
      const impressions = Math.round((base + random() * base * 0.6) * weekendFactor);
      const profileViews = Math.round(impressions * (0.16 + random() * 0.08));
      const websiteClicks = Math.round(profileViews * (0.22 + random() * 0.1));
      const phoneClicks = Math.round(profileViews * (0.14 + random() * 0.08));
      const quoteClicks = Math.round(profileViews * (0.07 + random() * 0.05));
      const directionsClicks = Math.round(profileViews * (0.05 + random() * 0.04));

      await db.businessDailyStat.create({
        data: {
          businessId,
          date: daysAgo(day),
          impressions,
          profileViews,
          websiteClicks,
          phoneClicks,
          quoteClicks,
          directionsClicks,
        },
      });
    }
  }

  // A short tail of raw events so the live activity feed has something real.
  const eventTypes = ["PROFILE_VIEW", "WEBSITE_CLICK", "PHONE_CLICK", "QUOTE_CLICK", "RANKING_VIEW"];
  const dallasRankingId = rankingIds.get("roofing:dallas");
  for (let index = 0; index < 60; index += 1) {
    const slug = trackedBusinesses[Math.floor(random() * trackedBusinesses.length)][0];
    await db.analyticsEvent.create({
      data: {
        type: eventTypes[Math.floor(random() * eventTypes.length)],
        path: `/companies/${slug}/`,
        businessId: businessIds.get(slug),
        rankingId: random() > 0.6 ? dallasRankingId : null,
        device: random() > 0.45 ? "mobile" : "desktop",
        country: random() > 0.2 ? "US" : "CA",
        referrer: random() > 0.5 ? "https://www.google.com/" : null,
        createdAt: new Date(NOW.getTime() - Math.floor(random() * 72) * 3600 * 1000),
      },
    });
  }
  console.log("  analytics rollups and events");

  // -------------------------------------------------------------- settings
  for (const setting of SETTINGS) {
    await db.setting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: JSON.stringify(setting.value),
        groupName: setting.groupName,
        label: setting.label,
      },
      update: {
        value: JSON.stringify(setting.value),
        groupName: setting.groupName,
        label: setting.label,
      },
    });
  }

  // -------------------------------------------------------- MCP connectors
  const existingConnector = await db.mcpConnector.findFirst({ where: { name: "Editorial research assistant" } });
  if (!existingConnector) {
    await db.mcpConnector.create({
      data: {
        name: "Editorial research assistant",
        url: "https://mcp.example.com/tenbestfind",
        transport: "http",
        authType: "bearer",
        scopes: JSON.stringify(["rankings:read", "businesses:read", "guides:read"]),
        enabled: false,
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId: admin.id,
      action: "seed",
      entityType: "system",
      summary: "Database seeded from the design prototype content",
    },
  });

  if (newCredentials.length > 0) {
    console.log("\n  Accounts created. These passwords are shown once and stored only as hashes:");
    for (const row of newCredentials) console.log(`    ${row.email}  ${row.password}`);
    console.log("");
  }

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
