import { permanentRedirect, redirect } from "next/navigation";
import { db } from "./db";

/**
 * Records that something moved, so its inbound links keep working.
 *
 * Anything already pointing at the old address is repointed at the new one, so
 * a rename never builds a chain. Renaming back would then leave a row pointing
 * at itself, which is why self-redirects are cleared afterwards rather than
 * left as an inert loop in the table.
 */
export async function recordMove(oldPath: string, newPath: string): Promise<void> {
  if (oldPath === newPath) return;

  await db.redirect.upsert({
    where: { source: oldPath },
    create: { source: oldPath, target: newPath, code: 301 },
    update: { target: newPath, enabled: true },
  });
  await db.redirect.updateMany({ where: { target: oldPath }, data: { target: newPath } });
  await db.redirect.deleteMany({ where: { source: newPath } });
}

/**
 * Applies a stored redirect instead of serving a 404.
 *
 * Redirects are rows rather than config, because they are written by the
 * editors themselves: renaming a city or a guide records one automatically, and
 * an editor can add one by hand. That means the lookup needs a database, which
 * middleware on the edge runtime cannot do, so every route that is about to
 * call notFound() checks here first. The cost is one indexed lookup, and only
 * on a request that was going to fail anyway.
 *
 * Never returns when a redirect matches.
 */
export async function redirectIfKnown(path: string): Promise<void> {
  const candidates = path.endsWith("/") ? [path, path.slice(0, -1)] : [path, `${path}/`];

  const row = await db.redirect.findFirst({
    where: { enabled: true, source: { in: candidates } },
  });
  if (!row || row.target === path) return;

  // Counting hits is what tells an editor a redirect is still carrying traffic
  // and should not be cleaned up. A failure here must not swallow the redirect.
  await db.redirect.update({ where: { id: row.id }, data: { hits: { increment: 1 } } }).catch(() => {});

  // 410 says the page is deliberately gone rather than moved, so the caller
  // goes on to render its 404.
  if (row.code === 410) return;

  // Next issues 308 and 307 rather than 301 and 302: a redirect thrown during
  // a render cannot choose its own status. Search engines treat the pairs the
  // same, and the admin says so where the code is chosen.
  if (row.code === 301) permanentRedirect(row.target);
  redirect(row.target);
}
