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
import { EditIcon } from "@nexus/ui";
import { IconActionButton } from "@nexus/ui";
import { FormActions } from "@nexus/next";
import { AccordionCaret } from "@nexus/ui";
import { Collapsible } from "@nexus/ui";
import { Badge } from "@nexus/ui";
import { Card } from "@nexus/ui";
import {
  accordionCardClassName,
  accordionCardTransitionClassName,
  accordionHeaderClassName,
  accordionPanelClassName,
} from "@/tools/home-maintenance/components/accordion-styles";

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
    <Card
      padding={false}
      className={`${accordionCardTransitionClassName} ${accordionCardClassName(open)}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleHeaderClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleHeaderClick();
          }
        }}
        className={accordionHeaderClassName(open)}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-text">
              {getAssetCardTitle(summaryAsset)}
            </h3>
            {summaryAsset.model && (
              <Badge variant="mint">{summaryAsset.model}</Badge>
            )}
          </div>
          <NeedsInfoBadge flags={assetNeedsInfo(summaryAsset)} />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!editing && (
            <IconActionButton
              label={`Edit ${getAssetLabel(summaryAsset)}`}
              onClick={handleEditClick}
            >
              <EditIcon />
            </IconActionButton>
          )}
          <AccordionCaret open={open} />
        </div>
      </div>

      <Collapsible open={open} id={panelId} innerClassName={accordionPanelClassName}>
        <div onClick={(event) => event.stopPropagation()}>
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
        </div>
      </Collapsible>
    </Card>
  );
}
