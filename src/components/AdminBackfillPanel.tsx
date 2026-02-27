import { useState } from "react";
import { RefreshCw, Database, MapPin, Shield, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";

interface BackfillResult {
  message: string;
  enriched?: number;
  failed?: number;
  matched?: number;
  computed?: number;
  total?: number;
}

export function AdminBackfillPanel() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState("20");
  const [daysBack, setDaysBack] = useState("7");
  const [forceReenrich, setForceReenrich] = useState(false);
  const [commuteOrigin, setCommuteOrigin] = useState("Amsterdam");
  const [commuteMode, setCommuteMode] = useState("transit");
  const [stats, setStats] = useState<any>(null);
  const [lastResult, setLastResult] = useState<BackfillResult | null>(null);

  if (adminLoading) return null;
  if (!isAdmin) return null;

  const runAction = async (action: string, extraBody: any = {}) => {
    setIsRunning(action);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-jobs", {
        body: {
          action,
          batchSize: parseInt(batchSize),
          daysBack: daysBack === "all" ? undefined : parseInt(daysBack),
          forceReenrich,
          ...extraBody,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLastResult(data);
      toast({ title: "Backfill Complete", description: data.message });
    } catch (e) {
      toast({ title: "Backfill Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsRunning(null);
    }
  };

  const fetchStats = async () => {
    setIsRunning("status");
    try {
      const { data, error } = await supabase.functions.invoke("backfill-jobs", {
        body: { action: "status" },
      });
      if (error) throw error;
      setStats(data);
    } catch (e) {
      toast({ title: "Error", description: "Failed to fetch stats", variant: "destructive" });
    } finally {
      setIsRunning(null);
    }
  };

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Admin: Enrichment Backfill
        </CardTitle>
        <CardDescription className="text-xs">
          Run enrichment, IND matching, and commute backfill on cached jobs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Config */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Batch Size</Label>
            <Select value={batchSize} onValueChange={setBatchSize}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 jobs</SelectItem>
                <SelectItem value="20">20 jobs</SelectItem>
                <SelectItem value="50">50 jobs</SelectItem>
                <SelectItem value="100">100 jobs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Date Range</Label>
            <Select value={daysBack} onValueChange={setDaysBack}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={forceReenrich} onCheckedChange={setForceReenrich} />
          <Label className="text-xs">Force re-enrich (overwrite existing)</Label>
        </div>

        {/* Stats */}
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={isRunning === "status"} className="w-full text-xs h-8">
          {isRunning === "status" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Refresh Stats
        </Button>

        {stats && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="px-2 py-1 rounded bg-muted">Total: <span className="font-mono font-bold">{stats.total}</span></div>
            <div className="px-2 py-1 rounded bg-muted">Enriched: <span className="font-mono font-bold text-primary">{stats.enriched}</span></div>
            <div className="px-2 py-1 rounded bg-muted">Pending: <span className="font-mono font-bold text-muted-foreground">{stats.pending}</span></div>
            <div className="px-2 py-1 rounded bg-muted">IND Matched: <span className="font-mono font-bold">{stats.ind_matched}</span></div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button size="sm" onClick={() => runAction("enrich")} disabled={!!isRunning} className="w-full text-xs h-8 gap-1.5">
            {isRunning === "enrich" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
            Run AI Enrichment
          </Button>
          <Button size="sm" variant="outline" onClick={() => runAction("ind-match")} disabled={!!isRunning} className="w-full text-xs h-8 gap-1.5">
            {isRunning === "ind-match" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
            Run IND Sponsor Match
          </Button>

          <div className="flex gap-2">
            <Input
              value={commuteOrigin}
              onChange={(e) => setCommuteOrigin(e.target.value)}
              placeholder="Origin city"
              className="h-8 text-xs flex-1"
            />
            <Select value={commuteMode} onValueChange={setCommuteMode}>
              <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="transit">Transit</SelectItem>
                <SelectItem value="driving">Driving</SelectItem>
                <SelectItem value="bicycling">Bike</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" onClick={() => runAction("commute", { origin: commuteOrigin, mode: commuteMode })} disabled={!!isRunning} className="w-full text-xs h-8 gap-1.5">
            {isRunning === "commute" ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
            Run Commute Backfill
          </Button>
        </div>

        {/* Result */}
        {lastResult && (
          <div className="flex items-start gap-2 p-2 rounded bg-muted text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>{lastResult.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
