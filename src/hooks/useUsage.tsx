import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PlanId, getPlanConfig } from "@/lib/plans";

interface UsageData {
  searchesToday: number;
  exportsToday: number;
  cvCount: number;
}

interface PlanLimits {
  plan: PlanId;
  searchesPerDay: number;
  maxResults: number;
  maxCVs: number;
  canUseCommute: boolean;
  canUseVisa: boolean;
  canUseBreakdown: boolean;
  canSaveSearches: boolean;
  canExportFull: boolean;
}

interface UsageContextType {
  usage: UsageData;
  limits: PlanLimits;
  loading: boolean;
  refresh: () => Promise<void>;
  trackEvent: (eventType: "search" | "export" | "cv_upload") => Promise<boolean>;
  canSearch: () => boolean;
  canExport: (preset: string) => boolean;
  canUploadCV: () => boolean;
}

const defaultLimits: PlanLimits = {
  plan: "free",
  searchesPerDay: 5,
  maxResults: 10,
  maxCVs: 1,
  canUseCommute: false,
  canUseVisa: false,
  canUseBreakdown: false,
  canSaveSearches: false,
  canExportFull: false,
};

const UsageContext = createContext<UsageContextType>({
  usage: { searchesToday: 0, exportsToday: 0, cvCount: 0 },
  limits: defaultLimits,
  loading: true,
  refresh: async () => {},
  trackEvent: async () => true,
  canSearch: () => true,
  canExport: () => true,
  canUploadCV: () => true,
});

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData>({ searchesToday: 0, exportsToday: 0, cvCount: 0 });
  const [limits, setLimits] = useState<PlanLimits>(defaultLimits);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // Fetch plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const planId = (profile?.plan as PlanId) || "free";
    const config = getPlanConfig(planId);

    setLimits({
      plan: planId,
      searchesPerDay: config.searchesPerDay,
      maxResults: config.maxResults,
      maxCVs: config.maxCVs,
      canUseCommute: planId !== "free",
      canUseVisa: planId !== "free",
      canUseBreakdown: planId !== "free",
      canSaveSearches: planId !== "free",
      canExportFull: planId !== "free",
    });

    // Fetch today's usage
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: events } = await supabase
      .from("usage_events")
      .select("event_type, event_count")
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    let searchesToday = 0;
    let exportsToday = 0;
    (events || []).forEach((e: any) => {
      if (e.event_type === "search") searchesToday += e.event_count;
      if (e.event_type === "export") exportsToday += e.event_count;
    });

    // CV count
    const { count } = await supabase
      .from("cv_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    setUsage({ searchesToday, exportsToday, cvCount: count || 0 });
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const trackEvent = async (eventType: "search" | "export" | "cv_upload"): Promise<boolean> => {
    if (!user) return false;
    await supabase.from("usage_events").insert({
      user_id: user.id,
      event_type: eventType,
      event_count: 1,
    });
    await refresh();
    return true;
  };

  const canSearch = () => {
    if (limits.searchesPerDay === -1) return true;
    return usage.searchesToday < limits.searchesPerDay;
  };

  const canExport = (preset: string) => {
    if (limits.canExportFull) return true;
    return preset === "quick";
  };

  const canUploadCV = () => {
    if (limits.maxCVs === -1) return true;
    return usage.cvCount < limits.maxCVs;
  };

  return (
    <UsageContext.Provider value={{ usage, limits, loading, refresh, trackEvent, canSearch, canExport, canUploadCV }}>
      {children}
    </UsageContext.Provider>
  );
}

export const useUsage = () => useContext(UsageContext);
