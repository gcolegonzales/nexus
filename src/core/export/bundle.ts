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
import { downloadBlob } from "@/shared/download/downloadBlob";

export const EXPORT_VERSION = 2;

export interface NexusExportBundleV2 {
  version: typeof EXPORT_VERSION;
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

export type NexusExportBundle = NexusExportBundleV2;

export function isNexusExportBundle(data: unknown): data is NexusExportBundleV1 | NexusExportBundleV2 {
  if (!data || typeof data !== "object") return false;
  const bundle = data as Partial<NexusExportBundleV1 | NexusExportBundleV2>;
  if (bundle.version !== 1 && bundle.version !== 2) return false;
  return typeof bundle.tools === "object" && bundle.tools !== null;
}

export async function buildExportBundle(): Promise<NexusExportBundle> {
  const [profile, homeMaintenance, roomCoat] = await Promise.all([
    loadProfile(),
    loadHomeMaintenance(),
    loadRoomCoat(),
  ]);

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    tools: {
      "home-maintenance": homeMaintenance,
      "room-coat": roomCoat,
    },
  };
}

export async function importExportBundle(
  bundle: NexusExportBundleV1 | NexusExportBundleV2,
): Promise<void> {
  const version = bundle.version;
  if (version !== 1 && version !== EXPORT_VERSION) {
    throw new Error(`Unsupported export version: ${version}`);
  }

  await saveProfile({ ...getDefaultProfile(), ...bundle.profile });
  await saveHomeMaintenance(
    importHomeMaintenanceSlice(bundle.tools["home-maintenance"]),
  );

  const roomCoatSlice =
    version === EXPORT_VERSION && "room-coat" in bundle.tools
      ? bundle.tools["room-coat"]
      : undefined;

  await saveRoomCoat(importRoomCoatSlice(roomCoatSlice));
}

export function downloadJsonBundle(bundle: NexusExportBundle): void {
  downloadBlob(
    JSON.stringify(bundle, null, 2),
    `nexus-export-${bundle.exportedAt.slice(0, 10)}.json`,
    "application/json",
  );
}
