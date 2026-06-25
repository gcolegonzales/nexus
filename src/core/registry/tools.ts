import type { ToolManifest } from "./types";
import { homeMaintenanceTool } from "@/tools/home-maintenance/manifest";
import { roomCoatTool } from "@/tools/room-coat/manifest";
import { petHealthTool } from "@/tools/pet-health/manifest";

export const TOOLS: ToolManifest[] = [homeMaintenanceTool, roomCoatTool, petHealthTool];

export function getAvailableTools(): ToolManifest[] {
  return TOOLS.filter((tool) => tool.status === "available");
}

export function getComingSoonTools(): ToolManifest[] {
  return TOOLS.filter((tool) => tool.status === "coming-soon");
}
