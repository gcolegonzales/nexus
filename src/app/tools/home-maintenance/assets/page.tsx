"use client";

import { useHomeMaintenance } from "@/tools/home-maintenance/HomeMaintenanceProvider";
import { AssetAccordionRow } from "@/tools/home-maintenance/components/AssetAccordionRow";
import { ToolSection } from "@/tools/home-maintenance/components/ToolSection";
import { PrimaryButton } from "@nexus/next";
import { StaggerItem } from "@nexus/ui";

export default function AssetsPage() {
  const { activeHome, activeAssets } = useHomeMaintenance();

  return (
    <ToolSection
      title="Assets"
      description={`Appliances and systems at ${activeHome.name}. Missing details are fine — fill them in when you can.`}
      action={
        <PrimaryButton href="/tools/home-maintenance/assets/new">
          Add Asset
        </PrimaryButton>
      }
    >
      <div className="grid gap-4">
        {activeAssets.map((asset) => (
          <StaggerItem key={asset.id}>
            <AssetAccordionRow asset={asset} />
          </StaggerItem>
        ))}
      </div>
    </ToolSection>
  );
}
