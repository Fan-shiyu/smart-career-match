import { useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle, Loader2 } from "lucide-react";
import { CandidateProfile } from "@/types/job";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CVUploadProps {
  profile: CandidateProfile | null;
  onProfileChange: (profile: CandidateProfile | null) => void;
}

export function CVUpload({ profile, onProfileChange }: CVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    try {
      // Read file as text (for PDF we send base64)
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

      toast({
        title: "CV Processed",
        description: `Extracted ${p.hard_skills?.length || 0} skills from your CV`,
      });
    } catch (e) {
      console.error("CV extraction error:", e);
      toast({
        title: "CV Processing Failed",
        description: e instanceof Error ? e.message : "Could not process your CV",
        variant: "destructive",
      });
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
      <div className="border border-border rounded-lg bg-card p-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">Analyzing {fileName}...</span>
        </div>
      </div>
    );
  }

  if (profile) {
    return (
      <div className="border border-border rounded-lg bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-score-high" />
            <span className="text-xs font-medium text-foreground">{fileName}</span>
          </div>
          <button onClick={() => { onProfileChange(null); setFileName(null); }} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">Skills: </span>
            <span className="text-foreground">{profile.hard_skills.join(", ")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tools: </span>
            <span className="text-foreground">{profile.software_tools.join(", ")}</span>
          </div>
          <div className="flex gap-4">
            <span><span className="text-muted-foreground">Exp: </span><span className="text-foreground">{profile.years_experience} yrs</span></span>
            <span><span className="text-muted-foreground">Level: </span><span className="text-foreground">{profile.seniority}</span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
    >
      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Drop CV here or click to upload</p>
      <p className="text-xs text-muted-foreground/60 mt-0.5">PDF, DOCX, or TXT</p>
    </div>
  );
}
