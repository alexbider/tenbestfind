import { JsonLd } from "@/components/ui/primitives";

export type FaqItem = { id?: string; question: string; answer: string };

/** FAQ accordion. Answers stay in the DOM, and FAQPage microdata is emitted. */
export function FaqList({ faqs }: { faqs: FaqItem[] }) {
  return (
    <div className="faq-list" itemScope itemType="https://schema.org/FAQPage">
      {faqs.map((faq, index) => (
        <details
          key={faq.id ?? index}
          className="faq-item"
          itemScope
          itemProp="mainEntity"
          itemType="https://schema.org/Question"
        >
          <summary>
            <span itemProp="name">{faq.question}</span>
            <span className="faq-item__icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
          </summary>
          <div
            className="faq-item__answer"
            itemScope
            itemProp="acceptedAnswer"
            itemType="https://schema.org/Answer"
          >
            <p itemProp="text">{faq.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

export function faqJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function FaqJsonLd({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null;
  return <JsonLd data={faqJsonLd(faqs)} />;
}
