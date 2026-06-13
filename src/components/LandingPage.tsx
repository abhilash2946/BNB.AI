import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Shield, Zap, TrendingUp, Globe, Database, Network } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
}

export default function LandingPage({ onStart, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#080B14] text-white overflow-hidden relative">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] animate-pulse delay-700" />

      {/* Navbar */}
      <nav className="relative z-50 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.3)]">
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent tracking-tighter">BNB.AI</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onLogin} className="text-gray-400 hover:text-white transition-colors font-medium">Protocol Login</button>
          <button onClick={onStart} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-all backdrop-blur-md">Secure Access</button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Neural Marketing Intelligence v4.0
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
            The Future of <br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">Marketing Intel</span>
          </h1>

          <p className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl mb-12 leading-relaxed">
            Standardize your agency's reporting ecosystem. Transform fragmented SEO, PPC, and Social data into unified neural insights with AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStart}
              className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-2xl font-bold text-lg flex items-center gap-2 hover:shadow-[0_0_40px_rgba(0,212,255,0.4)] transition-all"
            >
              Initiate Neural Sync
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onLogin}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-lg backdrop-blur-md transition-all"
            >
              System Overview
            </button>
          </div>
        </motion.div>

        {/* Floating Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-32">
          <FeatureCard
            icon={TrendingUp}
            title="SEO Intelligence"
            desc="Deep-layer organic traffic analysis and keyword clusters parsed by Gemini AI."
            delay={0.2}
          />
          <FeatureCard
            icon={Zap}
            title="Paid Protocol"
            desc="Consolidated Google & Meta ads ROI matrices with real-time CPA optimization."
            delay={0.4}
          />
          <FeatureCard
            icon={Shield}
            title="Enterprise View"
            desc="Multi-business workspace management with clean stakeholder report generation."
            delay={0.6}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <Sparkles size={16} />
            <span className="font-bold">BNB.AI</span>
            <span className="text-xs">© {new Date().getFullYear()} All Rights Reserved.</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Protocol</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Neural API</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Service Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon: Icon, title, desc, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    className="p-8 rounded-[2rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl text-left hover:border-cyan-500/50 transition-all group"
  >
    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,212,255,0.1)]">
      <Icon size={24} />
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-gray-400 leading-relaxed text-sm">{desc}</p>
  </motion.div>
);