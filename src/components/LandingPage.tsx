import React from "react";
import { ArrowRight, Database, Globe, Network, Cpu, FileSpreadsheet, Sparkles, Check } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
}

export default function LandingPage({ onStart, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#faf9f5] Selection:bg-amber-100 selection:text-amber-900 font-sans leading-relaxed text-[#1a1a1a]">
      {/* Top Navbar */}
      <header id="nav-header" className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center bg-transparent border-b border-[#e6e2da]">
        <div className="flex items-center space-x-2">
          <div className="h-9 w-9 bg-neutral-900 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-amber-100" />
          </div>
          <span className="font-display font-medium text-lg leading-tight tracking-tight text-neutral-900">
            BNB<span className="text-amber-600">.AI</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            id="nav-login-btn"
            onClick={onLogin}
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 px-4 py-2 rounded-lg transition-all"
          >
            Sign In
          </button>
          <button
            id="nav-get-started-btn"
            onClick={onStart}
            className="text-sm font-medium bg-neutral-900 text-amber-50 hover:bg-neutral-800 px-5 py-2 rounded-lg transition-all shadow-sm"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero-section" className="relative py-24 md:py-32 overflow-hidden border-b border-[#e6e2da]">
        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-amber-50 border border-amber-200/60 rounded-full px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-mono font-medium text-amber-800 tracking-wide uppercase">Next-Gen Marketing Intelligence</span>
          </div>

          <h1 id="hero-title" className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 max-w-4xl mx-auto leading-[1.1] mb-8">
            AI-Powered Marketing <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 via-neutral-800 to-amber-700">Intelligence Platform</span>
          </h1>

          <p id="hero-description" className="text-base sm:text-lg md:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
            Transform SEO visibility, performance campaigns, and organic social media metrics into unified, board-ready strategic AI analytics.
          </p>

          <div id="hero-actions" className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-cta-start"
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 bg-neutral-900 text-amber-50 rounded-xl font-medium text-base hover:bg-neutral-800 transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              id="hero-cta-login"
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 border border-[#cfc9be] text-neutral-700 bg-[#fcfbf9] rounded-xl font-medium text-base hover:bg-neutral-200 hover:text-neutral-900 transition-all text-center"
            >
              Connect with Google
            </button>
          </div>
        </div>

        {/* Backdrop accents */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-amber-200/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/3 right-1/4 -translate-y-1/2 translate-x-1/2 w-80 h-80 bg-stone-300/10 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* Features Grid */}
      <section id="features-section" className="py-24 max-w-7xl mx-auto px-6 border-b border-[#e6e2da]">
        <div className="text-center mb-16">
          <p className="text-xs font-mono font-bold text-amber-700 uppercase tracking-widest mb-3">Capabilities</p>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl text-neutral-900">
            Designed for High-Growth Performance
          </h2>
          <p className="text-neutral-500 mt-4 max-w-xl mx-auto">
            Perfect for growth agencies, multi-site businesses, and dedicated marketing teams needing automated data transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* SEO AI reporting */}
          <div className="bg-[#fafbf9] border border-[#e2dec9] rounded-2xl p-8 hover:border-amber-400 transition-all group duration-300">
            <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center mb-6 border border-amber-200 group-hover:scale-110 transition-transform">
              <Globe className="h-6 w-6 text-amber-700" />
            </div>
            <h3 className="font-display font-medium text-xl text-neutral-900 mb-3">SEO Intelligence</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Track search visibility, traffic attribution, and keyword indices. Generate natural language analyses to guide content generation.
            </p>
          </div>

          {/* PPC reporting */}
          <div className="bg-[#fafbf9] border border-[#e2dec9] rounded-2xl p-8 hover:border-amber-400 transition-all group duration-300">
            <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center mb-6 border border-amber-200 group-hover:scale-110 transition-transform">
              <Database className="h-6 w-6 text-amber-700" />
            </div>
            <h3 className="font-display font-medium text-xl text-neutral-900 mb-3">Performance Marketing</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Track multi-account paid media channels, ROI quotients, CPA indexes, and budget outputs through fully consolidated AI tables.
            </p>
          </div>

          {/* Social monitoring */}
          <div className="bg-[#fafbf9] border border-[#e2dec9] rounded-2xl p-8 hover:border-amber-400 transition-all group duration-300">
            <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center mb-6 border border-amber-200 group-hover:scale-110 transition-transform">
              <Network className="h-6 w-6 text-amber-700" />
            </div>
            <h3 className="font-display font-medium text-xl text-neutral-900 mb-3">Social Media Reports</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Consolidate reach, views, and core engagement metrics across standard platforms. Standardize insights for presentation.
            </p>
          </div>
        </div>
      </section>

      {/* Integrative Previews (Bento Grid) */}
      <section id="preview-section" className="py-24 max-w-7xl mx-auto px-6 border-b border-[#e6e2da] bg-[#fdfdfb]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-mono font-bold text-amber-700 uppercase tracking-widest block mb-3">Platform Preview</span>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl text-neutral-900 leading-tight mb-6">
              Smarter Marketing. <br/>
              Consolidated in One Workspace.
            </h2>
            <p className="text-[#555] text-base leading-relaxed mb-8">
              Analyze historical benchmarks across different websites simultaneously. Choose of multi-variant presentation reports: Enterprise Strategic Advisor reports or Client-Safe presentations which suppress sensitive optimization advice.
            </p>

            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <div className="h-6 w-6 rounded-full bg-neutral-900 flex items-center justify-center mt-0.5 shrink-0">
                  <Check className="h-4.5 w-4.5 text-amber-200" />
                </div>
                <div>
                  <h4 className="font-display font-medium text-neutral-900">Custom Brand & Business Isolation</h4>
                  <p className="text-sm text-neutral-600">Register clean organizational folders representing each distinct target profile.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="h-6 w-6 rounded-full bg-neutral-900 flex items-center justify-center mt-0.5 shrink-0">
                  <Check className="h-4.5 w-4.5 text-amber-200" />
                </div>
                <div>
                  <h4 className="font-display font-medium text-neutral-900">Micro-Filtered Attribution Dates</h4>
                  <p className="text-sm text-neutral-600">Sync all reporting systems seamlessly by defining unified start and end query parameters.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="p-6 bg-white border border-[#eae6dd] rounded-2xl shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="h-2.5 w-2.5 bg-red-400 rounded-full"></div>
                  <div className="h-2.5 w-2.5 bg-amber-400 rounded-full"></div>
                  <div className="h-2.5 w-2.5 bg-green-400 rounded-full"></div>
                </div>
                <div className="text-xs text-neutral-400 font-mono">bnb-ai-workspace_live</div>
              </div>

              {/* Sample Chart Simulation banner */}
              <div className="space-y-4">
                <div className="h-10 bg-neutral-50 rounded-lg border border-[#f0ede6] flex items-center justify-between px-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-5 w-5 rounded bg-neutral-900 flex items-center justify-center"><Cpu className="h-3 w-3 text-amber-200" /></div>
                    <span className="text-xs font-medium text-neutral-700">SEO Growth Analyzer</span>
                  </div>
                  <span className="text-xs font-mono font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+28.4%</span>
                </div>

                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="h-4 w-4 text-amber-700" />
                    <span className="text-xs font-display font-semibold text-neutral-900">AI Narrative Recommendation</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-normal">
                    Keyword cluster efficiency around high-value queries improved during past months. We recommend dedicating resources to technical site index speed metrics.
                  </p>
                </div>

                {/* Mock simple table layout */}
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400">
                      <th className="py-2">Metric Channel</th>
                      <th className="py-2 text-right">Attribution volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stone-100 text-stone-700">
                      <td className="py-2 font-mono">Google Organic</td>
                      <td className="py-2 text-right font-medium text-stone-900">14,210 clicks</td>
                    </tr>
                    <tr className="border-b border-stone-100/50 text-stone-700">
                      <td className="py-2 font-mono">Meta Paid Lead</td>
                      <td className="py-2 text-right font-medium text-stone-900">$3.42 CPA</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-4 h-24 w-28 bg-[#faf9f5] border border-amber-500/20 rounded-xl shadow-lg -z-10 animate-pulse hidden sm:block"></div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations-section" className="py-24 max-w-7xl mx-auto px-6 border-b border-[#e6e2da]">
        <div className="text-center mb-16">
          <p className="text-xs font-mono font-bold text-amber-700 uppercase tracking-widest mb-3">Sync Connections</p>
          <h2 className="font-display font-semibold text-3xl text-neutral-900">Supported Google & Meta Integrations</h2>
          <p className="text-neutral-500 mt-2 max-w-xl mx-auto">Instant credentials loading hooks for your core advertising assets.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { name: "Google Analytics 4", slug: "google-analytics", desc: "Attribution property mapping" },
            { name: "Google Search Console", slug: "search-console", desc: "Indexation and tracking keywords" },
            { name: "Google Ads Network", slug: "google-ads", desc: "CPC campaign optimization" },
            { name: "Meta Ads Platform", slug: "meta-ads", desc: "Conversion funnels & clicks" },
            { name: "Meta Business Suite", slug: "meta-business", desc: "Engagement & organic stats" }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-[#e8e4db] p-6 rounded-xl text-center group hover:shadow-md transition-shadow">
              <div className="h-10 w-10 mx-auto bg-[#faf9f5] rounded-full flex items-center justify-center font-display font-bold text-neutral-700 text-sm border border-[#eae6db] mb-4">
                0{idx + 1}
              </div>
              <h4 className="font-display font-semibold text-sm text-neutral-900 mb-1">{item.name}</h4>
              <p className="text-xs text-neutral-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final element */}
      <section id="cta-pricing-section" className="py-24 max-w-5xl mx-auto px-6 text-center">
        <div className="p-12 md:p-16 bg-neutral-900 text-amber-50 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">Connect Your Agency Profiles Today</h2>
            <p className="text-neutral-400 text-sm md:text-base mb-8">
              Standardize client reporting, internal strategy checklists, and core SEO graphs in less than 3 minutes. Connected natively with Google API protocols.
            </p>
            <button
              id="cta-join-now-btn"
              onClick={onStart}
              className="px-8 py-4 bg-[#fbfaf6] text-neutral-900 font-medium hover:bg-neutral-200 transition-colors rounded-xl mx-auto flex items-center justify-center space-x-2"
            >
              <span>Get Started Immediately</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          {/* subtle decoration */}
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
          <div className="absolute top-0 left-0 w-40 h-40 bg-stone-500/10 rounded-full blur-2xl"></div>
        </div>
      </section>

      {/* Footer footer */}
      <footer className="bg-neutral-900 text-neutral-500 text-xs py-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-display font-medium text-neutral-300">BNB.AI</span>
            <span className="text-neutral-600">|</span>
            <span>Enterprise Marketing Intelligence Platforms</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} BNB.AI Suite Corp. Handcrafted with React & Vite. All systems operating securely.
          </div>
        </div>
      </footer>
    </div>
  );
}
