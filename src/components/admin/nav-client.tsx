"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/admin-auth";
import { Icon, type IconName } from "@/components/ui/Icon";

export function AdminNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: IconName;
  label: string;
}) {
  const pathname = usePathname();
  const normalized = pathname.replace(/\/$/, "") || "/admin";
  const active = href === "/admin" ? normalized === "/admin" : normalized.startsWith(href);

  return (
    <Link href={href} data-on={active} aria-current={active ? "page" : undefined}>
      <Icon name={icon} size={17} strokeWidth={1.8} />
      {label}
    </Link>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit">
        <Icon name="lock" size={15} />
        Sign out
      </button>
    </form>
  );
}
