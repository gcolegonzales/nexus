import type { HubProfile } from "@/core/profile/types";
import {
  getDefaultProfile,
  loadProfile,
  saveProfile,
} from "@/core/profile/store";
import {
  importHomeMaintenanceSlice,
  loadHomeMaintenance,
  saveHomeMaintenance,
} from "@/tools/home-maintenance/storage";
import type { HomeMaintenanceState } from "@/tools/home-maintenance/types/state";
import {
  importRoomCoatSlice,
  loadRoomCoat,
  saveRoomCoat,
} from "@/tools/room-coat/storage";
import type { RoomCoatState } from "@/tools/room-coat/types/state";
import {
  importPetHealthSlice,
  loadPetHealth,
  savePetHealth,
} from "@/tools/pet-health/storage";
import type { PetHealthState } from "@/tools/pet-health/types/state";
import { downloadBlob } from "@/shared/download/downloadBlob";

export const EXPORT_VERSION = 3;

export interface NexusExportBundleV3 {
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  profile: HubProfile;
  tools: {
    "home-maintenance": HomeMaintenanceState;
    "room-coat": RoomCoatState;
    "pet-health": PetHealthState;
  };
}

export interface NexusExportBundleV2 {
  version: 2;
  exportedAt: string;
  profile: HubProfile;
  tools: {
    "home-maintenance": HomeMaintenanceState;
    "room-coat": RoomCoatState;
  };
}

interface NexusExportBundleV1 {
  version: 1;
  exportedAt: string;
  profile: HubProfile;
  tools: {
    "home-maintenance": HomeMaintenanceState;
  };
}

export type NexusExportBundle = NexusExportBundleV3;

export function isNexusExportBundle(
  data: unknown,
): data is NexusExportBundleV1 | NexusExportBundleV2 | NexusExportBundleV3 {
  if (!data || typeof data !== "object") return false;
  const bundle = data as Partial<
    NexusExportBundleV1 | NexusExportBundleV2 | NexusExportBundleV3
  >;
  if (bundle.version !== 1 && bundle.version !== 2 && bundle.version !== 3)
    return false;
  return typeof bundle.tools === "object" && bundle.tools !== null;
}

export async function buildExportBundle(): Promise<NexusExportBundle> {
  const [profile, homeMaintenance, roomCoat, petHealth] = await Promise.all([
    loadProfile(),
    loadHomeMaintenance(),
    loadRoomCoat(),
    loadPetHealth(),
  ]);

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    tools: {
      "home-maintenance": homeMaintenance,
      "room-coat": roomCoat,
      "pet-health": petHealth,
    },
  };
}

export async function importExportBundle(
  bundle: NexusExportBundleV1 | NexusExportBundleV2 | NexusExportBundleV3,
): Promise<void> {
  const version = bundle.version;
  if (version !== 1 && version !== 2 && version !== EXPORT_VERSION) {
    throw new Error(`Unsupported export version: ${version}`);
  }

  await saveProfile({ ...getDefaultProfile(), ...bundle.profile });
  await saveHomeMaintenance(
    importHomeMaintenanceSlice(bundle.tools["home-maintenance"]),
  );

  const roomCoatSlice =
    (version === 2 || version === EXPORT_VERSION) && "room-coat" in bundle.tools
      ? (bundle.tools as NexusExportBundleV2["tools"] | NexusExportBundleV3["tools"])["room-coat"]
      : undefined;

  await saveRoomCoat(importRoomCoatSlice(roomCoatSlice));

  const petHealthSlice =
    version === EXPORT_VERSION && "pet-health" in bundle.tools
      ? (bundle.tools as NexusExportBundleV3["tools"])["pet-health"]
      : undefined;

  await savePetHealth(importPetHealthSlice(petHealthSlice));
}

export function downloadJsonBundle(bundle: NexusExportBundle): void {
  downloadBlob(
    JSON.stringify(bundle, null, 2),
    `nexus-export-${bundle.exportedAt.slice(0, 10)}.json`,
    "application/json",
  );
}
