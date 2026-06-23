"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useHomeMaintenance } from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { AssetForm } from "@/tools/home-maintenance/components/AssetForm";
import {
  getAssetCardTitle,
  getAssetLabel,
} from "@/tools/home-maintenance/lib/asset-label";
import { assetNeedsInfo } from "@/tools/home-maintenance/lib/needs-info";
import { NeedsInfoBadge } from "@/tools/home-maintenance/components/NeedsInfoBadge";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import {
  AccordionCard,
  Badge,
  EditIcon,
  IconActionButton,
} from "@nexus/ui";
import { FormActions } from "@nexus/next";

interface AssetAccordionRowProps {
  asset: Asset;
}

export function AssetAccordionRow({ asset }: AssetAccordionRowProps) {
  const { activeHome, upsertAsset } = useHomeMaintenance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Asset>(asset);
  const panelId = `asset-panel-${asset.id}`;

  useEffect(() => {
    if (!editing) {
      setDraft(asset);
    }
  }, [asset, editing]);

  function handleHeaderClick() {
    if (open && editing) {
      setDraft(asset);
      setEditing(false);
      setOpen(false);
      return;
    }

    if (open) {
      setOpen(false);
      return;
    }

    setEditing(false);
    setDraft(asset);
    setOpen(true);
  }

  function handleEditClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setDraft(asset);
    setEditing(true);
    setOpen(true);
  }

  function handleCancel(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setDraft(asset);
    setEditing(false);
    setOpen(false);
  }

  async function handleSave(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    await upsertAsset({ ...draft, homeId: activeHome.id });
    setEditing(false);
  }

  const summaryAsset = editing ? asset : draft;

  return (
    <AccordionCard
      open={open}
      onHeaderClick={handleHeaderClick}
      panelId={panelId}
      header={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold leading-snug text-text">
              {getAssetCardTitle(summaryAsset)}
            </h3>
            {summaryAsset.model && (
              <Badge variant="mint">{summaryAsset.model}</Badge>
            )}
          </div>
          <NeedsInfoBadge flags={assetNeedsInfo(summaryAsset)} />
        </div>
      }
      headerActions={
        !editing ? (
          <IconActionButton
            label={`Edit ${getAssetLabel(summaryAsset)}`}
            onClick={handleEditClick}
          >
            <EditIcon />
          </IconActionButton>
        ) : null
      }
    >
      <AssetForm
        asset={draft}
        onChange={setDraft}
        readOnly={!editing}
        showNeedsInfoBadge={false}
      />

      {editing && (
        <FormActions
          onCancel={handleCancel}
          onSave={(event) => void handleSave(event)}
        />
      )}
    </AccordionCard>
  );
}
