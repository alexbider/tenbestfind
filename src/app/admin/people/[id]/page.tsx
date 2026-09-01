import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { PersonEditor } from "@/components/admin/DirectoryEditors";
import { SeoSection, SeoPlaceholder } from "@/components/admin/SeoSection";
import { StatusPill } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { parseJson, parseList } from "@/lib/json";
import { fullDate } from "@/lib/format";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const metadata = { title: "Person" };

type Props = { params: Promise<{ id: string }> };

type PersonLink = { label: string; url: string };

/** The date inputs on this form take plain YYYY-MM-DD. */
function isoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AdminPersonEditor({ params }: Props) {
  await requireStaff();
  const { id } = await params;
  const isNew = id === "new";

  const person = isNew
    ? null
    : await db.person.findUnique({
        where: { id },
        include: {
          credentials: { orderBy: { sortOrder: "asc" } },
          experience: { orderBy: { sortOrder: "asc" } },
          _count: {
            select: {
              authoredGuides: true,
              authoredRankings: true,
              reviewedGuides: true,
              reviewedRankings: true,
            },
          },
        },
      });
  if (!isNew && !person) notFound();

  const written = person ? person._count.authoredGuides + person._count.authoredRankings : 0;
  const reviewed = person ? person._count.reviewedGuides + person._count.reviewedRankings : 0;

  return (
    <>
      <AdminHeader
        title={person ? person.name : "New person"}
        description={
          person
            ? `${person.role} · ${written} written · ${reviewed} reviewed · joined ${fullDate(person.createdAt)}`
            : "Add an author, a reviewer or a member of the expert panel."
        }
        actions={
          <>
            {person ? <StatusPill status={person.published ? "PUBLISHED" : "DRAFT"} /> : null}
            {person?.isExpert && person.published ? (
              <Link
                href={routes.expert(person.slug)}
                target="_blank"
                className="btn btn--secondary btn--sm"
              >
                View profile
              </Link>
            ) : null}
            <Link href="/admin/people" className="btn btn--secondary btn--sm">
              Back to team
            </Link>
          </>
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Person">
          <PersonEditor
            person={{
              id: person?.id,
              name: person?.name ?? "",
              slug: person?.slug ?? "",
              role: person?.role ?? "",
              bio: person?.bio ?? "",
              limits: person?.limits ?? "",
              portrait: person?.portrait ?? "",
              email: person?.email ?? "",
              yearsExperience: person?.yearsExperience?.toString() ?? "",
              specializations: person ? parseList(person.specializations) : [],
              markets: person ? parseList(person.markets) : [],
              links: parseJson<PersonLink[]>(person?.links, []).map((link) => ({
                label: link.label,
                url: link.url,
              })),
              credentials:
                person?.credentials.map((credential) => ({
                  label: credential.label,
                  issuer: credential.issuer ?? "",
                  status: credential.status,
                  issuedAt: isoDate(credential.issuedAt),
                  sourceUrl: credential.sourceUrl ?? "",
                })) ?? [],
              experience:
                person?.experience.map((role) => ({
                  role: role.role,
                  org: role.org,
                  startedAt: isoDate(role.startedAt),
                  endedAt: isoDate(role.endedAt),
                  summary: role.summary ?? "",
                })) ?? [],
              isAuthor: person?.isAuthor ?? true,
              isReviewer: person?.isReviewer ?? false,
              isExpert: person?.isExpert ?? false,
              published: person?.published ?? true,
            }}
          />
        </Panel>

        {person ? (
          <SeoSection
            entityType="person"
            entityId={person.id}
            path={routes.expert(person.slug)}
            fallbackTitle={`${person.name}, ${person.role}`}
            fallbackDescription={person.bio ?? ""}
            contentSample={[person.bio ?? "", person.limits ?? ""].join(" ")}
            description="Overrides what the public profile publishes."
          />
        ) : (
          <SeoPlaceholder what="person" />
        )}
      </div>
    </>
  );
}
