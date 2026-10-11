"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}

export type HowStep = { n: string; title: string; body: string };

const BOX: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
};

const EYEBROW: CSSProperties = {
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--gold-ink)",
  marginBottom: "18px",
};

/** What step one pulls for every company. Taken from the step's own sentence. */
const RECORDS = [
  {
    label: "Licence records",
    d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z M9 12l2 2 4-4",
  },
  {
    label: "Insurance status",
    d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M9 12l2 2 4-4",
  },
  {
    label: "Years in business",
    d: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8 14h.01 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01",
  },
  {
    label: "Public complaints",
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 9h8 M8 13h5",
  },
];

const QUESTIONS = [
  "Licensed for that exact work",
  "Answers after hours",
  "Warranty terms in writing before the deposit",
];

const OUTPUTS = ["Criteria", "Sources", "Review date"];

/** The ten bars of the published list, longest first, as the design draws them. */
const BAR_WIDTHS = [94, 88, 83, 78, 74, 70, 66, 62, 58, 55];
const BAR_ALPHA = [0, 0.208, 0.196, 0.184, 0.172, 0.16, 0.148, 0.136, 0.124, 0.112];

/** A style object that carries the stagger index as a custom property. */
const st = (style: Record<string, string | number>) => style as CSSProperties;

const Tick = ({ size = 11, stroke = "currentColor" }: { size?: number; stroke?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/**
 * The three steps of how a list is made, as tabs with a dark stage beside them.
 * It advances on its own while it is on screen and the pointer is not over it;
 * each tab's progress bar finishing is what moves it on. Picking a tab stops
 * waiting for the bar. Under reduced motion there is no bar, so it only moves
 * when it is asked to.
 */
export function HowSteps({ steps }: { steps: HowStep[] }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "-25% 0px -25% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const count = steps.length;

  function onKey(event: React.KeyboardEvent, index: number) {
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % count;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + count) % count;
    else return;
    event.preventDefault();
    setStep(next);
    tabs.current[next]?.focus();
  }

  return (
    <div
      ref={root}
      data-how=""
      data-paused={paused ? "1" : "0"}
      data-inview={inView ? "1" : "0"}
      style={{ position: "relative" }}
    >
      <div
        data-howgrid=""
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "14px" }}
      >
        <div
          data-reveal=""
          role="tablist"
          aria-label="How a list is made"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{ display: "grid", gap: "8px", alignContent: "start" }}
        >
          {steps.map((s, i) => (
            <button
              key={s.n}
              ref={(node) => {
                tabs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={`how-tab-${i}`}
              aria-controls={`how-panel-${i}`}
              aria-selected={step === i}
              tabIndex={step === i ? 0 : -1}
              data-steptab=""
              data-on={step === i ? "1" : "0"}
              onClick={() => setStep(i)}
              onKeyDown={(event) => onKey(event, i)}
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "44px minmax(0, 1fr)",
                gap: "14px",
                alignItems: "start",
                width: "100%",
                textAlign: "left",
                padding: "16px 18px 18px",
                borderRadius: "20px",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-card)",
                cursor: "pointer",
                overflow: "hidden",
                font: "inherit",
                color: "var(--ink)",
              }}
            >
              <span
                data-snum=""
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  border: "1.5px solid var(--border-strong)",
                  fontSize: "13px",
                  fontWeight: "800",
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--ink)",
                }}
              >
                {s.n}
              </span>
              <span style={{ display: "block", minWidth: "0", paddingTop: "10px" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "18px",
                    fontWeight: "700",
                    letterSpacing: "-0.02em",
                    lineHeight: "1.2",
                  }}
                >
                  {s.title}
                </span>
                <span data-sbody="" style={{ display: "grid", gridTemplateRows: "0fr" }}>
                  <span style={{ overflow: "hidden" }}>
                    <span
                      style={{
                        display: "block",
                        paddingTop: "6px",
                        fontSize: "14.5px",
                        lineHeight: "1.6",
                        color: "var(--text-secondary)",
                        textWrap: "pretty",
                      }}
                    >
                      {s.body}
                    </span>
                  </span>
                </span>
              </span>
              <span
                aria-hidden="true"
                style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "3px" }}
              >
                <span
                  data-hm-prog=""
                  onAnimationEnd={() => {
                    if (step === i) setStep((i + 1) % count);
                  }}
                  style={{
                    display: "block",
                    height: "100%",
                    background: "linear-gradient(90deg, var(--gold-ink), var(--color-primary))",
                    transform: "scaleX(0)",
                    transformOrigin: "left",
                  }}
                />
              </span>
            </button>
          ))}
        </div>

        <div
          data-reveal=""
          data-stage=""
          style={{
            position: "relative",
            minHeight: "440px",
            borderRadius: "26px",
            background: "var(--ink)",
            overflow: "hidden",
            boxShadow: "0 40px 80px -44px rgba(16,31,61,0.7)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              WebkitMaskImage: "radial-gradient(400px 300px at 100% 0%, #000, transparent)",
              maskImage: "radial-gradient(400px 300px at 100% 0%, #000, transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              background: "radial-gradient(420px 260px at 0% 100%, rgba(45,116,215,0.35), transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Step one: the records pulled for every company. */}
          <div
            data-panel=""
            role="tabpanel"
            id="how-panel-0"
            aria-labelledby="how-tab-0"
            data-on={step === 0 ? "1" : "0"}
          >
            <p data-anim="" style={{ "--d": 0, ...EYEBROW }}>
              Step {steps[0]?.n} · {steps[0]?.title}
            </p>
            <ul style={{ display: "grid", gap: "10px" }}>
              {RECORDS.map((record, i) => (
                <li
                  key={record.label}
                  data-anim=""
                  style={{ "--d": i + 1, ...BOX, padding: "12px 14px" }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: "relative",
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "rgba(231,184,99,0.12)",
                      border: "1px solid rgba(231,184,99,0.28)",
                      color: "var(--gold-ink)",
                    }}
                  >
                    <svg
                      data-ico=""
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path pathLength="1" d={record.d} />
                    </svg>
                  </span>
                  <span style={{ flex: "1", minWidth: "0", fontSize: "14.5px", fontWeight: "600", color: "#fff" }}>
                    {record.label}
                    <span
                      aria-hidden="true"
                      style={{
                        display: "block",
                        marginTop: "8px",
                        height: "4px",
                        borderRadius: "99px",
                        background: "rgba(255,255,255,0.1)",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        data-pr=""
                        style={{
                          "--d": i,
                          display: "block",
                          height: "100%",
                          borderRadius: "99px",
                          background: "linear-gradient(90deg, var(--gold-ink), #F3D49A)",
                          transformOrigin: "left",
                        }}
                      />
                    </span>
                  </span>
                  <span
                    data-pok=""
                    style={{
                      "--d": i,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      height: "24px",
                      padding: "0 9px",
                      borderRadius: "999px",
                      background: "rgba(123,220,176,0.14)",
                      color: "#7BDCB0",
                      fontSize: "11px",
                      fontWeight: "700",
                    }}
                  >
                    <Tick />
                    Pulled
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step two: the questions that decide a job. */}
          <div
            data-panel=""
            role="tabpanel"
            id="how-panel-1"
            aria-labelledby="how-tab-1"
            data-on={step === 1 ? "1" : "0"}
          >
            <p data-anim="" style={{ "--d": 0, ...EYEBROW }}>
              Step {steps[1]?.n} · {steps[1]?.title}
            </p>
            <ul style={{ display: "grid", gap: "10px" }}>
              {QUESTIONS.map((question, i) => (
                <li
                  key={question}
                  data-anim=""
                  style={{ "--d": i + 1, ...BOX, minHeight: "64px", padding: "12px 16px" }}
                >
                  <span
                    style={{
                      flex: "1",
                      minWidth: "0",
                      fontSize: "15px",
                      lineHeight: "1.35",
                      fontWeight: "600",
                      color: "#fff",
                      textWrap: "pretty",
                    }}
                  >
                    {question}
                  </span>
                  <span
                    data-tg=""
                    aria-hidden="true"
                    style={{
                      "--d": i,
                      position: "relative",
                      flexShrink: 0,
                      width: "44px",
                      height: "26px",
                      borderRadius: "999px",
                      background: "var(--gold-ink)",
                    }}
                  >
                    <span
                      data-knob=""
                      style={{
                        "--d": i,
                        position: "absolute",
                        left: "3px",
                        top: "3px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "var(--ink)",
                        transform: "translateX(18px)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <p
              data-anim=""
              style={{
                "--d": 6,
                marginTop: "auto",
                paddingTop: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color: "rgba(232,237,245,0.7)",
              }}
            >
              <span
                aria-hidden="true"
                style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold-ink)" }}
              />
              The steps never change. The criteria do.
            </p>
          </div>

          {/* Step three: ten names, then the clock. */}
          <div
            data-panel=""
            role="tabpanel"
            id="how-panel-2"
            aria-labelledby="how-tab-2"
            data-on={step === 2 ? "1" : "0"}
          >
            <p data-anim="" style={{ "--d": 0, ...EYEBROW }}>
              Step {steps[2]?.n} · {steps[2]?.title}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "18px",
                alignItems: "center",
              }}
            >
              <ol aria-hidden="true" style={{ display: "grid", gap: "6px" }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        width: "18px",
                        fontSize: "10.5px",
                        fontWeight: "800",
                        color: i === 0 ? "var(--gold-ink)" : "rgba(232,237,245,0.5)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      data-sk=""
                      style={{
                        "--d": i,
                        display: "block",
                        width: `${BAR_WIDTHS[i]}%`,
                        height: "12px",
                        borderRadius: "99px",
                        background: i === 0 ? "var(--gold-ink)" : `rgba(255,255,255,${BAR_ALPHA[i]})`,
                        transformOrigin: "left",
                      }}
                    />
                  </li>
                ))}
              </ol>
              <div data-anim="" style={{ "--d": 3, position: "relative", width: "112px", height: "112px" }}>
                <svg
                  viewBox="0 0 120 120"
                  width="112"
                  height="112"
                  aria-hidden="true"
                  style={{ transform: "rotate(-90deg)" }}
                >
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    data-ring=""
                    pathLength="1"
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="var(--gold-ink)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    style={{ strokeDasharray: 1, strokeDashoffset: 0 }}
                  />
                </svg>
                <span
                  style={{
                    position: "absolute",
                    inset: "0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  <span style={{ fontSize: "30px", fontWeight: "800", letterSpacing: "-0.04em", lineHeight: "1" }}>
                    90
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--serif)",
                      fontStyle: "italic",
                      fontSize: "14px",
                      color: "var(--gold-ink)",
                    }}
                  >
                    days
                  </span>
                </span>
              </div>
            </div>
            <div style={{ marginTop: "auto", paddingTop: "16px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {OUTPUTS.map((output, i) => (
                <span
                  key={output}
                  data-anim=""
                  style={{
                    "--d": 5 + i,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "30px",
                    padding: "0 12px",
                    borderRadius: "999px",
                    background: "rgba(231,184,99,0.12)",
                    border: "1px solid rgba(231,184,99,0.3)",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  <Tick stroke="var(--gold-ink)" />
                  {output}
                </span>
              ))}
              <span
                data-anim=""
                style={{
                  "--d": 8,
                  display: "inline-flex",
                  alignItems: "center",
                  height: "30px",
                  padding: "0 4px",
                  color: "rgba(232,237,245,0.7)",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Re-checked inside 90 days
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
