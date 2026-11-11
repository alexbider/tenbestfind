import { AdminHeader, Panel } from "@/components/admin/shell";
import { PasswordForm } from "@/components/portal/PasswordForm";
import { requireOwner } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-tokens";

export const metadata = { title: "Account" };

export default async function PortalAccount() {
  const user = await requireOwner();

  return (
    <>
      <AdminHeader title="Account" description={`Signed in as ${user.email}.`} />
      <Panel
        title="Change password"
        description="We email you when the password changes, so you know if it was not you."
      >
        <PasswordForm minLength={MIN_PASSWORD_LENGTH} email={user.email} />
      </Panel>
    </>
  );
}
