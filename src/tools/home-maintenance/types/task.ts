export interface BuyLink {
  label: string;
  url: string;
}

export interface Part {
  name: string;
  partNumber?: string;
  type?: string;
  buyLinks?: BuyLink[];
}

export interface Task {
  id: string;
  homeId: string;
  templateKey: string;
  assetId: string;
  title: string;
  intervalMonths: number;
  startOffsetDays: number;
  instructions: string;
  parts: Part[];
  links: BuyLink[];
  calendarEventId?: string;
  microsoftCalendarEventId?: string;
  enabled: boolean;
}

export interface TaskTemplate {
  templateKey: string;
  assetCategory: import("./asset").AssetCategory;
  title: string;
  intervalMonths: number;
  startOffsetDays: number;
  buildInstructions: (ctx: TaskBuildContext) => string;
  buildParts: (ctx: TaskBuildContext) => Part[];
  buildLinks: (ctx: TaskBuildContext) => BuyLink[];
  isEnabled?: (ctx: TaskBuildContext) => boolean;
}

export interface TaskBuildContext {
  home: import("./home").Home;
  asset: import("./asset").Asset;
  assets: import("./asset").Asset[];
  hvacFilterSize?: string;
  hvacFilter?: import("./asset").HvacFilterInfo;
}
