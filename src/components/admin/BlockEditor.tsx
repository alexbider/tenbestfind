"use client";

import { useState } from "react";
import type { GuideBlock } from "../../../prisma/data/editorial";
import { Icon } from "@/components/ui/Icon";
import { slugify } from "@/lib/format";

const KINDS: { value: GuideBlock["kind"]; label: string; hint: string }[] = [
  { value: "heading", label: "Heading", hint: "Becomes an anchor in the contents rail" },
  { value: "paragraph", label: "Paragraph", hint: "Body text" },
  { value: "list", label: "Bullet list", hint: "One item per line" },
  { value: "steps", label: "Numbered steps", hint: "Title and body per step" },
  { value: "callout", label: "Callout", hint: "Note, alert or brand-tinted box" },
  { value: "quote", label: "Pull quote", hint: "Attributed quote" },
];

function emptyBlock(kind: GuideBlock["kind"]): GuideBlock {
  switch (kind) {
    case "heading":
      return { kind: "heading", text: "New section", id: `section-${Date.now().toString(36)}` };
    case "list":
      return { kind: "list", items: [""] };
    case "steps":
      return { kind: "steps", items: [{ title: "", body: "" }] };
    case "callout":
      return { kind: "callout", tone: "note", title: "", body: "" };
    case "quote":
      return { kind: "quote", text: "", attribution: "" };
    default:
      return { kind: "paragraph", text: "" };
  }
}

function summarize(block: GuideBlock): string {
  switch (block.kind) {
    case "heading":
    case "paragraph":
      return block.text;
    case "list":
      return block.items.filter(Boolean).join(" · ");
    case "steps":
      return block.items.map((item) => item.title).filter(Boolean).join(" · ");
    case "callout":
      return block.title;
    case "quote":
      return block.text;
    default:
      return "";
  }
}

/**
 * Edits the structured body of a guide or page. Blocks are the same shape the
 * public renderer consumes, so what you build here is exactly what publishes.
 * The value is serialized into a hidden field and posted with the parent form.
 */
export function BlockEditor({
  name,
  initial,
}: {
  name: string;
  initial: GuideBlock[];
}) {
  const [blocks, setBlocks] = useState<GuideBlock[]>(initial);
  const [adding, setAdding] = useState<GuideBlock["kind"]>("paragraph");

  const update = (index: number, next: GuideBlock) => {
    setBlocks((current) => current.map((block, i) => (i === index ? next : block)));
  };

  const move = (index: number, delta: number) => {
    setBlocks((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) => {
    setBlocks((current) => current.filter((_, i) => i !== index));
  };

  return (
    <div className="block-editor">
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />

      {blocks.length === 0 ? (
        <p style={{ fontSize: 14.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          No content yet. Add the first block below.
        </p>
      ) : null}

      <ol className="block-list">
        {blocks.map((block, index) => (
          <li key={index} className="block-item">
            <div className="block-item__bar">
              <span className="block-item__kind">{block.kind}</span>
              <span className="block-item__summary">{summarize(block) || "Empty"}</span>
              <div className="block-item__actions">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <Icon name="up" size={14} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === blocks.length - 1}
                  aria-label="Move down"
                >
                  <Icon name="down" size={14} strokeWidth={2.2} />
                </button>
                <button type="button" onClick={() => remove(index)} aria-label="Remove block">
                  <Icon name="alert" size={14} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="block-item__body">
              {block.kind === "heading" ? (
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Heading text</label>
                    <input
                      type="text"
                      value={block.text}
                      onChange={(event) =>
                        update(index, {
                          ...block,
                          text: event.target.value,
                          id: block.id || slugify(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Anchor</label>
                    <input
                      type="text"
                      value={block.id}
                      onChange={(event) => update(index, { ...block, id: slugify(event.target.value) })}
                    />
                    <span className="field__hint">Used by the contents rail and deep links.</span>
                  </div>
                </div>
              ) : null}

              {block.kind === "paragraph" ? (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Text</label>
                  <textarea
                    rows={4}
                    value={block.text}
                    onChange={(event) => update(index, { ...block, text: event.target.value })}
                  />
                </div>
              ) : null}

              {block.kind === "list" ? (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Items, one per line</label>
                  <textarea
                    rows={5}
                    value={block.items.join("\n")}
                    onChange={(event) =>
                      update(index, { ...block, items: event.target.value.split("\n") })
                    }
                  />
                </div>
              ) : null}

              {block.kind === "steps" ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {block.items.map((step, stepIndex) => (
                    <div key={stepIndex} className="field-row" style={{ alignItems: "start" }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Step {stepIndex + 1} title</label>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(event) =>
                            update(index, {
                              ...block,
                              items: block.items.map((item, i) =>
                                i === stepIndex ? { ...item, title: event.target.value } : item,
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Step {stepIndex + 1} body</label>
                        <textarea
                          rows={2}
                          value={step.body}
                          onChange={(event) =>
                            update(index, {
                              ...block,
                              items: block.items.map((item, i) =>
                                i === stepIndex ? { ...item, body: event.target.value } : item,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        update(index, { ...block, items: [...block.items, { title: "", body: "" }] })
                      }
                    >
                      Add step
                    </button>
                    {block.items.length > 1 ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => update(index, { ...block, items: block.items.slice(0, -1) })}
                      >
                        Remove last
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {block.kind === "callout" ? (
                <>
                  <div className="field-row">
                    <div className="field">
                      <label>Tone</label>
                      <select
                        value={block.tone}
                        onChange={(event) =>
                          update(index, {
                            ...block,
                            tone: event.target.value as "note" | "alert" | "brand",
                          })
                        }
                      >
                        <option value="note">Note (amber)</option>
                        <option value="alert">Alert (red)</option>
                        <option value="brand">Brand (blue)</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Title</label>
                      <input
                        type="text"
                        value={block.title}
                        onChange={(event) => update(index, { ...block, title: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Body</label>
                    <textarea
                      rows={3}
                      value={block.body}
                      onChange={(event) => update(index, { ...block, body: event.target.value })}
                    />
                  </div>
                </>
              ) : null}

              {block.kind === "quote" ? (
                <>
                  <div className="field">
                    <label>Quote</label>
                    <textarea
                      rows={3}
                      value={block.text}
                      onChange={(event) => update(index, { ...block, text: event.target.value })}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Attribution</label>
                    <input
                      type="text"
                      value={block.attribution}
                      onChange={(event) =>
                        update(index, { ...block, attribution: event.target.value })
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="block-add">
        <select value={adding} onChange={(event) => setAdding(event.target.value as GuideBlock["kind"])}>
          {KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => setBlocks((current) => [...current, emptyBlock(adding)])}
        >
          <Icon name="plus" size={15} />
          Add block
        </button>
        <span>{KINDS.find((kind) => kind.value === adding)?.hint}</span>
      </div>
    </div>
  );
}
