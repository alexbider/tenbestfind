// Which questions a page shows.
//
// Every hub carries generated questions built from its own name, which is
// better than an empty section and worse than a real answer: they are the same
// four questions on every service page with one word swapped. Now that a
// question can attach to a service, subservice, state or city, a real one
// replaces the generated set rather than joining it, because a page that
// answers two things properly is better than one that answers six vaguely.

import { db } from "./db";
import { FAQ_SCOPE_FIELDS, type FaqAttachment } from "./enums";

export type FaqView = { id: string; question: string; answer: string };

/**
 * The questions written for this record, or the generated ones.
 *
 * All or nothing on purpose. Merging the two puts a specific answer next to a
 * generic one about the same subject, and the reader cannot tell which was
 * written for them.
 */
export async function faqsFor(
  scope: FaqAttachment,
  parentId: string,
  fallback: FaqView[],
): Promise<FaqView[]> {
  const field = FAQ_SCOPE_FIELDS[scope];
  const rows = await db.faq.findMany({
    where: { scope, [field]: parentId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, question: true, answer: true },
  });

  return rows.length > 0 ? rows : fallback;
}
