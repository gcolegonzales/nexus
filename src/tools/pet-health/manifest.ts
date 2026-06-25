import type { ToolManifest } from "@/core/registry/types";

export const petHealthTool: ToolManifest = {
  id: "pet-health",
  name: "Pet Health",
  description:
    "Store your pet's vet records and chat with AI about their health.",
  href: "/tools/pet-health",
  status: "available",
  accent: "mint",
  requiresAI: true,
};
