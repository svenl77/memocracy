"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-cyan-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent">
                Memocracy
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                AI-Powered Memecoin Intelligence
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/") && pathname === "/"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Home
            </Link>
            <Link
              href="/coins"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/coins")
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Communities
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <span>Get Started</span>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive("/") && pathname === "/"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Home
              </Link>
              <Link
                href="/coins"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive("/coins")
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Communities
              </Link>
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600"
              >
                Get Started
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
