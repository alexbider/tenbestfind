import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect("/admin");
  return <LoginForm />;
}
