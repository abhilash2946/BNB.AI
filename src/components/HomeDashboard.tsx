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
  Cell
} from 'recharts';
import { MarketingReport } from '../types';

interface HomeDashboardProps {
  report: MarketingReport | null;
  onNavigateToCategory: (category: string) => void;
  onTriggerSync: () => void;
}

const DynamicIcon = ({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.Activity;
  return <IconComponent size={size} className={className} />;
};

export default function HomeDashboard({
  report,
  onNavigateToCategory,
  onTriggerSync,
}: HomeDashboardProps) {

  const kpis = report?.kpis || [
    { label: "TRAFFIC", value: "3,18,420", change: 14.2, isPositive: true, icon: "TrendingUp" },
    { label: "LEADS", value: "14,860", change: 8.7, isPositive: true, icon: "Users" },
    { label: "REVENUE", value: "₹4,12,950", change: 19.1, isPositive: true, icon: "DollarSign" },
    { label: "CONVERSIONS", value: "4,612", change: 12.4, isPositive: true, icon: "Target" },
    { label: "ROAS", value: "4.82x", change: 5.1, isPositive: true, icon: "Activity" },
    { label: "ENGAGEMENT", value: "18.4K", change: -2.3, isPositive: false, icon: "Zap" }
  ];

  const executiveSummary = report?.executiveSummary ||
    "Global marketing strength holds high velocity. Organic search keyword ranking expansion scales steadily, whilst high-acquisition prospecting drags Facebook averages.";

  const radarData = report?.radarData || [];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row justify-between gap-8 relative">
        <div className="space-y-6 max-w-3xl">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-mono font-bold text-[#00d4ff] tracking-[0.3em] uppercase">NEURAL COMMAND CENTER</span>
             <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse shadow-[0_0_8px_#00d4ff]" />
          </div>

          <h1 className="text-5xl md:text-6xl font-display font-bold text-white leading-tight tracking-tight flex flex-wrap items-center gap-4">
            {report?.imageUrl && (
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                <img src={report.imageUrl} alt="Site Logo" className="w-full h-full object-cover" />
              </div>
            )}
            Live Marketing Ecosystem Stream
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl font-sans">
            Continuous analytical parsing of organic content performance, advertising acquisition nodes, and
            relative competitor growth multipliers for <span className="text-[#00d4ff] font-semibold">{report?.siteName || "Apex Athletics"}</span>.
          </p>

          <div className="flex flex-wrap gap-12 pt-4">
             <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Primary Objective</span>
                <p className="text-white font-medium text-sm">Omnichannel Performance Scale</p>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Optimization Mode</span>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                   <p className="text-[#22c55e] font-medium text-sm">Adaptive Growth Stream</p>
                </div>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Core Signal Synced</span>
                <p className="text-[#00d4ff] font-mono font-bold text-sm">105.4 Hz</p>
             </div>
          </div>
        </div>

        {/* Health Circular Chart */}
        <div className="shrink-0 flex items-center justify-center lg:justify-end">
          <div className="relative w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ name: 'Health', value: 87 }, { name: 'Remaining', value: 13 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={85}
                  startAngle={90}
                  endAngle={450}
                  paddingAngle={0}
                  dataKey="value"
                >
                  <Cell fill="#00d4ff" stroke="none" />
                  <Cell fill="rgba(255,255,255,0.05)" stroke="none" />
                </Pie>
                <ChartTooltip
                  contentStyle={{ backgroundColor: '#0c101b', border: '1px solid #00d4ff30', borderRadius: '8px', fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Health</span>
               <span className="text-5xl font-display font-bold text-white leading-none">87</span>
               <div className="flex items-center gap-1 mt-2 text-[#22c55e]">
                 <Icons.TrendingUp size={12} />
                 <span className="text-[10px] font-mono font-bold">+12.4%</span>
               </div>
               <span className="text-[8px] font-mono text-gray-600 uppercase tracking-tighter mt-0.5">This Quarter</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="glass-panel rounded-2xl p-5 flex flex-col justify-between group relative overflow-hidden h-36"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold text-gray-500 tracking-wider uppercase">
                {kpi.label}
              </span>
              <div className="text-[#00d4ff] opacity-40">
                <DynamicIcon name={kpi.icon} size={16} />
              </div>
            </div>

            <div className="mt-auto">
              <div className="text-2xl font-display font-bold text-white tracking-tight">
                {kpi.value}
              </div>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`text-[10px] font-mono font-bold ${kpi.isPositive ? 'text-[#22c55e]' : 'text-[#f43f5e]'}`}>
                   {kpi.isPositive ? '+' : ''}{kpi.change}%
                 </span>

                 {/* Mini sparkline visualization */}
                 <div className="h-6 w-16 opacity-50">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={[...Array(6)].map((_, i) => ({ v: Math.random() * 10, name: `Node ${i}` }))}>
                          <ChartTooltip
                            contentStyle={{ backgroundColor: '#0c101b', border: '1px solid #00d4ff30', borderRadius: '4px', fontSize: '8px', padding: '2px' }}
                            labelStyle={{ display: 'none' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="v"
                            stroke={kpi.isPositive ? '#22c55e' : '#f43f5e'}
                            strokeWidth={2}
                            dot={false}
                          />
                       </LineChart>
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
        <div className="xl:col-span-8 glass-panel rounded-[2rem] p-8 flex flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#00d4ff]/10 text-[#00d4ff]">
                    <Icons.Sparkles size={20} />
                  </div>
                  <h2 className="font-display font-bold text-base text-white uppercase tracking-widest">
                    AI Executive Briefings
                  </h2>
               </div>
               <span className="text-[9px] font-mono text-gray-500 uppercase">{report?.siteName || "Apex Athletics"} Analytics Synced</span>
            </div>

            <p className="text-gray-300 font-sans text-xl leading-relaxed antialiased">
              {executiveSummary}
            </p>
          </div>

          <div className="mt-12 flex gap-4">
             <button className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition-all">View Audit Trail</button>
             <button className="px-6 py-2.5 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-xs font-semibold text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-all">Download Executive PDF</button>
          </div>
        </div>

        {/* Competitor Radar Side Card */}
        <div className="xl:col-span-4 glass-panel rounded-[2rem] p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
             <h2 className="font-display font-bold text-xs text-white uppercase tracking-[0.2em]">Competitor Radar</h2>
             <button className="text-[9px] font-mono text-[#00d4ff] hover:underline flex items-center gap-1 uppercase">Radar Node <Icons.ChevronRight size={10} /></button>
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
                    contentStyle={{ backgroundColor: '#0c101b', border: '1px solid #00d4ff30', borderRadius: '8px', fontSize: '10px' }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Radar
                    name="Current Site"
                    dataKey="Current Site"
                    stroke="#00d4ff"
                    fill="#00d4ff"
                    fillOpacity={0.1}
                  />
                  <Radar
                    name="Competitors"
                    dataKey="Competitor Alpha"
                    stroke="#7c3aed"
                    fill="#7c3aed"
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
