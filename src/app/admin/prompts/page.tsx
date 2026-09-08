import { redirect } from "next/navigation";

// Moved into the guides desk. Bookmarks and old links still work.
export default function Moved() {
  redirect("/admin/guides/briefs");
}
