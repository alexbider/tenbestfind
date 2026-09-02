import type { Metadata } from "next";
import { approveConnection, denyConnection } from "@/app/actions/mcp-consent";
import { ConsentSignIn } from "@/components/site/ConsentSignIn";
import { Section } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth";
import { clientRedirects, loadClient, narrowScope, resourceId, SCOPES } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect an application",
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const SCOPE_TEXT: Record<string, string> = {
  "mcp:read": "Read your content: businesses, rankings, guides, pages, SEO records and import batches.",
  "mcp:write":
    "Make changes: edit and publish businesses, write SEO records, add redirects and queue import batches.",
};

/**
 * The consent screen. Everything a client asked for is shown before anything is
 * granted, and a request that fails validation is reported here rather than
 * bounced to a redirect URI we have not verified.
 */
export default async function ConnectPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;

  const clientId = one(params.client_id);
  const redirectUri = one(params.redirect_uri);
  const responseType = one(params.response_type);
  const codeChallenge = one(params.code_challenge);
  const method = one(params.code_challenge_method);
  const state = one(params.state);
  const resource = one(params.resource);
  const requestedScope = one(params.scope);

  const fail = (heading: string, body: string) => (
    <Section>
      <div className="prose" style={{ maxWidth: 640, margin: "0 auto", padding: "60px 0" }}>
        <h1>{heading}</h1>
        <p>{body}</p>
        <p style={{ color: "var(--text-secondary)" }}>
          Nothing was granted. Close this window and start the connection again from the application.
        </p>
      </div>
    </Section>
  );

  if (one(params.error)) {
    return fail("That request could not be completed", "The application sent a request this site could not verify.");
  }
  if (!clientId) return fail("Missing application", "The request did not name a client_id.");

  const client = await loadClient(clientId);
  if (!client) return fail("Unknown application", "No registered application matches that client_id.");

  // The redirect is validated before it is ever used, so an unverified URI never
  // receives a code or an error.
  if (!redirectUri || !clientRedirects(client).includes(redirectUri)) {
    return fail(
      "That redirect address is not registered",
      `${client.name} asked to be sent back to an address it did not register.`,
    );
  }
  if (responseType !== "code") {
    return fail("Unsupported request", "This site only issues authorization codes.");
  }
  if (!codeChallenge || method !== "S256") {
    return fail(
      "This application is not using PKCE",
      "A connection has to include an S256 code challenge. Without it the flow is not safe to complete.",
    );
  }

  const scope = narrowScope(requestedScope || null, client.scope);
  const granted = scope.split(" ").filter((value) => (SCOPES as readonly string[]).includes(value));
  const session = await getSession();
  const staff = session && (session.role === "ADMIN" || session.role === "EDITOR");

  const here = `/connect/?${new URLSearchParams(
    Object.entries({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: method,
      scope,
      state,
      resource,
    }).filter(([, value]) => Boolean(value)) as [string, string][],
  ).toString()}`;

  return (
    <Section>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "56px 0" }}>
        <p style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
          Connect an application
        </p>
        <h1 style={{ fontSize: 30, lineHeight: 1.25, margin: "10px 0 6px" }}>
          {client.name} wants to connect to TenBestFind
        </h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 28 }}>
          {client.clientUri ? `${client.clientUri}. ` : ""}
          It will act as you, and it can do only what your account can do.
        </p>

        <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0, marginBottom: 28 }}>
          {granted.map((value) => (
            <li
              key={value}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 16px",
                fontSize: 14.5,
                lineHeight: 1.6,
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>{value}</strong>
              <span style={{ color: "var(--text-secondary)" }}>{SCOPE_TEXT[value]}</span>
            </li>
          ))}
        </ul>

        {staff ? (
          <>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 18 }}>
              Signed in as {session.name} ({session.email}).
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <form action={approveConnection}>
                <input type="hidden" name="client_id" value={clientId} />
                <input type="hidden" name="redirect_uri" value={redirectUri} />
                <input type="hidden" name="state" value={state} />
                <input type="hidden" name="scope" value={scope} />
                <input type="hidden" name="code_challenge" value={codeChallenge} />
                <input type="hidden" name="resource" value={resource || resourceId()} />
                <button type="submit" className="btn btn--primary">
                  Allow
                </button>
              </form>
              <form action={denyConnection}>
                <input type="hidden" name="client_id" value={clientId} />
                <input type="hidden" name="redirect_uri" value={redirectUri} />
                <input type="hidden" name="state" value={state} />
                <button type="submit" className="btn btn--secondary">
                  Cancel
                </button>
              </form>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 22, lineHeight: 1.6 }}>
              You can revoke this at any time under Admin, Connected apps. Access lasts an hour at a
              time and renews for thirty days unless you revoke it.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              {session
                ? "Your account cannot connect applications. Sign in with a staff account to continue."
                : "Sign in with your staff account to continue."}
            </p>
            <ConsentSignIn next={here} />
          </>
        )}
      </div>
    </Section>
  );
}
