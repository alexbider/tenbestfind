import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/templates/CategoryPage";
import { CityHub } from "@/templates/CityHub";
import { CmsPage } from "@/templates/CmsPage";
import { CountryHub } from "@/templates/CountryHub";
import { RankingPage } from "@/templates/RankingPage";
import { RegionHub } from "@/templates/RegionHub";
import { SubservicePage } from "@/templates/SubservicePage";
import { redirectIfKnown } from "@/lib/redirects";
import { buildMetadata } from "@/lib/seo";
import { resolvePath } from "@/lib/resolve";

// Content is database-backed, so pages revalidate rather than being frozen at
// build time. Admin writes call revalidatePath for anything that must be
// immediate.
export const revalidate = 60;

type Props = { params: Promise<{ path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  return buildMetadata(await resolvePath(path), path);
}

export default async function CatchAllPage({ params }: Props) {
  const { path } = await params;
  const resolved = await resolvePath(path);

  switch (resolved.type) {
    case "country":
      return <CountryHub countryCode={resolved.countryCode} />;
    case "region":
      return <RegionHub countryCode={resolved.countryCode} regionSlug={resolved.regionSlug} />;
    case "city":
      return (
        <CityHub
          countryCode={resolved.countryCode}
          regionSlug={resolved.regionSlug}
          citySlug={resolved.citySlug}
        />
      );
    case "ranking":
      return (
        <RankingPage
          countryCode={resolved.countryCode}
          regionSlug={resolved.regionSlug}
          citySlug={resolved.citySlug}
          categorySlug={resolved.categorySlug}
        />
      );
    case "category":
      return <CategoryPage categorySlug={resolved.categorySlug} />;
    case "subservice":
      return (
        <SubservicePage
          categorySlug={resolved.categorySlug}
          subserviceSlug={resolved.subserviceSlug}
        />
      );
    case "page":
      return <CmsPage slug={resolved.slug} />;
    default:
      await redirectIfKnown(`/${path.join("/")}/`);
      notFound();
  }
}
