import { cn } from "@/lib/utils";
import { Shield, ShieldAlert, ShieldX } from "lucide-react";

interface VisaBadgeProps {
  likelihood: "High" | "Medium" | "Low" | null;
}

export function VisaBadge({ likelihood }: VisaBadgeProps) {
  if (!likelihood) return <span className="text-muted-foreground text-xs">—</span>;

  const config = {
    High: { icon: Shield, className: "text-visa-high bg-visa-high/10 border-visa-high/20" },
    Medium: { icon: ShieldAlert, className: "text-visa-medium bg-visa-medium/10 border-visa-medium/20" },
    Low: { icon: ShieldX, className: "text-visa-low bg-visa-low/10 border-visa-low/20" },
  };

  const { icon: Icon, className } = config[likelihood];

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border", className)}>
      <Icon className="h-3 w-3" />
      {likelihood}
    </span>
  );
}
