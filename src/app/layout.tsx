import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InventoryOS — Smart Inventory & Order Management",
  description:
    "A modern inventory and order management system with multi-unit support, INR pricing, and real-time quotations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
