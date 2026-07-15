"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import type { ServiceCategory as ServiceCat } from "@/types/models";

interface Props {
  search: string;
  catFilter: string;
  categories: ServiceCat[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export default function ServiceFilters({ search, catFilter, categories, onSearchChange, onCategoryChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari layanan..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm shadow-soft"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onCategoryChange("all")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
            catFilter === "all" ? "bg-primary text-white shadow-card" : "bg-white text-slate-600 border border-slate-200"
          )}
        >
          Semua
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id.toString())}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
              catFilter === category.id.toString() ? "bg-primary text-white shadow-card" : "bg-white text-slate-600 border border-slate-200"
            )}
          >
            <DynamicIcon name={category.icon} fallback="package" size={14} className="inline-block -mt-0.5 mr-1" />{category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
