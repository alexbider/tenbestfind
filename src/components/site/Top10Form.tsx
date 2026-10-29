"use client";

import { useActionState } from "react";
import { submitTop10, type Top10State } from "@/app/actions/top10";

const initial: Top10State = { status: "idle" };

const INPUT = {
  height: "50px",
  padding: "0 16px",
  border: "1px solid var(--border-strong)",
  borderRadius: "12px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  width: "100%",
  background: "var(--surface-card)",
  color: "var(--text-primary)",
} as const;

const LABEL = { fontSize: "14px", fontWeight: "700", color: "var(--ink)" } as const;

export type Top10Option = { value: string; label: string };

function FieldError({ errors, name }: { errors?: Record<string, string>; name: string }) {
  const message = errors?.[name];
  return message ? <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--maple-600)" }}>{message}</span> : null;
}

/** Top 10 order form: the city and trade come first, then the claimed business that runs the placement. */
export function Top10Form({
  cities,
  categories,
  businesses,
}: {
  cities: Top10Option[];
  categories: Top10Option[];
  businesses: (Top10Option & { cityId: string; categoryId: string })[];
}) {
  const [state, action, pending] = useActionState(submitTop10, initial);

  return (
    <div style={{ borderRadius: "22px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
      <div style={{ padding: "26px 28px 0" }}>
        <h3 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "6px" }}>Buy a Top 10 featured placement</h3>
        <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
          $199 a month for one city and trade. The Featured Partner box sits beside that ranking, labelled Sponsored. It never changes the ten ranked positions.
        </p>
      </div>
      <form action={action} data-top10="" style={{ padding: "24px 28px 28px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "18px" }}>
        {state.status === "error" ? (
          <p role="alert" style={{ gridColumn: "1 / -1", padding: "12px 14px", borderRadius: "12px", background: "#FDF1EE", border: "1px solid #F3C6BB", fontSize: "14.5px", fontWeight: "600", color: "var(--maple-600)" }}>
            {state.message}
          </p>
        ) : null}
        {state.status === "ok" ? (
          <p role="status" style={{ gridColumn: "1 / -1", padding: "12px 14px", borderRadius: "12px", background: "var(--blue-50)", fontSize: "14.5px", color: "var(--ink)" }}>
            {state.message}
          </p>
        ) : null}
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={LABEL}>City</span>
          <select required name="cityId" defaultValue="" style={INPUT}>
            <option value="" disabled>Choose a city</option>
            {cities.map((city) => (
              <option key={city.value} value={city.value}>{city.label}</option>
            ))}
          </select>
          <FieldError errors={state.errors} name="cityId" />
        </label>
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={LABEL}>Trade</span>
          <select required name="categoryId" defaultValue="" style={INPUT}>
            <option value="" disabled>Choose a trade</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
          <FieldError errors={state.errors} name="categoryId" />
        </label>
        <label style={{ gridColumn: "1 / -1", display: "grid", gap: "8px" }}>
          <span style={LABEL}>Business to feature</span>
          <select required name="businessSlug" defaultValue="" style={INPUT}>
            <option value="" disabled>Choose a claimed business in that city and trade</option>
            {businesses.map((business) => (
              <option key={business.value} value={business.value} data-city={business.cityId} data-category={business.categoryId}>
                {business.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>Only claimed businesses can hold a featured placement.</span>
          <FieldError errors={state.errors} name="businessSlug" />
        </label>
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={LABEL}>Your name</span>
          <input required name="name" type="text" autoComplete="name" style={INPUT} />
          <FieldError errors={state.errors} name="name" />
        </label>
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={LABEL}>Billing email</span>
          <input required name="email" type="email" autoComplete="email" style={INPUT} />
          <FieldError errors={state.errors} name="email" />
        </label>
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={pending}
            data-btnp=""
            style={{ height: "52px", padding: "0 26px", borderRadius: "14px", background: "var(--color-primary)", color: "#fff", fontSize: "16px", fontWeight: "600", border: "0", cursor: pending ? "wait" : "pointer", boxShadow: "var(--shadow-primary)" }}
          >
            {pending ? "Opening checkout" : "Continue to secure checkout"}
          </button>
          <span style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>Billed monthly. Cancel any time. A placement is not shown until payment clears.</span>
        </div>
      </form>
    </div>
  );
}
