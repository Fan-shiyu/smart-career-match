import { useState, useRef, useEffect } from "react";
import { Upload, FileText, X, CheckCircle, Loader2, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { CandidateProfile } from "@/types/job";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CVUploadProps {
  profile: CandidateProfile | null;
  onProfileChange: (profile: CandidateProfile | null) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  compact?: boolean;
}

export function CVUpload({ profile, onProfileChange, collapsed: controlledCollapsed, onCollapsedChange, compact }: CVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = (v: boolean) => {
    onCollapsedChange ? onCollapsedChange(v) : setInternalCollapsed(v);
  };

  // Auto-collapse if many skills
  useEffect(() => {
    if (profile && (profile.hard_skills.length + profile.software_tools.length) > 8) {
      setCollapsed(true);
    }
  }, [profile]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fileBase64 = btoa(binary);
      const { data, error } = await supabase.functions.invoke("extract-cv", {
        body: { fileBase64, fileName: file.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const p = data.profile;
      onProfileChange({
        hard_skills: p.hard_skills || [],
        software_tools: p.software_tools || [],
        years_experience: p.years_experience || 0,
        education_level: p.education_level || "",
        languages: p.languages || [],
        seniority: p.seniority || "Mid",
      });
      toast({ title: "CV Processed", description: `Extracted ${p.hard_skills?.length || 0} skills from your CV` });
    } catch (e) {
      console.error("CV extraction error:", e);
      toast({ title: "CV Processing Failed", description: e instanceof Error ? e.message : "Could not process your CV", variant: "destructive" });
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (isProcessing) {
    return (
      <div className="border border-border rounded-lg bg-card p-2.5">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">Analyzing {fileName}...</span>
        </div>
      </div>
    );
  }

  if (profile) {
    const totalSkills = profile.hard_skills.length + profile.software_tools.length;
    const allSkills = [...profile.hard_skills, ...profile.software_tools];
    const VISIBLE_SKILLS = 6;
    const visibleSkills = showAllSkills ? allSkills : allSkills.slice(0, VISIBLE_SKILLS);
    const hasMore = allSkills.length > VISIBLE_SKILLS;

    // Collapsed compact view
    if (isCollapsed) {
      return (
        <div className="border border-border rounded-lg bg-card p-2 flex items-center gap-2 min-w-0">
          <CheckCircle className="h-3.5 w-3.5 text-score-high shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">{fileName || "CV"}</span>
          <span className="text-xs text-muted-foreground shrink-0">{totalSkills} skills</span>
          <span className="text-xs text-muted-foreground shrink-0">·</span>
          <span className="text-xs text-muted-foreground shrink-0">{profile.years_experience}y {profile.seniority}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(false); }}
            className="ml-auto text-primary hover:text-primary/80 transition-colors shrink-0"
            title="Expand CV details"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onProfileChange(null); setFileName(null); }}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    // Expanded view with skill chips
    return (
      <div className={cn("border border-border rounded-lg bg-card", compact ? "p-2" : "p-3")}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="h-3.5 w-3.5 text-score-high shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse CV details"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { onProfileChange(null); setFileName(null); }}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Skill chips with max-height scroll */}
        <div className="max-h-[120px] overflow-y-auto scrollbar-thin mb-1.5">
          <div className="flex flex-wrap gap-1">
            {visibleSkills.map((s) => (
              <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded bg-accent text-accent-foreground text-[10px] font-medium">
                {s}
              </span>
            ))}
            {hasMore && !showAllSkills && (
              <button onClick={() => setShowAllSkills(true)} className="text-[10px] text-primary hover:underline px-1">
                +{allSkills.length - VISIBLE_SKILLS} more
              </button>
            )}
            {showAllSkills && hasMore && (
              <button onClick={() => setShowAllSkills(false)} className="text-[10px] text-primary hover:underline px-1">
                Show less
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>Exp: <span className="text-foreground font-medium">{profile.years_experience}y</span></span>
          <span>Level: <span className="text-foreground font-medium">{profile.seniority}</span></span>
          {profile.education_level && <span>Edu: <span className="text-foreground font-medium">{profile.education_level}</span></span>}
        </div>
      </div>
    );
  }

  // Upload zone
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
    >
      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
      <p className="text-[10px] text-muted-foreground">Drop CV or click</p>
    </div>
  );
}
