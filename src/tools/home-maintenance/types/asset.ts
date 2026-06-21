export type AssetCategory =
  | "house"
  | "refrigerator"
  | "washer"
  | "dryer"
  | "water-heater"
  | "microwave"
  | "dishwasher"
  | "range"
  | "water-filter"
  | "hvac"
  | "safety"
  | "other";

export interface HvacFilterInfo {
  brand?: string;
  model?: string;
  size?: string;
  merv?: number;
  replacementIntervalMonths?: number;
  inspectionIntervalMonths?: number;
  installedAt?: string;
  condition?: "good" | "moderate-dust" | "replace-needed";
  replacementNeeded?: boolean;
}

export interface HvacDetails {
  location?: string;
  configuration?: string;
  evaporatorCoilModel?: string;
  filter?: HvacFilterInfo;
}

export interface Asset {
  id: string;
  homeId: string;
  category: AssetCategory;
  brand?: string;
  model?: string;
  nickname?: string;
  installDate?: string;
  notes?: string;
  hvac?: HvacDetails;
}

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  house: "General Home",
  refrigerator: "Refrigerator",
  washer: "Washer",
  dryer: "Dryer",
  "water-heater": "Water Heater",
  microwave: "Microwave",
  dishwasher: "Dishwasher",
  range: "Range / Stove",
  "water-filter": "Water Filter",
  hvac: "HVAC",
  safety: "Safety",
  other: "Other",
};
