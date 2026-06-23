export type DimensionEditTarget =
  | { kind: "room"; placementId: string }
  | { kind: "furnishing"; furnishingId: string };
