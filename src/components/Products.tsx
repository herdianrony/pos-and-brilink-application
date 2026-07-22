"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui";
import { useSettings } from "@/lib/use-settings";
import ProductsTab from "@/components/products/ProductsTab";
import CategoriesTab from "@/components/products/CategoriesTab";
import BLServicesTab from "@/components/products/BLServicesTab";
import BLCategoriesTab from "@/components/products/BLCategoriesTab";

export default function Products() {
  const [tab, setTab] = useState("products");
  const { settings } = useSettings();
  const servicesLabel = settings.services_label || "Layanan Agen";

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Manajemen Data</h2>
        <p className="text-sm text-slate-400">Kelola produk, kategori, dan {servicesLabel.toLowerCase()}</p>
      </div>
      <Tabs
        tabs={[
          { id: "products", label: "Produk", icon: "package" },
          { id: "categories", label: "Kategori Produk", icon: "tag" },
          { id: "bl_services", label: servicesLabel, icon: "landmark" },
          { id: "bl_categories", label: "Kategori Layanan", icon: "folder-open" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "bl_services" && <BLServicesTab />}
      {tab === "bl_categories" && <BLCategoriesTab />}
    </div>
  );
}
