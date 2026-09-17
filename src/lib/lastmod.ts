/**
 * Keeping updatedAt honest, because it is what the sitemap publishes.
 *
 * Prisma keeps the column right whenever the row itself is written. The gap is
 * everything a page is made of that lives somewhere else: its photos, its
 * questions, its credentials, the entries on a ranking, the SEO record beside
 * it. Editing any of those changes the page and used to leave lastmod claiming
 * the page had not changed since whenever the row was last touched, which is a
 * crawler's reason not to come back.
 *
 * Nothing here throws. A lastmod that is a minute stale is not worth failing a
 * write that has already happened, and the row may have just been deleted.
 */

import { db } from "./db";

export async function touchBusiness(id: string | null | undefined): Promise<void> {
  if (!id) return;
  await db.business.update({ where: { id }, data: { updatedAt: new Date() } }).catch(() => {});
}

export async function touchRanking(id: string | null | undefined): Promise<void> {
  if (!id) return;
  await db.ranking.update({ where: { id }, data: { updatedAt: new Date() } }).catch(() => {});
}

export async function touchGuide(id: string | null | undefined): Promise<void> {
  if (!id) return;
  await db.guide.update({ where: { id }, data: { updatedAt: new Date() } }).catch(() => {});
}

/**
 * Touches whatever owns this record, by the entity names the connector and the
 * audit log already use. Anything else is left alone rather than guessed at.
 */
export async function touchOwner(entityType: string, id: string | null | undefined): Promise<void> {
  if (!id) return;
  switch (entityType) {
    case "business":
      return touchBusiness(id);
    case "ranking":
      return touchRanking(id);
    case "guide":
      return touchGuide(id);
    default:
      return;
  }
}

/** The page a question belongs to, touched wherever that is. */
export async function touchFaqOwner(faqId: string): Promise<void> {
  const faq = await db.faq
    .findUnique({ where: { id: faqId }, select: { businessId: true, rankingId: true, guideId: true } })
    .catch(() => null);
  if (!faq) return;
  await touchBusiness(faq.businessId);
  await touchRanking(faq.rankingId);
  await touchGuide(faq.guideId);
}
