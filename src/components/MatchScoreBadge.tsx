import { cn } from "@/lib/utils";

interface MatchScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function MatchScoreBadge({ score, size = "md" }: MatchScoreBadgeProps) {
  const level = score >= 75 ? "high" : score >= 50 ? "medium" : "low";

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center font-mono font-semibold rounded-md border",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1",
        level === "high" && "gradient-score-high text-score-high",
        level === "medium" && "gradient-score-medium text-score-medium",
        level === "low" && "gradient-score-low text-score-low"
      )}
    >
      {score}%
    </div>
  );
}
