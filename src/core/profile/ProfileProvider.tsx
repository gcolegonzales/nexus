"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { HubProfile } from "@/core/profile/types";
import {
  getDefaultProfile,
  loadProfile,
  saveProfile,
} from "@/core/profile/store";
import { ensureSchemaVersion } from "@/core/storage/db";

interface ProfileContextValue {
  profile: HubProfile;
  isReady: boolean;
  updateProfile: (patch: Partial<HubProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<HubProfile>(getDefaultProfile);
  const [isReady, setIsReady] = useState(false);

  const refreshProfile = useCallback(async () => {
    await ensureSchemaVersion();
    const loaded = await loadProfile();
    setProfile(loaded);
    setIsReady(true);
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const updateProfile = useCallback(async (patch: Partial<HubProfile>) => {
    const next = await new Promise<HubProfile>((resolve) => {
      setProfile((current) => {
        const updated = { ...current, ...patch };
        resolve(updated);
        return updated;
      });
    });
    await saveProfile(next);
  }, []);

  const value = useMemo(
    () => ({ profile, isReady, updateProfile, refreshProfile }),
    [profile, isReady, updateProfile, refreshProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useHubProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useHubProfile must be used within ProfileProvider");
  }
  return context;
}
