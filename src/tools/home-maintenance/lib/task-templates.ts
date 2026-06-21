export function isHvacFilterInspectionTask(templateKey: string): boolean {
  return templateKey === "hvac-filter-inspection";
}

export function isHvacFilterReplacementTask(templateKey: string): boolean {
  return templateKey === "hvac-filter-replacement";
}

export function isHvacFilterTask(templateKey: string): boolean {
  return (
    isHvacFilterInspectionTask(templateKey) ||
    isHvacFilterReplacementTask(templateKey)
  );
}

export const HVAC_FILTER_CONDITION_LABELS = {
  clean: "Clean",
  "moderate-dust": "Moderate Dust",
  "replace-needed": "Replace Needed",
} as const;
