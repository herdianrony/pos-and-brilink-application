"use client";

import { Badge, EmptyState } from "@/components/ui";
import { DynamicIcon } from "@/components/DynamicIcon";
import { BankIcon, isBankIcon } from "@/components/BankIcon";
import { cn, formatRupiah } from "@/lib/utils";
import { Layers, Star } from "lucide-react";
import type { AgentService as Service } from "@/types/models";

interface Props {
  grouped: Record<string, Service[]>;
  selectedServiceId?: number;
  favorites: number[];
  onSelect: (service: Service) => void;
  onToggleFavorite: (serviceId: number) => void;
}

export default function ServiceGrid({ grouped, selectedServiceId, favorites, onSelect, onToggleFavorite }: Props) {
  if (Object.keys(grouped).length === 0) {
    return <EmptyState icon="search" title="Layanan tidak ditemukan" />;
  }

  return (
    <>
      {Object.entries(grouped).map(([category, services]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">{category}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {services.map((service) => {
              const isFavorite = favorites.includes(service.id);
              return (
                <div key={service.id} className="relative group">
                  <button
                    onClick={() => onSelect(service)}
                    className={cn(
                      "w-full p-4 rounded-2xl text-left transition-all duration-200 border-2 group hover:shadow-pop flex flex-col items-center text-center gap-2",
                      selectedServiceId === service.id ? "bg-purple-50 border-purple-400 shadow-card" : "bg-white border-transparent hover:border-slate-200"
                    )}
                  >
                    {isBankIcon(service.icon) ? (
                      <BankIcon name={service.icon} size={36} className="group-hover:scale-110 transition-transform" />
                    ) : (
                      <DynamicIcon name={service.icon} fallback="credit-card" size={32} className="text-primary group-hover:scale-110 transition-transform" />
                    )}
                    <p className="font-semibold text-sm text-slate-800 leading-tight">{service.name}</p>
                    {service.useTieredFee ? (
                      <Badge variant="purple"><Layers size={10} className="mr-0.5" /> Berjenjang</Badge>
                    ) : (
                      parseFloat(service.adminFee) > 0 && <Badge variant="warning">Fee: {formatRupiah(service.adminFee)}</Badge>
                    )}
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(service.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    title={isFavorite ? "Hapus dari favorit" : "Tambah ke favorit"}
                  >
                    <Star size={14} className={cn(isFavorite ? "text-amber-400 fill-amber-400" : "text-slate-300")} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
