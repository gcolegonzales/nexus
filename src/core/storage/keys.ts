export const DB_NAME = "nexus";
export const DB_VERSION = 1;
export const STORE_NAME = "kv";

export const STORAGE_KEYS = {
  profile: "hub:profile",
  homeMaintenance: "tool:home-maintenance",
  roomCoat: "tool:room-coat",
  googleAuth: "hub:google-auth",
  microsoftAuth: "hub:microsoft-auth",
  schemaVersion: "meta:schema-version",
} as const;

export const CURRENT_SCHEMA_VERSION = 1;
