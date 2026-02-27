import { cn } from "@/lib/utils";
import { Wifi, Building2, MapPin } from "lucide-react";

interface WorkModeBadgeProps {
  mode: "Remote" | "Hybrid" | "On-site" | null;
}

export function WorkModeBadge({ mode }: WorkModeBadgeProps) {
  if (!mode) return <span className="text-muted-foreground text-xs">—</span>;

  const config = {
    Remote: { icon: Wifi, className: "text-primary bg-primary/10 border-primary/20" },
    Hybrid: { icon: Building2, className: "text-accent-foreground bg-accent border-accent-foreground/20" },
    "On-site": { icon: MapPin, className: "text-secondary-foreground bg-secondary border-border" },
  };

  const { icon: Icon, className } = config[mode];

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border", className)}>
      <Icon className="h-3 w-3" />
      {mode}
    </span>
  );
}
