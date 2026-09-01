import { Panel } from "./shell";
import { SeoPanel } from "./SeoPanel";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import type { SeoEntityType } from "@/lib/enums";

/**
 * The SEO panel plus its record lookup. Every editor screen needs the same
 * thing, so the mapping from the stored row to the client component lives here
 * once rather than in a dozen pages.
 */
export async function SeoSection({
  entityType,
  entityId,
  path,
  fallbackTitle,
  fallbackDescription,
  contentSample,
  title = "SEO",
  description = "Overrides what this page publishes, field by field.",
}: {
  entityType: SeoEntityType;
  entityId: string;
  path: string;
  fallbackTitle: string;
  fallbackDescription: string;
  contentSample: string;
  title?: string;
  description?: string;
}) {
  const seo = await db.seoMeta.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });

  return (
    <Panel title={title} description={description}>
      <SeoPanel
        entityType={entityType}
        entityId={entityId}
        path={path}
        fallbackTitle={fallbackTitle}
        fallbackDescription={fallbackDescription}
        contentSample={contentSample}
        record={
          seo
            ? {
                title: seo.title,
                description: seo.description,
                canonical: seo.canonical,
                focusKeyword: seo.focusKeyword,
                extraKeywords: parseList(seo.extraKeywords),
                breadcrumbTitle: seo.breadcrumbTitle,
                robotsIndex: seo.robotsIndex,
                robotsFollow: seo.robotsFollow,
                robotsNoArchive: seo.robotsNoArchive,
                robotsNoSnippet: seo.robotsNoSnippet,
                robotsNoImageIndex: seo.robotsNoImageIndex,
                maxImagePreview: seo.maxImagePreview,
                ogTitle: seo.ogTitle,
                ogDescription: seo.ogDescription,
                ogImage: seo.ogImage,
                twitterCard: seo.twitterCard,
                schemaType: seo.schemaType,
                schemaJson: seo.schemaJson,
                score: seo.score,
              }
            : null
        }
      />
    </Panel>
  );
}

/** Shown in place of the panel before an entity exists to attach a record to. */
export function SeoPlaceholder({ what }: { what: string }) {
  return (
    <Panel title="SEO">
      <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
        Save the {what} first, then its SEO record becomes editable here.
      </p>
    </Panel>
  );
}
