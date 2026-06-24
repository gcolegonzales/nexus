import {
  ASSET_CATEGORY_LABELS,
  type Asset,
} from "@/tools/home-maintenance/types/asset";

export function getAssetLabel(asset: Asset): string {
  return (
    asset.nickname ||
    [asset.brand, asset.model].filter(Boolean).join(" ") ||
    ASSET_CATEGORY_LABELS[asset.category]
  );
}

export function getAssetCardTitle(asset: Asset): string {
  return [asset.brand, ASSET_CATEGORY_LABELS[asset.category]]
    .filter(Boolean)
    .join(" ");
}
