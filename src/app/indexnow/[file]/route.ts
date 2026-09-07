import { notFound } from "next/navigation";
import { indexNowKey } from "@/lib/indexnow";

/**
 * The IndexNow key file.
 *
 * The protocol proves who owns a domain by making the filename the key: an
 * engine that receives a submission fetches this and only acts on it if the
 * contents match what was submitted. That is also why the wrong filename must
 * 404 rather than return the real key, which would hand verification to
 * anyone who guessed the path.
 *
 * It lives in a folder rather than at the root because the root is a catch-all
 * that resolves service and country slugs, and a key file is not a page.
 * IndexNow allows this as long as the submission says where the file is.
 */

export const revalidate = 86400;

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const key = await indexNowKey();

  if (file !== `${key}.txt`) notFound();

  return new Response(`${key}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
