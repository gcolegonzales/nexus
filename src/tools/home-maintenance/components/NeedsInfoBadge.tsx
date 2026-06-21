import { Badge } from "@nexus/ui";

interface NeedsInfoBadgeProps {
  flags: string[];
}

export function NeedsInfoBadge({ flags }: NeedsInfoBadgeProps) {
  if (flags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((flag) => (
        <Badge key={flag} variant="amber">
          {flag}
        </Badge>
      ))}
    </div>
  );
}
