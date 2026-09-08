import { redirect } from "next/navigation";

// There is no blog any more. Everything the site publishes is a guide.
export default function Moved() {
  redirect("/admin/guides");
}
