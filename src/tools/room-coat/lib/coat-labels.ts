export function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function defaultCoatAccordionTitle(name: string): string {
  return `Default ${toTitleCase(name)} Coat`;
}

export function paintSourceLabel(
  source: "override" | "coat" | "unit-default" | "unset",
): string {
  switch (source) {
    case "override":
      return "Override";
    case "coat":
      return "Room default";
    case "unit-default":
      return "Unit default";
    case "unset":
      return "Unset";
  }
}
