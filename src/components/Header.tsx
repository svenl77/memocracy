"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
              <span className="text-2xl">🪙</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Memecoin Community Platform
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Discover & evaluate trusted memecoins
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-2">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === "/"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Communities
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-all flex items-center gap-2"
            >
              <span>➕</span>
              <span className="hidden sm:inline">Add Coin</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
