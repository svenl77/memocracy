"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { ArrowRight, Brain, Shield, Users, TrendingUp, Zap, CheckCircle2, BarChart3, Wallet, Vote, Sparkles, Code, Globe, Copy, ExternalLink, Copy as CopyIcon, Check } from "lucide-react";

export default function HomePage() {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText('Coming Soon');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        
        <div className="relative container mx-auto px-4 py-24 sm:py-32 lg:py-40">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">AI-Powered Memecoin Intelligence</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              The Future of
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Memecoin Communities
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              AI-powered analysis, community governance, and transparent funding.
              <br />
              <span className="text-blue-400 font-semibold">Built for builders. Trusted by holders.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href="/coins"
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold text-lg shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                Explore Communities
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/admin"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Get Started
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8 border-t border-white/10">
              <div>
                <div className="text-3xl font-bold text-white mb-1">AI</div>
                <div className="text-sm text-slate-400">Powered Analysis</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">100%</div>
                <div className="text-sm text-slate-400">Transparent</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">∞</div>
                <div className="text-sm text-slate-400">Community Driven</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Build
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                Trusted Communities
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced AI analysis, transparent governance, and community funding all in one platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: AI Analysis */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI-Powered Analysis</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Advanced machine learning algorithms analyze trust scores, security, liquidity, and community sentiment in real-time.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Real-time trust scoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Security risk detection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Market sentiment analysis</span>
                </li>
              </ul>
            </div>

            {/* Feature 2: Community Governance */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-purple-50/30">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Vote className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Token-Gated Governance</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Only token holders can create polls and vote. True decentralized governance for your community.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Holder-only voting</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Transparent results</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Real-time participation</span>
                </li>
              </ul>
            </div>

            {/* Feature 3: Founding Wallets */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-cyan-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-cyan-50/30">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Founding Wallets</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Transparent funding for builders. Track contributions, monitor progress, and build reputation.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Real-time tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Builder reputation system</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Community ratings</span>
                </li>
              </ul>
            </div>

            {/* Feature 4: Trust Scores */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-green-50/30">
              <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Trust Scores</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Comprehensive scoring system evaluating security, liquidity, maturity, and community health.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Multi-factor analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Real-time updates</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Transparent methodology</span>
                </li>
              </ul>
            </div>

            {/* Feature 5: Analytics */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-orange-50/30">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Advanced Analytics</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Deep insights into community activity, voting patterns, and engagement metrics.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Community metrics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Voting analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Trend analysis</span>
                </li>
              </ul>
            </div>

            {/* Feature 6: Community Building */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-indigo-50/30">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Community Building</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Tools to engage your community, build trust, and grow your memecoin ecosystem.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Engagement tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Social features</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to build a trusted, engaged community.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  1
                </div>
                <div className="p-8 bg-white rounded-2xl border border-gray-200 shadow-lg h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center mb-6">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Add Your Coin</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Create your community page and get instant AI-powered analysis. Free for everyone, no restrictions.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  2
                </div>
                <div className="p-8 bg-white rounded-2xl border border-gray-200 shadow-lg h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mb-6">
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Engage Your Community</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Create polls, let holders vote, and build governance. Only token holders can participate.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  3
                </div>
                <div className="p-8 bg-white rounded-2xl border border-gray-200 shadow-lg h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl flex items-center justify-center mb-6">
                    <Wallet className="w-8 h-8 text-cyan-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Fund & Build</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Create founding wallets for projects. Builders get funded, holders rate builders, wallets build reputation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrate Everywhere Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Use on Your Site
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                Works Everywhere
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Integrate your community widget on any website. Give your holders a voice, no matter where they are.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {/* Platform Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* WordPress */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">WordPress</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Add a "Custom HTML" block, paste the code, done.
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                  <Code className="w-4 h-4" />
                  <span>Copy & Paste</span>
                </div>
              </div>

              {/* Wix */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Wix</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Add "HTML Code" element, paste the code, done.
                </p>
                <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                  <Code className="w-4 h-4" />
                  <span>Copy & Paste</span>
                </div>
              </div>

              {/* Any HTML Site */}
              <div className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-200 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Any HTML Site</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Works on any website. Just paste the iframe code.
                </p>
                <div className="flex items-center gap-2 text-sm text-cyan-600 font-medium">
                  <Code className="w-4 h-4" />
                  <span>Universal</span>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                How to Integrate
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Get Your Embed Code</h4>
                  <p className="text-sm text-gray-600">
                    Go to your coin page and click "Embed Widget" to get your unique code.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Copy the Code</h4>
                  <p className="text-sm text-gray-600">
                    Copy the iframe code with one click. No technical knowledge needed.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Paste & Done</h4>
                  <p className="text-sm text-gray-600">
                    Paste into your website. Your holders can now vote and engage directly.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 text-center">
              <p className="text-lg text-gray-700 mb-6">
                <span className="font-semibold text-gray-900">Give your holders a voice.</span> Integrate community governance on your website.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/coins"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Get Embed Code
                </Link>
                <Link
                  href="/admin"
                  className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Globe className="w-5 h-5" />
                  View Examples
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Memocracy Coin Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-cyan-600 to-purple-600 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/50 via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Badge */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-6">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Official Token</span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
                Memocracy Coin
              </h2>
              <p className="text-xl sm:text-2xl text-white/90 max-w-2xl mx-auto">
                The governance token powering the future of memecoin communities
              </p>
            </div>

            {/* Coin Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl p-8 sm:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Left: Coin Info */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-white to-blue-100 rounded-2xl flex items-center justify-center shadow-lg">
                      <Brain className="w-10 h-10 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-1">MEMOCRACY</h3>
                      <p className="text-white/80 text-lg">MEMO</p>
                    </div>
                  </div>

                  <p className="text-white/90 mb-6 leading-relaxed">
                    Memocracy Coin holders govern the platform's development. Vote on features, 
                    fund projects, and shape the future of memecoin communities.
                  </p>

                  {/* Contract Address */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-white/90 mb-2">
                      Contract Address
                    </label>
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <code className="flex-1 text-white font-mono text-sm break-all">
                        Coming Soon
                      </code>
                      <button
                        onClick={handleCopyAddress}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Copy address"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <CopyIcon className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-white/70 mt-2">
                      Contract address will be available at launch
                    </p>
                  </div>

                  {/* Social Links */}
                  <div className="flex flex-wrap gap-4">
                    <a
                      href="https://t.me/memocracycoin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      <span>Telegram</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <a
                      href="https://x.com/memocracycoin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span>X (Twitter)</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Right: Features */}
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <h4 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                      <Vote className="w-5 h-5" />
                      Governance Rights
                    </h4>
                    <p className="text-white/90 text-sm">
                      Vote on platform features, roadmap decisions, and community proposals. Your voice matters.
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <h4 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Founding Wallet Access
                    </h4>
                    <p className="text-white/90 text-sm">
                      Create and fund projects through founding wallets. Builders get funded, holders rate builders.
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <h4 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Platform Benefits
                    </h4>
                    <p className="text-white/90 text-sm">
                      Exclusive access to premium features, early access to new tools, and priority support.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 pt-8 border-t border-white/20 text-center">
                <p className="text-white/90 mb-4 text-lg">
                  Join the Memocracy community and help shape the future of memecoin governance
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="https://t.me/memocracycoin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    Join Telegram
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <a
                    href="https://x.com/memocracycoin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    Follow on X
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to Build Your Community?
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Join the future of memecoin communities. AI-powered, transparent, and community-driven.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/coins"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold text-lg shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 hover:scale-105"
              >
                Explore Communities
              </Link>
              <Link
                href="/admin"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Memocracy</h3>
              <p className="text-sm text-gray-400">
                AI-powered platform for memecoin communities. Built for builders, trusted by holders.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/coins" className="hover:text-white transition-colors">Communities</Link></li>
                <li><Link href="/admin" className="hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-400">AI Analysis</span></li>
                <li><span className="text-gray-400">Community Governance</span></li>
                <li><span className="text-gray-400">Founding Wallets</span></li>
                <li><span className="text-gray-400">Trust Scores</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Memocracy Coin</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-400">Contract: Coming Soon</span></li>
                <li><span className="text-gray-400">Email: coin@memocracy.io</span></li>
                <li><span className="text-gray-400">Telegram: @memocracycoin</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Memocracy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
