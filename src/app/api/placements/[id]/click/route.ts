import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

/**
 * Counts a click on a Featured Partner box, then sends the reader to the
 * company's own page on this site. Only a live placement is counted.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const placement = await db.sponsoredPlacement.findUnique({
    where: { id },
    include: { business: { select: { slug: true } } },
  });
  if (!placement || placement.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  await db.sponsoredPlacement.update({ where: { id }, data: { clicks: { increment: 1 } } });
  return NextResponse.redirect(new URL(routes.business(placement.business.slug), request.url));
}
