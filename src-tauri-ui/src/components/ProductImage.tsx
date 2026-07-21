import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { getProductImage, type ProductRow } from "../api";
import { cn } from "../lib/cn";

const imageCache = new Map<number, string | null>();

export function ProductImage({ product, className }: { product: ProductRow; className?: string }) {
  const [src, setSrc] = useState<string | null>(() => imageCache.get(product.id) ?? null);

  useEffect(() => {
    let active = true;
    if (!product.image_path) {
      setSrc(null);
      imageCache.set(product.id, null);
      return;
    }
    const cached = imageCache.get(product.id);
    if (cached !== undefined) {
      setSrc(cached);
      return;
    }
    getProductImage({ id: product.id })
      .then((image) => {
        if (!active) return;
        imageCache.set(product.id, image);
        setSrc(image);
      })
      .catch(() => {
        if (!active) return;
        imageCache.set(product.id, null);
        setSrc(null);
      });
    return () => { active = false; };
  }, [product.id, product.image_path]);

  if (src) {
    return <img src={src} alt={product.name} className={cn("h-14 w-14 rounded-2xl object-cover", className)} loading="lazy" />;
  }
  return (
    <span className={cn("grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700", className)}>
      <Package size={22} />
    </span>
  );
}
