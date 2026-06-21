"use client";

import type { Asset, AssetCategory, HvacDetails } from "@/tools/home-maintenance/types/asset";
import { ASSET_CATEGORY_LABELS } from "@/tools/home-maintenance/types/asset";
import { assetNeedsInfo } from "@/tools/home-maintenance/lib/needs-info";
import { mergeHvacDetails } from "@/tools/home-maintenance/lib/hvac-filter";
import { NeedsInfoBadge } from "@/tools/home-maintenance/components/NeedsInfoBadge";
import { Input, Textarea } from "@nexus/ui";

const categories = Object.entries(ASSET_CATEGORY_LABELS).filter(
  ([value]) => value !== "house",
) as [AssetCategory, string][];

interface AssetFormProps {
  asset: Asset;
  onChange: (asset: Asset) => void;
  readOnly?: boolean;
  showNeedsInfoBadge?: boolean;
}

const disabledFieldClass =
  "cursor-pointer disabled:cursor-not-allowed disabled:bg-border/30 disabled:text-text disabled:opacity-100";

export function AssetForm({
  asset,
  onChange,
  readOnly = false,
  showNeedsInfoBadge = true,
}: AssetFormProps) {
  function update<K extends keyof Asset>(field: K, value: Asset[K]) {
    if (readOnly) return;
    onChange({ ...asset, [field]: value });
  }

  function updateHvac(patch: Partial<HvacDetails>) {
    if (readOnly) return;
    onChange({
      ...asset,
      hvac: mergeHvacDetails(asset.hvac, patch),
    });
  }

  function updateFilter(field: string, value: string | number | undefined) {
    if (readOnly) return;
    onChange({
      ...asset,
      hvac: mergeHvacDetails(asset.hvac, {
        filter: {
          ...asset.hvac?.filter,
          [field]: value,
        },
      }),
    });
  }

  return (
    <div className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Category</span>
        <select
          value={asset.category}
          disabled={readOnly}
          onChange={(e) =>
            update("category", e.target.value as AssetCategory)
          }
          className={`w-full cursor-pointer rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed ${disabledFieldClass}`}
        >
          {categories.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <Input
        label="Nickname"
        placeholder="Kitchen fridge"
        value={asset.nickname ?? ""}
        disabled={readOnly}
        onChange={(e) => update("nickname", e.target.value || undefined)}
        className={disabledFieldClass}
      />
      <Input
        label="Brand"
        value={asset.brand ?? ""}
        disabled={readOnly}
        onChange={(e) => update("brand", e.target.value || undefined)}
        className={disabledFieldClass}
      />
      <Input
        label="Model"
        value={asset.model ?? ""}
        disabled={readOnly}
        onChange={(e) => update("model", e.target.value || undefined)}
        className={disabledFieldClass}
      />
      <Input
        label="Install date"
        type="date"
        value={asset.installDate ?? ""}
        disabled={readOnly}
        onChange={(e) => update("installDate", e.target.value || undefined)}
        className={disabledFieldClass}
      />
      <Textarea
        label="Notes"
        value={asset.notes ?? ""}
        disabled={readOnly}
        onChange={(e) => update("notes", e.target.value || undefined)}
        className={disabledFieldClass}
      />

      {asset.category === "hvac" && (
        <div className="space-y-5 rounded-xl border border-border bg-primary/[0.04] p-4">
          <h4 className="text-sm font-semibold text-text">HVAC details</h4>
          <Input
            label="Location"
            value={asset.hvac?.location ?? ""}
            disabled={readOnly}
            onChange={(e) => updateHvac({ location: e.target.value || undefined })}
            className={disabledFieldClass}
          />
          <Input
            label="Configuration"
            value={asset.hvac?.configuration ?? ""}
            disabled={readOnly}
            onChange={(e) =>
              updateHvac({ configuration: e.target.value || undefined })
            }
            className={disabledFieldClass}
          />
          <Input
            label="Evaporator coil model"
            value={asset.hvac?.evaporatorCoilModel ?? ""}
            disabled={readOnly}
            onChange={(e) =>
              updateHvac({ evaporatorCoilModel: e.target.value || undefined })
            }
            className={disabledFieldClass}
          />

          <div className="space-y-5 border-t border-border pt-5">
            <h5 className="text-sm font-medium text-text">Filter</h5>
            <Input
              label="Filter brand"
              value={asset.hvac?.filter?.brand ?? ""}
              disabled={readOnly}
              onChange={(e) => updateFilter("brand", e.target.value || undefined)}
              className={disabledFieldClass}
            />
            <Input
              label="Filter model"
              value={asset.hvac?.filter?.model ?? ""}
              disabled={readOnly}
              onChange={(e) => updateFilter("model", e.target.value || undefined)}
              className={disabledFieldClass}
            />
            <Input
              label="Filter size"
              placeholder="16x25x4.375"
              value={asset.hvac?.filter?.size ?? ""}
              disabled={readOnly}
              onChange={(e) => updateFilter("size", e.target.value || undefined)}
              className={disabledFieldClass}
            />
            <Input
              label="MERV rating"
              type="number"
              value={asset.hvac?.filter?.merv?.toString() ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                updateFilter(
                  "merv",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className={disabledFieldClass}
            />
            <Input
              label="Filter installed date"
              type="date"
              value={asset.hvac?.filter?.installedAt ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                updateFilter("installedAt", e.target.value || undefined)
              }
              className={disabledFieldClass}
            />
            <Input
              label="Inspection interval (months)"
              type="number"
              value={asset.hvac?.filter?.inspectionIntervalMonths?.toString() ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                updateFilter(
                  "inspectionIntervalMonths",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className={disabledFieldClass}
            />
            <Input
              label="Replacement interval (months)"
              type="number"
              value={
                asset.hvac?.filter?.replacementIntervalMonths?.toString() ?? ""
              }
              disabled={readOnly}
              onChange={(e) =>
                updateFilter(
                  "replacementIntervalMonths",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className={disabledFieldClass}
            />
          </div>
        </div>
      )}

      {showNeedsInfoBadge && (
        <NeedsInfoBadge flags={assetNeedsInfo(asset)} />
      )}
    </div>
  );
}
