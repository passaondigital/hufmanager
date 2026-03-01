import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarFilters {
  search: string;
  status: string;
  serviceType: string;
}

interface CalendarFilterBarProps {
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  serviceTypes: string[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "Alle Status" },
  { value: "planned", label: "🟡 Geplant" },
  { value: "completed", label: "✅ Erledigt" },
  { value: "cancelled", label: "❌ Abgesagt" },
  { value: "confirmed", label: "✔️ Bestätigt" },
];

export function CalendarFilterBar({ filters, onFiltersChange, serviceTypes }: CalendarFilterBarProps) {
  const activeFilterCount = [
    filters.status !== "all" ? 1 : 0,
    filters.serviceType !== "all" ? 1 : 0,
    filters.search ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    onFiltersChange({ search: "", status: "all", serviceType: "all" });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pferd, Kunde, Ort..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 h-9"
        />
        {filters.search && (
          <button
            onClick={() => onFiltersChange({ ...filters, search: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Filter Popover for mobile, inline for desktop */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 sm:hidden">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3 space-y-3" align="end">
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.serviceType}
            onValueChange={(value) => onFiltersChange({ ...filters, serviceType: value })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Service-Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {serviceTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Filter zurücksetzen
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {/* Desktop inline filters */}
      <div className="hidden sm:flex items-center gap-2">
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="h-9 w-[140px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.serviceType}
          onValueChange={(value) => onFiltersChange({ ...filters, serviceType: value })}
        >
          <SelectTrigger className="h-9 w-[140px] text-sm">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {serviceTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" />
            Zurücksetzen
          </Button>
        )}
      </div>
    </div>
  );
}
