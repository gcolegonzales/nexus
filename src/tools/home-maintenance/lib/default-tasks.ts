import { amazonSearchUrl } from "@/shared/amazon/searchUrl";
import {
  buildHvacFilterPurchaseLinks,
  formatFilterLabel,
  getHvacFilterInfo,
  getHvacFilterSize,
  isHvacFilterConfigured,
} from "@/tools/home-maintenance/lib/hvac-filter";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import type { BuyLink, Part, TaskBuildContext, TaskTemplate } from "@/tools/home-maintenance/types/task";

function assetLabel(asset: Asset): string {
  return asset.nickname ?? asset.model ?? asset.brand ?? "appliance";
}

function modelQuery(asset: Asset, suffix: string): string {
  const parts = [asset.brand, asset.model, suffix].filter(Boolean);
  return parts.join(" ");
}

function modelLink(asset: Asset, suffix: string, label?: string): BuyLink {
  return {
    label: label ?? `Shop ${suffix}`,
    url: amazonSearchUrl(modelQuery(asset, suffix)),
  };
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    templateKey: "fridge-water-filter",
    assetCategory: "refrigerator",
    title: "Replace refrigerator water filter",
    intervalMonths: 6,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Replace the water filter for ${assetLabel(ctx.asset)} (${ctx.asset.brand ?? ""} ${ctx.asset.model ?? ""}). Flush several cups of water after installing.`,
    buildParts: () => [
      { name: "Water filter", type: "filter", partNumber: "HAF-CIN/EXP (common Samsung)" },
    ],
    buildLinks: (ctx) => [
      modelLink(ctx.asset, "HAF-CIN EXP water filter", "Search Samsung water filter"),
    ],
  },
  {
    templateKey: "fridge-condenser-clean",
    assetCategory: "refrigerator",
    title: "Clean refrigerator condenser coils",
    intervalMonths: 12,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Vacuum or brush condenser coils on ${assetLabel(ctx.asset)}. Unplug first if required by your manual.`,
    buildParts: () => [{ name: "Coil brush", type: "tool" }],
    buildLinks: () => [
      { label: "Search coil brush", url: amazonSearchUrl("refrigerator condenser coil brush") },
    ],
  },
  {
    templateKey: "washer-tub-clean",
    assetCategory: "washer",
    title: "Run washer tub clean cycle",
    intervalMonths: 3,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Run a tub clean or machine cleaner cycle on ${assetLabel(ctx.asset)}. Wipe door gasket after.`,
    buildParts: () => [{ name: "Washing machine cleaner", type: "cleaner" }],
    buildLinks: (ctx) => [modelLink(ctx.asset, "washing machine cleaner")],
  },
  {
    templateKey: "washer-drain-filter",
    assetCategory: "washer",
    title: "Clean washer drain pump filter",
    intervalMonths: 6,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Clean the drain pump filter on ${assetLabel(ctx.asset)} per the manual. Have towels ready for residual water.`,
    buildParts: () => [],
    buildLinks: (ctx) => [modelLink(ctx.asset, "drain pump filter")],
  },
  {
    templateKey: "washer-gasket-clean",
    assetCategory: "washer",
    title: "Clean detergent drawer and door gasket",
    intervalMonths: 6,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Remove and rinse the detergent drawer. Wipe the door gasket and leave the door ajar to dry on ${assetLabel(ctx.asset)}.`,
    buildParts: () => [],
    buildLinks: () => [],
  },
  {
    templateKey: "dryer-vent-clean",
    assetCategory: "dryer",
    title: "Inspect and clean dryer vent",
    intervalMonths: 12,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Inspect vent run for ${assetLabel(ctx.asset)}. Clean lint from trap, duct, and exterior hood.`,
    buildParts: () => [{ name: "Dryer vent cleaning kit", type: "tool" }],
    buildLinks: (ctx) => [
      modelLink(ctx.asset, "dryer vent cleaning kit"),
      { label: "Generic vent kit", url: amazonSearchUrl("dryer vent cleaning kit") },
    ],
  },
  {
    templateKey: "dishwasher-filter-clean",
    assetCategory: "dishwasher",
    title: "Clean dishwasher filter",
    intervalMonths: 3,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Remove and rinse the filter assembly on ${assetLabel(ctx.asset)}. Check spray arms for debris.`,
    buildParts: () => [],
    buildLinks: (ctx) => [modelLink(ctx.asset, "dishwasher filter")],
  },
  {
    templateKey: "dishwasher-cleaner-cycle",
    assetCategory: "dishwasher",
    title: "Run dishwasher cleaner cycle",
    intervalMonths: 6,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Run an empty hot cycle with dishwasher cleaner on ${assetLabel(ctx.asset)}.`,
    buildParts: () => [{ name: "Dishwasher cleaner", type: "cleaner" }],
    buildLinks: (ctx) => [modelLink(ctx.asset, "dishwasher cleaner")],
  },
  {
    templateKey: "microwave-grease-filter",
    assetCategory: "microwave",
    title: "Clean or check microwave grease filter",
    intervalMonths: 6,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Remove and wash or replace the grease filter on ${assetLabel(ctx.asset)} (especially if over-the-range).`,
    buildParts: () => [{ name: "Grease filter", type: "filter" }],
    buildLinks: (ctx) => [modelLink(ctx.asset, "microwave grease filter")],
  },
  {
    templateKey: "range-grate-clean",
    assetCategory: "range",
    title: "Clean burner caps and grates",
    intervalMonths: 6,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Soak and scrub burner caps, grates, and cooktop on ${assetLabel(ctx.asset)}.`,
    buildParts: () => [{ name: "Cooktop cleaner", type: "cleaner" }],
    buildLinks: () => [
      { label: "Cooktop cleaner", url: amazonSearchUrl("gas range cooktop cleaner") },
    ],
  },
  {
    templateKey: "range-igniter-check",
    assetCategory: "range",
    title: "Inspect burners and flame pattern",
    intervalMonths: 12,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Check each burner on ${assetLabel(ctx.asset)} for even ignition and steady blue flames. Note any weak or yellow flames.`,
    buildParts: () => [],
    buildLinks: () => [],
  },
  {
    templateKey: "tankless-visual-inspection",
    assetCategory: "water-heater",
    title: "Tankless water heater visual inspection",
    intervalMonths: 12,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Inspect ${assetLabel(ctx.asset)} for error codes, leaks, vent blockages, and clearances per Rheem manual.`,
    buildParts: () => [],
    buildLinks: (ctx) => [modelLink(ctx.asset, "tankless water heater")],
  },
  {
    templateKey: "tankless-inlet-filter",
    assetCategory: "water-heater",
    title: "Clean tankless inlet water filter",
    intervalMonths: 12,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Shut off water, clean the inlet filter screen on ${assetLabel(ctx.asset)}, and check for scale buildup.`,
    buildParts: () => [{ name: "Inlet filter screen", type: "filter" }],
    buildLinks: (ctx) => [modelLink(ctx.asset, "inlet filter")],
  },
  {
    templateKey: "tankless-descale",
    assetCategory: "water-heater",
    title: "Descale / flush tankless water heater",
    intervalMonths: 24,
    startOffsetDays: 30,
    buildInstructions: (ctx) =>
      `Flush ${assetLabel(ctx.asset)} with manufacturer-approved descaling solution. Outdoor unit — ensure power/gas is off per manual.`,
    buildParts: () => [{ name: "Flush kit / descaler", type: "kit" }],
    buildLinks: (ctx) => [modelLink(ctx.asset, "tankless water heater flush kit")],
  },
  {
    templateKey: "smoke-co-test",
    assetCategory: "house",
    title: "Test smoke and CO detectors",
    intervalMonths: 6,
    startOffsetDays: 30,
    buildInstructions: () =>
      "Press test button on each smoke and carbon monoxide detector. Replace any that fail or chirp.",
    buildParts: () => [{ name: "9V or AA batteries", type: "battery" }],
    buildLinks: () => [
      { label: "Smoke detector batteries", url: amazonSearchUrl("smoke detector battery 9v") },
    ],
  },
  {
    templateKey: "smoke-co-battery",
    assetCategory: "house",
    title: "Replace or check detector batteries",
    intervalMonths: 12,
    startOffsetDays: 30,
    buildInstructions: () =>
      "Replace batteries in battery-powered detectors, or note replacement date for sealed units.",
    buildParts: () => [{ name: "Detector batteries", type: "battery" }],
    buildLinks: () => [
      { label: "Detector batteries", url: amazonSearchUrl("smoke co detector battery") },
    ],
  },
  {
    templateKey: "hvac-filter-inspection",
    assetCategory: "hvac",
    title: "HVAC filter inspection",
    intervalMonths: 6,
    startOffsetDays: 30,
    buildInstructions: (ctx) => {
      const filter = getHvacFilterInfo(ctx.asset);
      const size = getHvacFilterSize(ctx.asset, ctx.home);
      const filterLabel = formatFilterLabel(filter) ?? size ?? "HVAC filter";

      return [
        "Inspect HVAC filter condition.",
        "",
        "Replace if:",
        "- Pleats are heavily loaded with dust",
        "- Airflow appears restricted",
        "- Filter media is damaged",
        "- More than 9 months old",
        "",
        `Filter: ${filterLabel}`,
        size ? `Size: ${size.replace(/x/g, " x ")}` : "",
        "",
        "Record what you observe when completing this inspection.",
      ]
        .filter(Boolean)
        .join("\n");
    },
    buildParts: (ctx) => {
      const filter = getHvacFilterInfo(ctx.asset);
      const size = getHvacFilterSize(ctx.asset, ctx.home);
      if (!size) return [];

      return [
        {
          name: "HVAC filter",
          type: "filter",
          partNumber: size,
          buyLinks: buildHvacFilterPurchaseLinks(filter, size),
        },
      ];
    },
    buildLinks: (ctx) => {
      const filter = getHvacFilterInfo(ctx.asset);
      const size = getHvacFilterSize(ctx.asset, ctx.home);
      return buildHvacFilterPurchaseLinks(filter, size);
    },
    isEnabled: (ctx) => isHvacFilterConfigured(ctx.asset, ctx.home),
  },
  {
    templateKey: "hvac-filter-replacement",
    assetCategory: "hvac",
    title: "HVAC filter replacement",
    intervalMonths: 9,
    startOffsetDays: 30,
    buildInstructions: (ctx) => {
      const filter = getHvacFilterInfo(ctx.asset);
      const size = getHvacFilterSize(ctx.asset, ctx.home);
      const filterLabel = formatFilterLabel(filter) ?? size ?? "HVAC filter";

      return [
        "Replace the HVAC filter based on inspection results or age.",
        "",
        "Replace if:",
        "- Pleats are heavily loaded with dust",
        "- Airflow appears restricted",
        "- Filter media is damaged",
        "- More than 9 months old",
        "",
        `Filter: ${filterLabel}`,
        size ? `Size: ${size.replace(/x/g, " x ")}` : "",
        "",
        "Note the install date on the filter edge when replacing.",
      ]
        .filter(Boolean)
        .join("\n");
    },
    buildParts: (ctx) => {
      const filter = getHvacFilterInfo(ctx.asset);
      const size = getHvacFilterSize(ctx.asset, ctx.home);
      if (!size) return [];

      return [
        {
          name: "HVAC filter",
          type: "filter",
          partNumber: size,
          buyLinks: buildHvacFilterPurchaseLinks(filter, size),
        },
      ];
    },
    buildLinks: (ctx) => {
      const filter = getHvacFilterInfo(ctx.asset);
      const size = getHvacFilterSize(ctx.asset, ctx.home);
      return buildHvacFilterPurchaseLinks(filter, size);
    },
    isEnabled: (ctx) => isHvacFilterConfigured(ctx.asset, ctx.home),
  },
];
