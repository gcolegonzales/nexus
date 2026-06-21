import type { Asset, HvacDetails, HvacFilterInfo } from "@/tools/home-maintenance/types/asset";
import type { Home } from "@/tools/home-maintenance/types/home";

export function getHvacFilterInfo(asset: Asset): HvacFilterInfo | undefined {
  return asset.hvac?.filter;
}

export function getHvacFilterSize(asset: Asset, home?: Home): string | undefined {
  const fromAsset = asset.hvac?.filter?.size?.trim();
  if (fromAsset) return fromAsset;
  return home?.hvacFilterSize?.trim() || undefined;
}

export function isHvacFilterConfigured(asset: Asset, home?: Home): boolean {
  return Boolean(getHvacFilterSize(asset, home));
}

export function formatFilterLabel(filter?: HvacFilterInfo): string | undefined {
  if (!filter) return undefined;
  const parts = [filter.brand, filter.model].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return filter.size;
}

export function buildHvacFilterPurchaseLinks(
  filter: HvacFilterInfo | undefined,
  filterSize: string | undefined,
) {
  const links: { label: string; url: string }[] = [];

  if (filter?.brand && filter?.model && filterSize) {
    links.push({
      label: "Amazon search (exact model + size)",
      url: `https://www.amazon.com/s?k=${encodeURIComponent(
        `${filter.brand} ${filter.model} ${filterSize}`,
      )}`,
    });
  }

  if (filterSize) {
    const shortSize = filterSize.replace(/\.375$/, "");
    links.push({
      label: "Amazon search (size alternative)",
      url: `https://www.amazon.com/s?k=${encodeURIComponent(
        `${shortSize} Air Bear filter`,
      )}`,
    });
  }

  return links;
}

export function mergeHvacDetails(
  current: HvacDetails | undefined,
  patch: Partial<HvacDetails>,
): HvacDetails {
  return {
    ...current,
    ...patch,
    filter: {
      ...current?.filter,
      ...patch.filter,
    },
  };
}
