import React from 'react';
import * as Icons from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip as ChartTooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { MarketingReport } from '../types';

interface HomeDashboardProps {
  report: MarketingReport | null;
  onNavigateToCategory: (category: string) => void;
  onTriggerSync: () => void;
  siteName?: string;
}

const DynamicIcon = ({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.Activity;
  return <IconComponent size={size} className={className} />;
};

// Stable mock sparkline data based on label to prevent flickering on re-renders
const getSparklineData = (label: string, isPositive: boolean) => {
  const seeds: Record<string, number[]> = {
    "TRAFFIC": [4, 5, 4.2, 6, 5.5, 7.5],
    "LEADS": [3, 4.5, 3.8, 5.2, 4.6, 6],
    "REVENUE": [5, 4.2, 6.5, 5.5, 7.8, 8.8],
    "CONVERSIONS": [4, 5.5, 4.8, 6.5, 5.8, 7.5],
    "ROAS": [6, 5.2, 6.8, 7.5, 6.8, 8.2],
    "ENGAGEMENT": [8, 7.2, 6.1, 5.2, 4.1, 2.5]
  };
  const points = seeds[label] || (isPositive ? [3, 4, 5, 4.5, 5.5, 6.5] : [7, 6, 5, 5.5, 4.5, 3.5]);
  return points.map((v, i) => ({ v, name: `Node ${i}` }));
};

export default function HomeDashboard({
  report,
  onNavigateToCategory,
  onTriggerSync,
  siteName
}: HomeDashboardProps) {

  // Check if report has ACTUAL data or is just a skeleton
  const hasRealData = report && report.kpis && report.kpis.length > 0 && report.kpis[0].value !== "3,18,420";

  if (!hasRealData) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl max-w-xl mx-auto my-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="p-3 bg-white/5 text-[#00d4ff] rounded-full inline-block mb-4 hover:scale-105 transition-transform">
          <Icons.Sparkles size={32} className="animate-pulse" />
        </div>
        <h3 className="font-display font-medium text-lg text-white mb-2">No Intel Generated</h3>
        <p className="text-xs text-white/60 leading-relaxed mb-6 font-sans">
          Active systems are resting safely. Trigger a neural intelligence sync on the {siteName || "workspace"} node to analyze this division's report curves.
        </p>
        <button
          onClick={onTriggerSync}
          className="px-5 py-2.5 bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white text-xs font-semibold rounded-xl hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-transform hover:scale-105 inline-flex items-center gap-2"
        >
          <Icons.RefreshCw size={14} />
          Trigger Neural Sync
        </button>
      </div>
    );
  }

  const kpis = report.kpis;
  const executiveSummary = report.executiveSummary;
  const radarData = report.radarData || [];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row justify-between gap-8 relative">
        {/* Soft atmospheric spotlight glow behind header */}
        <div className="absolute -top-32 -left-20 w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_50%,transparent_100%)] pointer-events-none z-0" />

        <div className="space-y-6 max-w-3xl relative z-10">
          <div className="flex items-center gap-3">
             <span className="text-[8px] font-mono font-medium text-gray-500 tracking-[0.5em] uppercase">NEURAL COMMAND CENTER</span>
             <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_12px_4px_rgba(255,255,255,0.4)]" />
          </div>

          <h1 className="text-5xl md:text-6xl font-display font-bold text-white leading-tight tracking-tight flex flex-wrap items-center gap-4">
            Live Marketing Ecosystem Stream
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl font-sans">
            Continuous analytical parsing of organic content performance, advertising acquisition nodes, and
            relative competitor growth multipliers for <span className="text-white font-semibold">{report.siteName || siteName}</span>.
          </p>

          <div className="flex flex-wrap gap-12 pt-4">
             <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Primary Objective</span>
                <p className="text-white font-medium text-sm">Omnichannel Performance Scale</p>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Optimization Mode</span>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-white" />
                   <p className="text-white font-medium text-sm">Adaptive Growth Stream</p>
                </div>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Core Signal Synced</span>
                <p className="text-white font-mono font-bold text-sm">105.4 Hz</p>
             </div>
          </div>
        </div>

        {/* Health Circular Chart styled as a premium glassmorphic sphere disc */}
        <div className="shrink-0 flex items-center justify-center lg:justify-end relative z-10">
          <div className="relative w-52 h-52 rounded-full border border-white/10 bg-gradient-to-b from-[#1C1C1C] to-[#0A0A0A] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center">
            {/* Ambient inner soft white glow behind text */}
            <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="100%" stopColor="#9C9C9C" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={[{ name: 'Health', value: 87 }, { name: 'Remaining', value: 13 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={0}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    <Cell fill="url(#healthGrad)" stroke="none" />
                    <Cell fill="rgba(255,255,255,0.03)" stroke="none" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                 <span className="text-[9px] font-mono text-white/40 uppercase tracking-[0.25em] mb-1">Health</span>
                 <span className="text-6xl font-display font-bold text-white leading-none tracking-tight">87</span>
                 <div className="flex items-center gap-0.5 mt-1.5 text-white/80">
                   <Icons.TrendingUp size={11} />
                   <span className="text-[9px] font-mono font-bold">+12.4%</span>
                 </div>
                 <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest mt-0.5">This Quarter</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="glass-panel p-6 flex flex-col justify-between group relative overflow-hidden h-36"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono font-medium text-white/40 tracking-[0.2em] uppercase">
                {kpi.label}
              </span>
              <div className="text-white opacity-20">
                <DynamicIcon name={kpi.icon} size={14} />
              </div>
            </div>

            <div className="mt-auto">
              <div className="text-2xl font-display font-bold text-white tracking-tight">
                {kpi.value}
              </div>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`text-[10px] font-mono font-bold ${kpi.isPositive ? 'text-emerald-400' : 'text-rose-500/80'}`}>
                   {kpi.isPositive ? '+' : ''}{kpi.change}%
                 </span>

                 {/* Mini sparkline visualization */}
                 <div className="h-6 w-16 opacity-60">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={getSparklineData(kpi.label, kpi.isPositive)}>
                          <defs>
                             <linearGradient id={`sparkGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                             </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="v"
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                            fill={`url(#sparkGrad-${idx})`}
                            dot={false}
                          />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* AI Executive Briefings */}
        <div className="xl:col-span-8 glass-panel p-8 flex flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/10 text-white">
                    <Icons.Sparkles size={20} />
                  </div>
                  <h2 className="font-display font-bold text-base text-white uppercase tracking-widest">
                    AI Executive Briefings
                  </h2>
               </div>
               <span className="text-[9px] font-mono text-gray-500 uppercase">{report.siteName || siteName} Analytics Synced</span>
            </div>

            <p className="text-gray-300 font-sans text-xl leading-relaxed antialiased">
              {executiveSummary}
            </p>
          </div>

          <div className="mt-12 flex gap-4">
             <button className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition-all">View Audit Trail</button>
             <button className="px-6 py-2.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white hover:bg-white/20 transition-all">Download Executive PDF</button>
          </div>
        </div>

        {/* Competitor Radar Side Card */}
        <div className="xl:col-span-4 glass-panel p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
             <h2 className="font-display font-bold text-xs text-white uppercase tracking-[0.2em]">Competitor Radar</h2>
             <button className="text-[9px] font-mono text-white hover:underline flex items-center gap-1 uppercase">Radar Node <Icons.ChevronRight size={10} /></button>
          </div>

          <p className="text-gray-500 text-xs leading-relaxed mb-8">
            Comparative market position mapping across search share, keyword metrics, domain authority, and social velocity.
          </p>

          <div className="h-64 w-full mt-auto">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Radar
                    name="Current Site"
                    dataKey="Current Site"
                    stroke="#FFFFFF"
                    fill="#FFFFFF"
                    fillOpacity={0.1}
                  />
                  <Radar
                    name="Competitors"
                    dataKey="Competitor Alpha"
                    stroke="#9CA3AF"
                    fill="#9CA3AF"
                    fillOpacity={0.05}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full bg-white/[0.02] rounded-2xl flex items-center justify-center border border-white/5 border-dashed">
                 <div className="text-center space-y-3">
                   <Icons.Radar size={32} className="text-gray-700 mx-auto animate-pulse" />
                   <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Awaiting Radar Feed</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
