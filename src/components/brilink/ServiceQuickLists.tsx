"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import { BankIcon, isBankIcon } from "@/components/BankIcon";
import { Star } from "lucide-react";
import type { AgentService as Service } from "@/types/models";

interface Props {
  favorites: Service[];
  recent: Service[];
  onSelect: (service: Service) => void;
}

function ServicePill({ service, variant, onSelect }: { service: Service; variant: "favorite" | "recent"; onSelect: (service: Service) => void }) {
  const isFavorite = variant === "favorite";
  return (
    <button
      onClick={() => onSelect(service)}
      className={
        isFavorite
          ? "shrink-0 p-3 rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 hover:shadow-card transition-all flex flex-col items-center gap-1.5 min-w-[100px]"
          : "shrink-0 p-3 rounded-2xl bg-white border-2 border-transparent hover:border-purple-300 hover:shadow-card transition-all flex flex-col items-center gap-1.5 min-w-[100px]"
      }
    >
      {isBankIcon(service.icon)
        ? <BankIcon name={service.icon} size={28} />
        : <DynamicIcon name={service.icon} fallback="credit-card" size={28} className={isFavorite ? "text-amber-500" : "text-purple-500"} />}
      <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{service.name}</span>
    </button>
  );
}

export default function ServiceQuickLists({ favorites, recent, onSelect }: Props) {
  return (
    <>
      {favorites.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
            <Star size={12} className="text-amber-400 fill-amber-400" /> Favorit
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {favorites.map((service) => <ServicePill key={service.id} service={service} variant="favorite" onSelect={onSelect} />)}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Terakhir Dipakai</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recent.map((service) => <ServicePill key={service.id} service={service} variant="recent" onSelect={onSelect} />)}
          </div>
        </div>
      )}
    </>
  );
}
