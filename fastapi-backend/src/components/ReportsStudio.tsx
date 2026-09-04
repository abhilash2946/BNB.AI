import React from 'react';
import { Sparkles, TrendingUp, Target, Users, ArrowRight } from 'lucide-react';
import { CategoryType } from '../types';

interface ReportsStudioProps {
  onTriggerModule: (category: CategoryType, viewId: string) => void;
}

export default function ReportsStudio({ onTriggerModule }: ReportsStudioProps) {
  const modules = [
    {
      id: 'seo-intel',
      category: 'SEO' as CategoryType,
      title: 'Executive Intel',
      desc: 'High-level synthesis of organic traffic nodes and domain index curves.',
      icon: Sparkles,
      color: 'bg-white text-black',
      shadow: 'shadow-white/20'
    },
    {
      id: 'seo-intel',
      category: 'SEO' as CategoryType,
      title: 'Organic Pulse',
      desc: 'Deep-layer analysis of keyword density, search intent, and platform distribution.',
      icon: TrendingUp,
      color: 'bg-white text-black',
      shadow: 'shadow-white/20'
    },
    {
      id: 'perf-intel',
      category: 'Performance Marketing' as CategoryType,
      title: 'Paid Protocol',
      desc: 'Optimization matrices for Google and Meta advertising telemetry.',
      icon: Target,
      color: 'bg-white text-black',
      shadow: 'shadow-white/20'
    },
    {
      id: 'social-intel',
      category: 'Social Media Marketing' as CategoryType,
      title: 'Social Echo',
      desc: 'Synthesis of engagement flux and brand resonance across Meta ecosystems.',
      icon: Users,
      color: 'bg-white text-black',
      shadow: 'shadow-white/20'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-2xl">
        <h1 className="font-display font-medium text-3xl text-white tracking-tight">Reports Studio</h1>
        <p className="text-sm text-white/50 mt-1">Select an intelligence module to generate a specialized report</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod, i) => (
          <button
            key={i}
            onClick={() => onTriggerModule(mod.category, mod.id)}
            className="glass-panel p-6 rounded-2xl text-left hover:scale-[1.02] active:scale-[0.98] transition-all group flex flex-col justify-between h-56"
          >
            <div>
              <div className={`w-12 h-12 rounded-xl ${mod.color} flex items-center justify-center mb-4 group-hover:shadow-lg ${mod.shadow} transition-shadow`}>
                <mod.icon size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg text-white mb-2">{mod.title}</h3>
              <p className="text-xs text-white/50 leading-relaxed max-w-[240px]">
                {mod.desc}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-white group-hover:gap-3 transition-all">
              <span>ENGAGE MODULE</span>
              <ArrowRight size={14} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
