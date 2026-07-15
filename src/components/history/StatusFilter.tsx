"use client";

const STATUS_OPTIONS = [
  { id: "all", label: "Semua Status" },
  { id: "completed", label: "Selesai" },
  { id: "pending", label: "Pending" },
  { id: "void", label: "Dibatalkan" },
  { id: "reversed", label: "Di-reverse" },
];

interface Props {
  active: string;
  onChange: (status: string) => void;
}

export default function StatusFilter({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {STATUS_OPTIONS.map((status) => (
        <button
          key={status.id}
          onClick={() => onChange(status.id)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
            active === status.id
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {status.label}
        </button>
      ))}
    </div>
  );
}
