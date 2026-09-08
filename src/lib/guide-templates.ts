// Which prompt template a commission gets.
//
// There is one template per guide type and one of them is marked as the
// default, so the query has to ask for both and then choose. Asking the
// database to choose, with an orderBy on guideType, sorts the names
// alphabetically rather than putting the match first: a cost guide would come
// back with the hiring template because HOW_TO_CHOOSE sorts above COST. The
// choice belongs here, where it can say what it means.

import { db } from "./db";
import type { GuideType } from "./enums";

/** The template written for this kind of guide, or the default if there is none. */
export async function templateForGuideType(guideType: GuideType): Promise<string | null> {
  const templates = await db.promptTemplate.findMany({
    where: { kind: "GUIDE", archived: false, OR: [{ guideType }, { isDefault: true }] },
    orderBy: { updatedAt: "desc" },
    select: { id: true, guideType: true, isDefault: true },
  });

  const exact = templates.find((template) => template.guideType === guideType);
  if (exact) return exact.id;

  const fallback = templates.find((template) => template.isDefault);
  return fallback?.id ?? null;
}
