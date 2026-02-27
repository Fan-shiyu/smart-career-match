import { useState } from "react";
import { Search, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchFilters } from "@/types/job";
import { cn } from "@/lib/utils";

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
}

function FilterGroup({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-3 mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        {title}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="space-y-3 animate-slide-in">{children}</div>}
    </div>
  );
}

export function FilterSidebar({ filters, onFiltersChange, onSearch }: FilterSidebarProps) {
  const update = (partial: Partial<SearchFilters>) => onFiltersChange({ ...filters, ...partial });

  return (
    <aside className="w-72 shrink-0 bg-sidebar border-r border-sidebar-border h-screen overflow-y-auto scrollbar-thin p-5 flex flex-col shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground tracking-wide">Filters</h2>
        <button
          onClick={() => onFiltersChange(defaultFilters)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="flex-1 space-y-0">
        <FilterGroup title="Search">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Job title or keywords..."
              value={filters.keywords}
              onChange={(e) => update({ keywords: e.target.value })}
              className="pl-8 h-8 text-xs bg-sidebar-accent border-sidebar-border"
            />
          </div>
          <div className="flex items-center gap-2 h-8 px-3 rounded-md border border-sidebar-border bg-sidebar-accent text-xs text-foreground">
            🇳🇱 Netherlands
          </div>
          <Input placeholder="City" value={filters.city} onChange={(e) => update({ city: e.target.value })} className="h-8 text-xs bg-sidebar-accent border-sidebar-border" />
          <Select value={String(filters.radius)} onValueChange={(v) => update({ radius: Number(v) })}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
              <SelectValue placeholder="Radius" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 km</SelectItem>
              <SelectItem value="25">25 km</SelectItem>
              <SelectItem value="50">50 km</SelectItem>
              <SelectItem value="75">75 km</SelectItem>
              <SelectItem value="100">100 km</SelectItem>
            </SelectContent>
          </Select>
        </FilterGroup>

        <FilterGroup title="Job Type">
          <Label className="text-xs text-muted-foreground mb-1">Work Mode</Label>
          <div className="space-y-1.5">
            {["On-site", "Hybrid", "Remote"].map((mode) => (
              <div key={mode} className="flex items-center gap-2">
                <Checkbox
                  id={`wm-${mode}`}
                  checked={filters.workModes?.includes(mode) ?? false}
                  onCheckedChange={(checked) => {
                    const current = filters.workModes || [];
                    const next = checked ? [...current, mode] : current.filter((m) => m !== mode);
                    update({ workModes: next });
                  }}
                />
                <label htmlFor={`wm-${mode}`} className="text-xs text-foreground cursor-pointer">{mode}</label>
              </div>
            ))}
          </div>
          <Label className="text-xs text-muted-foreground mb-1 mt-2">Employment Type</Label>
          <div className="space-y-1.5">
            {["Full-time", "Part-time", "Contract", "Intern"].map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox
                  id={`et-${type}`}
                  checked={filters.employmentTypes?.includes(type) ?? false}
                  onCheckedChange={(checked) => {
                    const current = filters.employmentTypes || [];
                    const next = checked ? [...current, type] : current.filter((t) => t !== type);
                    update({ employmentTypes: next });
                  }}
                />
                <label htmlFor={`et-${type}`} className="text-xs text-foreground cursor-pointer">{type}</label>
              </div>
            ))}
          </div>
          <Select value={filters.postedWithin} onValueChange={(v) => update({ postedWithin: v })}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
              <SelectValue placeholder="Posted within" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any time</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </FilterGroup>

        <FilterGroup title="Candidate" defaultOpen={false}>
          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Experience</Label>
              <span className="text-xs font-mono text-foreground">{filters.yearsExperience}+ yrs</span>
            </div>
            <Slider value={[filters.yearsExperience]} onValueChange={([v]) => update({ yearsExperience: v })} min={0} max={15} step={1} className="py-1" />
          </div>
          <Label className="text-xs text-muted-foreground mb-1">Seniority Level</Label>
          <div className="space-y-1.5">
            {["Junior", "Mid", "Senior", "Lead", "Manager"].map((level) => (
              <div key={level} className="flex items-center gap-2">
                <Checkbox
                  id={`sl-${level}`}
                  checked={filters.seniorityLevels?.includes(level) ?? false}
                  onCheckedChange={(checked) => {
                    const current = filters.seniorityLevels || [];
                    const next = checked ? [...current, level] : current.filter((l) => l !== level);
                    update({ seniorityLevels: next });
                  }}
                />
                <label htmlFor={`sl-${level}`} className="text-xs text-foreground cursor-pointer">{level}</label>
              </div>
            ))}
          </div>
          <Input
            type="number"
            placeholder="Min salary (€)"
            value={filters.minSalary || ""}
            onChange={(e) => update({ minSalary: Number(e.target.value) })}
            className="h-8 text-xs bg-sidebar-accent border-sidebar-border"
          />
        </FilterGroup>

        <FilterGroup title="Visa & Sponsorship" defaultOpen={false}>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Visa required</Label>
            <Switch checked={filters.visaRequired} onCheckedChange={(v) => update({ visaRequired: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">IND sponsor only</Label>
            <Switch checked={filters.indSponsorOnly} onCheckedChange={(v) => update({ indSponsorOnly: v })} />
          </div>
        </FilterGroup>

        <FilterGroup title="Commute" defaultOpen={false}>
          <Input
            placeholder="Origin (postcode/city)"
            value={filters.commuteOrigin}
            onChange={(e) => update({ commuteOrigin: e.target.value })}
            className="h-8 text-xs bg-sidebar-accent border-sidebar-border"
          />
          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Max commute</Label>
              <span className="text-xs font-mono text-foreground">{filters.maxCommuteTime} min</span>
            </div>
            <Slider value={[filters.maxCommuteTime]} onValueChange={([v]) => update({ maxCommuteTime: v })} min={10} max={120} step={5} className="py-1" />
          </div>
          <Select value={filters.commuteMode} onValueChange={(v) => update({ commuteMode: v })}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="driving">Driving</SelectItem>
              <SelectItem value="transit">Public Transport</SelectItem>
              <SelectItem value="bicycling">Bike</SelectItem>
            </SelectContent>
          </Select>
        </FilterGroup>

        <FilterGroup title="Matching" defaultOpen={false}>
          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Min match score</Label>
              <span className="text-xs font-mono text-primary">{filters.matchThreshold}%</span>
            </div>
            <Slider value={[filters.matchThreshold]} onValueChange={([v]) => update({ matchThreshold: v })} min={0} max={95} step={5} className="py-1" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Strict mode</Label>
            <Switch checked={filters.strictMode} onCheckedChange={(v) => update({ strictMode: v })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Top N results</Label>
            <Select value={String(filters.topN)} onValueChange={(v) => update({ topN: Number(v) })}>
              <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
                <SelectItem value="100">Top 100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FilterGroup>
      </div>

      <Button onClick={onSearch} className="w-full mt-4 glow-primary font-semibold text-sm">
        <Search className="h-4 w-4 mr-2" />
        Search Jobs
      </Button>
    </aside>
  );
}

export const defaultFilters: SearchFilters = {
  keywords: "",
  country: "Netherlands",
  city: "",
  radius: 25,
  workModes: [],
  employmentTypes: [],
  postedWithin: "all",
  yearsExperience: 0,
  seniorityLevels: [],
  languages: [],
  visaRequired: false,
  indSponsorOnly: false,
  minSalary: 0,
  commuteOrigin: "",
  maxCommuteTime: 60,
  commuteMode: "transit",
  matchThreshold: 50,
  strictMode: false,
  topN: 20,
};
