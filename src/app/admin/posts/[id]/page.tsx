import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../../../../prisma/data/editorial";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { PostEditor } from "@/components/admin/PostEditor";
import { SeoSection, SeoPlaceholder } from "@/components/admin/SeoSection";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { parseJson } from "@/lib/json";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const metadata = { title: "Post" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminPostEditor({ params }: Props) {
  await requireStaff();
  const { id } = await params;
  const isNew = id === "new";

  const post = isNew ? null : await db.post.findUnique({ where: { id } });
  if (!isNew && !post) notFound();

  const [categories, people] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.person.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  const blocks = post ? parseJson<GuideBlock[]>(post.body, []) : [];
  const contentSample = blocks
    .map((block) =>
      block.kind === "paragraph" || block.kind === "heading"
        ? block.text
        : block.kind === "list"
          ? block.items.join(" ")
          : "",
    )
    .join(" ");

  return (
    <>
      <AdminHeader
        title={post ? post.title : "New post"}
        description={
          post
            ? `${routes.post(post.slug)} · updated ${fullDate(post.updatedAt)}`
            : "Write a blog post."
        }
        actions={
          <>
            {post ? <StatusPill status={post.status} /> : null}
            {post ? (
              <Link href={routes.post(post.slug)} target="_blank" className="btn btn--secondary btn--sm">
                View post
              </Link>
            ) : null}
            <Link href="/admin/guides" className="btn btn--secondary btn--sm">
              Back to posts
            </Link>
          </>
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Post">
          <PostEditor
            post={{
              id: post?.id,
              title: post?.title ?? "",
              slug: post?.slug ?? "",
              excerpt: post?.excerpt ?? "",
              heroImage: post?.heroImage ?? "",
              categoryId: post?.categoryId ?? "",
              authorId: post?.authorId ?? "",
              status: post?.status ?? "DRAFT",
              body: blocks,
            }}
            categories={categories.map((category) => ({ id: category.id, label: category.name }))}
            people={people.map((person) => ({ id: person.id, label: `${person.name} — ${person.role}` }))}
          />
        </Panel>

        {post ? (
          <SeoSection
            entityType="post"
            entityId={post.id}
            path={routes.post(post.slug)}
            fallbackTitle={post.title}
            fallbackDescription={post.excerpt ?? ""}
            contentSample={contentSample}
          />
        ) : (
          <SeoPlaceholder what="post" />
        )}
      </div>
    </>
  );
}
