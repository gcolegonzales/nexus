import type { HubProfile } from "@/core/profile/types";
import { getItem, setItem } from "@/core/storage/db";
import { STORAGE_KEYS } from "@/core/storage/keys";

export function getDefaultProfile(): HubProfile {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    homeSetupDate: new Date().toISOString().slice(0, 10),
  };
}

export async function loadProfile(): Promise<HubProfile> {
  const stored = await getItem<HubProfile>(STORAGE_KEYS.profile);
  return { ...getDefaultProfile(), ...stored };
}

export async function saveProfile(profile: HubProfile): Promise<void> {
  await setItem(STORAGE_KEYS.profile, profile);
}
