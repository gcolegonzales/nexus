import type { Asset } from "@/tools/home-maintenance/types/asset";

/** @deprecated Used only for v1 migration. */
export const HOUSE_ASSET_ID = "asset-house";

export function createSeedAssets(homeId: string): Asset[] {
  return [
    {
      id: "asset-refrigerator",
      homeId,
      category: "refrigerator",
      brand: "Samsung",
      model: "RF28HFEDTSR",
      nickname: "Kitchen fridge",
    },
    {
      id: "asset-washer",
      homeId,
      category: "washer",
      brand: "LG",
      model: "WM4080HWA",
    },
    {
      id: "asset-dryer",
      homeId,
      category: "dryer",
      brand: "LG",
      model: "DLEX4080W",
    },
    {
      id: "asset-water-heater",
      homeId,
      category: "water-heater",
      brand: "Rheem",
      model: "RTG-95XLN-1",
      nickname: "Tankless natural gas (outdoor)",
    },
    {
      id: "asset-microwave",
      homeId,
      category: "microwave",
      brand: "Frigidaire Gallery",
      model: "FGMV176NTF",
    },
    {
      id: "asset-dishwasher",
      homeId,
      category: "dishwasher",
      brand: "Frigidaire Gallery",
      model: "FGID2468UF2A",
    },
    {
      id: "asset-range",
      homeId,
      category: "range",
      brand: "Frigidaire Gallery",
      model: "FGGF3036TFB",
      nickname: "Gas range",
    },
    {
      id: "asset-water-filter",
      homeId,
      category: "water-filter",
      nickname: "Whole-house water filter",
      notes: "Model not known yet",
    },
  ];
}
