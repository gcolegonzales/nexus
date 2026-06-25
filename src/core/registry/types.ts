export type ToolAccent = "coral" | "mint" | "sky" | "amber";

export type ToolStatus = "available" | "coming-soon";

export interface ToolManifest {
  id: string;
  name: string;
  description: string;
  href: string;
  status: ToolStatus;
  accent: ToolAccent;
  requiresAI?: boolean;
}
