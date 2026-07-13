import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import UpdateNotification from "@/components/UpdateNotification";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "POS & Agen Bisnis — Point of Sale & Layanan Agen",
  description: "Aplikasi POS dan layanan agen bisnis lengkap dengan manajemen produk, kas, dan transaksi. Cocok untuk BRILink, counter HP, agen pulsa, dan bisnis serupa.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="text-zinc-900 antialiased">
        <ToastProvider>
          {children}
          <UpdateNotification />
        </ToastProvider>
      </body>
    </html>
  );
}
