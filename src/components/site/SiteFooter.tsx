import Link from "next/link";
import { getSiteNav } from "@/lib/navigation";
import { routes } from "@/lib/urls";

const COL_HEAD = {
  fontSize: "11.5px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "#fff",
  marginBottom: "18px",
};

const FLINK = { fontSize: "15px" };
const SR_ONLY = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
};

const FIELD = {
  minWidth: "0",
  height: "48px",
  padding: "0 14px",
  border: "0",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontFamily: "var(--font-sans)",
  fontSize: "15px",
  outline: "none",
};

function Column({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <nav aria-label={label}>
      <h2 style={COL_HEAD}>{label}</h2>
      <ul style={{ display: "grid", gap: "11px" }}>{children}</ul>
    </nav>
  );
}

function Row({ href, children, tone }: { href: string; children: React.ReactNode; tone?: "gold" }) {
  return (
    <li>
      <Link
        data-flink=""
        href={href}
        style={tone === "gold" ? { ...FLINK, fontWeight: "600", color: "var(--gold-ink)" } : FLINK}
      >
        {children}
      </Link>
    </li>
  );
}

export async function SiteFooter() {
  const nav = await getSiteNav();
  // The six trades the footer lists come from the same taxonomy the header
  // uses, so a new category appears in both without a second edit.
  const trades = nav.serviceGroups.flatMap((group) => group.items).slice(0, 6);

  return (
    <footer
      data-ftr=""
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--ink)",
        color: "rgba(232,237,245,0.72)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0",
          background: "radial-gradient(900px 480px at 8% 0%, rgba(45,116,215,0.28), transparent 62%)",
          pointerEvents: "none",
        }}
      />
      <svg
        data-ften=""
        aria-hidden="true"
        viewBox="0 0 240 170"
        width="560"
        height="398"
        style={{ position: "absolute", right: "-70px", bottom: "-110px", overflow: "visible", pointerEvents: "none" }}
      >
        <path
          pathLength={1}
          d="M18 40 L52 16 L52 158"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          pathLength={1}
          d="M150 16 C 196 16, 226 46, 226 87 C 226 128, 196 158, 150 158 C 104 158, 74 128, 74 87 C 74 46, 104 16, 150 16 Z"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div style={{ position: "relative", maxWidth: "var(--shell)", margin: "0 auto", padding: "0 var(--gutter)" }}>
        <div
          data-ftop=""
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: "40px",
            alignItems: "center",
            padding: "56px 0 44px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div>
            <p
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12.5px",
                fontWeight: "700",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--gold-ink)",
                marginBottom: "14px",
              }}
            >
              <span aria-hidden="true" style={{ display: "inline-block", width: "28px", height: "2px", background: "var(--gold-ink)" }} />
              Forty Tabs or Ten Names
            </p>
            <h2
              style={{
                fontSize: "clamp(26px, 2.8vw, 36px)",
                lineHeight: "1.08",
                fontWeight: "800",
                letterSpacing: "-0.035em",
                color: "#fff",
                textWrap: "balance",
              }}
            >
              Tell Us the Job and the City. We Will Hand You the Ten Worth Calling.
            </h2>
          </div>
          <form
            data-fsearch=""
            action={routes.search()}
            method="get"
            role="search"
            aria-label="Find local businesses"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <label htmlFor="ftr-svc" style={SR_ONLY}>
              Service
            </label>
            <input id="ftr-svc" name="service" type="text" placeholder="What needs doing?" style={{ ...FIELD, flex: "1.1" }} />
            <label htmlFor="ftr-loc" style={SR_ONLY}>
              City
            </label>
            <input id="ftr-loc" name="location" type="text" placeholder="City or postal code" style={{ ...FIELD, flex: "1" }} />
            <button
              data-fcta=""
              type="submit"
              style={{
                height: "48px",
                padding: "0 20px",
                border: "0",
                borderRadius: "10px",
                background: "var(--color-primary)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Show Me the Ten
            </button>
          </form>
        </div>

        <div
          data-fgrid=""
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
            gap: "44px 32px",
            alignItems: "start",
            padding: "52px 0 48px",
          }}
        >
          <div data-fbrand="" style={{ maxWidth: "320px" }}>
            <Link href="/" aria-label="TenBestFind home" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <span
                data-fmark=""
                aria-hidden="true"
                style={{
                  position: "relative",
                  display: "inline-flex",
                  width: "44px",
                  height: "44px",
                  borderRadius: "13px",
                  overflow: "hidden",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 20px -10px rgba(0,0,0,0.6)",
                }}
              >
                <svg width="44" height="44" viewBox="0 0 42 42" aria-hidden="true" style={{ display: "block" }}>
                  <defs>
                    <linearGradient id="tbf-ftr-bg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#2D74D7" />
                      <stop offset="1" stopColor="#1E3564" />
                    </linearGradient>
                    <linearGradient id="tbf-ftr-gold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#F2CF85" />
                      <stop offset="1" stopColor="#D9A94A" />
                    </linearGradient>
                  </defs>
                  <rect width="42" height="42" rx="13" fill="url(#tbf-ftr-bg)" />
                  <path d="M10.5 15.2 l4.6-3.4 v18.4" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                  <ellipse cx="26.2" cy="21" rx="6.3" ry="9.2" fill="none" stroke="#FFFFFF" strokeWidth="3.4" />
                  <path d="M23.3 21.4 l2.1 2.1 4.1-4.6" fill="none" stroke="url(#tbf-ftr-gold)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle data-fmark-dot="" cx="34.5" cy="8.5" r="2.2" fill="url(#tbf-ftr-gold)" style={{ transformOrigin: "34.5px 8.5px" }} />
                </svg>
              </span>
              <span style={{ display: "block", lineHeight: "1" }}>
                <span style={{ display: "block", fontSize: "21px", fontWeight: "800", letterSpacing: "-0.045em", color: "#fff" }}>
                  TenBest<span style={{ color: "#7FB2F5" }}>Find</span>
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "5px",
                    fontSize: "10px",
                    fontWeight: "700",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "rgba(232,237,245,0.55)",
                  }}
                >
                  <span aria-hidden="true" style={{ display: "inline-block", width: "10px", height: "1.5px", background: "var(--gold-ink)" }} />
                  Local Rankings
                </span>
              </span>
            </Link>
            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.65",
                color: "rgba(232,237,245,0.72)",
                marginBottom: "22px",
                textWrap: "pretty",
              }}
            >
              A small editorial team that researches local service companies one city at a time, then publishes ten
              names and the reasons behind each one.
            </p>
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(232,237,245,0.45)",
                marginBottom: "10px",
              }}
            >
              Choose a country
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {nav.countries.map((country) => (
                <Link
                  key={country.code}
                  data-fctry=""
                  href={country.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "9px",
                    height: "42px",
                    padding: "0 16px",
                    borderRadius: "11px",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.05)",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#fff",
                  }}
                >
                  <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: "0.06em", color: "var(--gold-ink)" }}>
                    {country.code.toUpperCase()}
                  </span>
                  {country.name}
                </Link>
              ))}
            </div>
          </div>

          <Column label="Home Services">
            {trades.map((trade) => (
              <Row key={trade.href} href={trade.href}>
                {trade.name}
              </Row>
            ))}
            <Row href={routes.servicesIndex()} tone="gold">
              All {nav.serviceCount} Services
            </Row>
          </Column>

          <Column label="Explore">
            <Row href={routes.rankingsIndex()}>Latest Rankings</Row>
            <Row href={routes.guidesIndex()}>Guides</Row>
            <Row href={routes.locationsIndex()}>All Locations</Row>
            {nav.countries.map((country) => (
              <Row key={country.code} href={country.href}>
                {country.name}
              </Row>
            ))}
            <Row href={routes.search()}>Search</Row>
          </Column>

          <Column label="Company">
            <Row href="/about/">About</Row>
            <Row href={routes.howWeRank()}>How We Rank</Row>
            <Row href={routes.editorialTeam()}>Editorial Team</Row>
            <Row href="/editorial-standards/">Editorial Standards</Row>
            <Row href={routes.corrections()}>Corrections Policy</Row>
            <Row href={routes.contact()}>Contact</Row>
          </Column>

          <nav aria-label="For businesses and legal">
            <h2 style={COL_HEAD}>For Businesses</h2>
            <ul style={{ display: "grid", gap: "11px", marginBottom: "28px" }}>
              <Row href={routes.claim()}>Claim Your Profile</Row>
              <Row href="/add-business/">Add a Business</Row>
              <Row href={routes.forBusinesses()}>Top 10 Listing</Row>
            </ul>
            <h2 style={COL_HEAD}>Legal</h2>
            <ul style={{ display: "grid", gap: "11px" }}>
              <Row href="/privacy/">Privacy</Row>
              <Row href="/terms/">Terms</Row>
              <Row href={routes.advertisingDisclosure()}>Advertising Disclosure</Row>
              <Row href="/accessibility/">Accessibility</Row>
            </ul>
          </nav>
        </div>

        <div
          data-fbottom=""
          style={{
            padding: "22px 0 28px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px 24px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: "13.5px", color: "rgba(232,237,245,0.5)" }}>
            © {new Date().getFullYear()} TenBestFind. All rights reserved.
          </p>
          <p style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "13.5px", color: "rgba(232,237,245,0.6)" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--gold-ink)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            The ten ranked positions are never for sale. Featured placements are always labelled.
          </p>
        </div>
      </div>
    </footer>
  );
}
