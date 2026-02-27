import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  currentUsage?: string;
  requiredPlan?: "pro" | "premium";
}

export function PaywallModal({ open, onOpenChange, feature, currentUsage, requiredPlan = "pro" }: PaywallModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-base">Upgrade to unlock</DialogTitle>
          <DialogDescription className="text-sm">
            <span className="font-medium text-foreground">{feature}</span> is available on the{" "}
            <span className="font-semibold text-primary capitalize">{requiredPlan}</span> plan.
          </DialogDescription>
        </DialogHeader>

        {currentUsage && (
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">{currentUsage}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={() => { onOpenChange(false); navigate("/pricing"); }}
            className="w-full glow-primary font-semibold gap-2"
          >
            Upgrade to {requiredPlan === "premium" ? "Premium" : "Pro"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
