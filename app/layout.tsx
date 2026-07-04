import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Global Standard Capital",
  description: "Premium fintech website and investor portal prototype for long-term diversified private capital tracking."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
