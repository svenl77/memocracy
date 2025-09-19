import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solana Vote",
  description: "Community wallet vote system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Solana Community Vote
              </h1>
              <p className="text-gray-600 text-lg mb-6">
                Token-gated decentralized governance for communities
              </p>
              <nav className="flex justify-center space-x-8">
                <a href="/" className="px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold">
                  🏠 Token Communities
                </a>
                <a href="/admin" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold">
                  ➕ Create Poll
                </a>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
