import type { SecretState } from "@/lib/secrets";

/**
 * Green when a credential works, red when it does not.
 *
 * The words carry the same information as the colour, on purpose: a coloured
 * dot on its own says nothing to somebody who cannot tell the two apart, and
 * says nothing useful to anyone about which of the several ways of being
 * disconnected this one is.
 */
export function ConnectionLight({ state, status }: { state: SecretState; status: string }) {
  const on = state === "connected";
  return (
    <span className={`conn ${on ? "conn--on" : "conn--off"}`}>
      <span className="conn__dot" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
