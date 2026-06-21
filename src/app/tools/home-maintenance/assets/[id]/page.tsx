"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  createEmptyAsset,
  useHomeMaintenance,
} from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { ToolSection } from "@/tools/home-maintenance/components/ToolSection";
import { useSavedHint } from "@/shared/hooks/useSavedHint";
import { AssetForm } from "@/tools/home-maintenance/components/AssetForm";
import type { Asset } from "@/tools/home-maintenance/types/asset";
import { Button, FormActions } from "@nexus/next";
import { Badge, Card, StaggerItem } from "@nexus/ui";

export default function AssetEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { activeHome, activeAssets, upsertAsset, deleteAsset } =
    useHomeMaintenance();
  const isNew = params.id === "new";

  const [asset, setAsset] = useState<Asset | null>(null);
  const { saved, showSaved } = useSavedHint();

  useEffect(() => {
    if (isNew) {
      setAsset(createEmptyAsset(activeHome.id));
      return;
    }

    const existing = activeAssets.find((item) => item.id === params.id);
    setAsset(existing ?? null);
  }, [activeAssets, activeHome.id, isNew, params.id]);

  if (!asset) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-muted">
        Asset not found.
      </div>
    );
  }

  async function handleSave() {
    if (!asset) return;
    await upsertAsset({ ...asset, homeId: activeHome.id });
    showSaved();
    if (isNew) {
      router.replace(`/tools/home-maintenance/assets/${asset.id}`);
    }
  }

  async function handleDelete() {
    if (!asset) return;
    const confirmed = window.confirm("Delete this asset and its linked tasks?");
    if (!confirmed) return;
    await deleteAsset(asset.id);
    router.push("/tools/home-maintenance/assets");
  }

  return (
    <ToolSection
      title={isNew ? "Add asset" : "Edit asset"}
      description={`Brand and model help generate better maintenance tasks for ${activeHome.name}.`}
      action={saved ? <Badge variant="mint">Saved</Badge> : null}
      maxWidth="2xl"
    >
      <StaggerItem>
        <Card>
          <AssetForm asset={asset} onChange={setAsset} />
        </Card>
      </StaggerItem>

      <StaggerItem>
        <FormActions
        className="mt-6"
        saveLabel="Save Asset"
        cancelHref="/tools/home-maintenance/assets"
        onSave={() => void handleSave()}
        left={
          !isNew ? (
            <Button variant="danger" onClick={() => void handleDelete()}>
              Delete
            </Button>
          ) : undefined
        }
        />
      </StaggerItem>
    </ToolSection>
  );
}
