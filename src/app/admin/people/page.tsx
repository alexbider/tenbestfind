import Link from "next/link";
import { AdminHeader, Panel, StatRow } from "@/components/admin/shell";
import { Badge } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const metadata = { title: "Editorial team" };

export default async function AdminPeoplePage() {
  await requireStaff();

  const people = await db.person.findMany({
    orderBy: [{ published: "desc" }, { name: "asc" }],
    include: {
      credentials: true,
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

  const experts = people.filter((person) => person.isExpert).length;
  const reviewers = people.filter((person) => person.isReviewer).length;
  const unverified = people.filter(
    (person) => person.credentials.length > 0 && !person.credentials.some((c) => c.status === "VERIFIED"),
  ).length;

  return (
    <>
      <AdminHeader
        title="Editorial team"
        description="Everyone who can carry a byline or review a page, and what backs their name."
        actions={
          <Link href="/admin/people/new" className="btn btn--primary btn--sm">
            New person
          </Link>
        }
      />

      <StatRow
        stats={[
          { label: "People", value: people.length },
          { label: "Expert panel", value: experts },
          { label: "Reviewers", value: reviewers },
          {
            label: "Unverified credentials",
            value: unverified,
            hint: "Claimed but never checked",
          },
        ]}
      />

      <Panel title="People" padded={false}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Written</th>
                <th scope="col">Reviewed</th>
                <th scope="col">Credentials</th>
                <th scope="col">Flags</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const written = person._count.authoredGuides + person._count.authoredRankings;
                const reviewed = person._count.reviewedGuides + person._count.reviewedRankings;
                const verified = person.credentials.filter((c) => c.status === "VERIFIED").length;
                return (
                  <tr key={person.id}>
                    <td>
                      <Link href={`/admin/people/${person.id}`} className="admin-table__primary">
                        {person.name}
                      </Link>
                      <span className="admin-table__meta">{routes.expert(person.slug)}</span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{person.role}</td>
                    <td className="admin-table__num">{written}</td>
                    <td className="admin-table__num">{reviewed}</td>
                    <td className="admin-table__num">
                      {verified}/{person.credentials.length}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {person.isExpert ? <Badge tone="brand">Expert</Badge> : null}
                        {person.isReviewer ? <Badge tone="neutral">Reviewer</Badge> : null}
                        {!person.published ? <Badge tone="warning">Hidden</Badge> : null}
                      </div>
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        {person.isExpert && person.published ? (
                          <Link
                            href={routes.expert(person.slug)}
                            target="_blank"
                            className="btn btn--ghost btn--sm"
                          >
                            View
                          </Link>
                        ) : null}
                        <Link
                          href={`/admin/people/${person.id}`}
                          className="btn btn--secondary btn--sm"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
