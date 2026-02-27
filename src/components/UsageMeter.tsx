import { useUsage } from "@/hooks/useUsage";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function UsageMeter() {
  const { usage, limits } = useUsage();
  const navigate = useNavigate();

  const isUnlimited = limits.searchesPerDay === -1;
  const pct = isUnlimited ? 0 : Math.min((usage.searchesToday / limits.searchesPerDay) * 100, 100);
  const atLimit = !isUnlimited && usage.searchesToday >= limits.searchesPerDay;

  return (
    <button
      onClick={() => navigate("/pricing")}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors",
        atLimit
          ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
          : "border-border bg-card hover:bg-muted/50 text-foreground"
      )}
    >
      <Zap className={cn("h-3.5 w-3.5", atLimit ? "text-destructive" : "text-primary")} />
      <div className="flex flex-col items-start">
        <span className="font-medium">
          {isUnlimited ? "Unlimited" : `${usage.searchesToday}/${limits.searchesPerDay}`}
          {" "}searches
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", atLimit ? "bg-destructive" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {limits.plan === "free" && (
        <span className="text-primary font-semibold ml-1">Upgrade</span>
      )}
    </button>
  );
}
