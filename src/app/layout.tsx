import type { Metadata } from "next";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "Memecoin Community Platform",
  description: "Discover, vote for, and evaluate memecoin communities. See trust scores, community sentiment, and participate in governance.",
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
