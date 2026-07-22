import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import UpdateNotification from "@/components/UpdateNotification";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "POS & Agen Bisnis — Point of Sale & Layanan Agen",
  description: "Aplikasi POS dan layanan agen bisnis lengkap dengan manajemen produk, kas, dan transaksi. Cocok untuk BRILink, counter HP, agen pulsa, dan bisnis serupa.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} text-slate-900 antialiased`}>
        <ErrorBoundary>
          <ToastProvider>
            {children}
            <UpdateNotification />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
