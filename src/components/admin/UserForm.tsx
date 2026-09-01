"use client";

import { useActionState } from "react";
import { saveUser, type ActionState } from "@/app/actions/admin-system";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

export type UserDraft = {
  id?: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
};

export function UserForm({ user }: { user?: UserDraft }) {
  const [state, action, pending] = useActionState(saveUser, initial);
  const suffix = user?.id ?? "new";

  return (
    <form action={action}>
      {user?.id ? <input type="hidden" name="id" value={user.id} /> : null}

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field-row">
        <div className="field">
          <label htmlFor={`user-name-${suffix}`}>Name</label>
          <input id={`user-name-${suffix}`} name="name" type="text" defaultValue={user?.name ?? ""} />
        </div>
        <div className="field">
          <label htmlFor={`user-email-${suffix}`}>Email</label>
          <input id={`user-email-${suffix}`} name="email" type="email" defaultValue={user?.email ?? ""} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`user-role-${suffix}`}>Role</label>
          <select id={`user-role-${suffix}`} name="role" defaultValue={user?.role ?? "EDITOR"}>
            <option value="ADMIN">Administrator</option>
            <option value="EDITOR">Editor</option>
            <option value="BUSINESS_OWNER">Business owner</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`user-password-${suffix}`}>
            {user?.id ? "New password" : "Password"}
          </label>
          <input
            id={`user-password-${suffix}`}
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={user?.id ? "Leave blank to keep the current one" : ""}
          />
          <span className="field__hint">Minimum ten characters.</span>
        </div>
      </div>

      <label className="radio-row" style={{ marginBottom: 18, padding: "12px 14px" }}>
        <input type="checkbox" name="active" defaultChecked={user?.active ?? true} />
        <span>
          <strong>Active</strong>
          <span>An inactive account cannot sign in, but its audit history is kept.</span>
        </span>
      </label>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : user?.id ? "Save account" : "Create account"}
      </button>
    </form>
  );
}
