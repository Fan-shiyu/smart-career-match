import { useState } from "react";
import { Search, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
    <aside className="w-72 shrink-0 bg-sidebar border-r border-sidebar-border h-screen overflow-y-auto scrollbar-thin p-4 flex flex-col">
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
          <Select value={filters.country} onValueChange={(v) => update({ country: v })}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Netherlands">Netherlands</SelectItem>
              <SelectItem value="Germany">Germany</SelectItem>
              <SelectItem value="Belgium">Belgium</SelectItem>
              <SelectItem value="United Kingdom">United Kingdom</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="City" value={filters.city} onChange={(e) => update({ city: e.target.value })} className="h-8 text-xs bg-sidebar-accent border-sidebar-border" />
          <Select value={String(filters.radius)} onValueChange={(v) => update({ radius: Number(v) })}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
              <SelectValue placeholder="Radius" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 km</SelectItem>
              <SelectItem value="25">25 km</SelectItem>
              <SelectItem value="50">50 km</SelectItem>
            </SelectContent>
          </Select>
        </FilterGroup>

        <FilterGroup title="Job Type">
          <Select value={filters.workMode} onValueChange={(v) => update({ workMode: v })}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
              <SelectValue placeholder="Work mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="On-site">On-site</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
              <SelectItem value="Remote">Remote</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.employmentType} onValueChange={(v) => update({ employmentType: v })}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
              <SelectValue placeholder="Employment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Full-time">Full-time</SelectItem>
              <SelectItem value="Part-time">Part-time</SelectItem>
              <SelectItem value="Contract">Contract</SelectItem>
              <SelectItem value="Intern">Intern</SelectItem>
            </SelectContent>
          </Select>
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
          <Select value={filters.seniorityLevel} onValueChange={(v) => update({ seniorityLevel: v })}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
              <SelectValue placeholder="Seniority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="Junior">Junior</SelectItem>
              <SelectItem value="Mid">Mid</SelectItem>
              <SelectItem value="Senior">Senior</SelectItem>
              <SelectItem value="Lead">Lead</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
            </SelectContent>
          </Select>
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
  workMode: "all",
  employmentType: "all",
  postedWithin: "all",
  yearsExperience: 0,
  seniorityLevel: "all",
  languages: [],
  visaRequired: false,
  indSponsorOnly: false,
  minSalary: 0,
  commuteOrigin: "",
  maxCommuteTime: 60,
  commuteMode: "transit",
  matchThreshold: 50,
  strictMode: false,
};
