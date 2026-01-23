import type { Metadata } from "next";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "Memocracy - AI-Powered Memecoin Intelligence",
  description: "AI-powered analysis, community governance, and transparent funding for memecoin communities. Built for builders, trusted by holders.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
