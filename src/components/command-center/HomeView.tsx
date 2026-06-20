import React from 'react';
import { ReportResponse } from '../../types';
import { GlassCard } from '../GlassCard';
import { KpiRibbon } from '../KpiRibbon';
import { CompetitorRadar } from '../CompetitorRadar';
import {
  Sparkles, TrendingUp, Users, Target, Activity, PieChart, Zap, Search as Radar
} from 'lucide-react';

interface HomeViewProps {
  reportData: ReportResponse | null;
  onGenerate: () => void;
}

const getRadarData = (reportData: ReportResponse | null) => {
  const d = reportData?.radarData || reportData?.radar_data || reportData?.aiCompetitorAnalysis?.radar_data;
  return Array.isArray(d) ? d : [];
};

export const HomeView: React.FC<HomeViewProps> = ({ reportData, onGenerate }) => {
  const kpiItems = reportData?.tableData1 ? reportData.tableData1.slice(0, 6).map((row: any, i: number) => ({
    label: row.metric,
    value: row.current,
    change: row.change,
    icon: [TrendingUp, Users, Target, Activity, PieChart, Zap][i % 6]
  })) : [
    { label: "Active Nodes", value: "0", change: "N/A", icon: Activity },
    { label: "Neural Traffic", value: "0", change: "N/A", icon: TrendingUp },
    { label: "Conversion Flux", value: "0", change: "N/A", icon: Target },
    { label: "Social Echo", value: "0", change: "N/A", icon: Users },
    { label: "Asset Value", value: "₹0", change: "N/A", icon: PieChart },
    { label: "Sync Status", value: "Idle", change: "0ms", icon: Zap }
  ];

  const radarData = getRadarData(reportData);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Neural Command Center</h2>
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-sm font-medium">Live Marketing Ecosystem Stream</span>
          </div>
        </div>
        {!reportData && (
          <button
            onClick={onGenerate}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all hover:border-cyan-500/30"
          >
            Quick Sync
          </button>
        )}
      </div>

      <KpiRibbon items={kpiItems} />

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard className="p-8 border-l-4 border-l-cyan-500 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Executive Intel</h3>
          </div>
          <div className="relative">
            <p className="text-gray-200 leading-relaxed text-lg font-serif italic pl-4">
              "{reportData?.narrative1 || "System idle. Awaiting neural synchronization to parse market data and generate executive insights."}"
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/20">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Priority Protocols</h3>
          </div>
          <div className="space-y-4">
            {(reportData?.adviceList || []).slice(0, 3).map((adv: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05] hover:border-violet-500/30 transition-all group"
              >
                <div className="w-2 h-2 rounded-full bg-violet-500 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(124,58,237,0.6)]" />
                <span className="text-gray-200 text-sm font-medium">{typeof adv === 'string' ? adv : adv.title}</span>
              </div>
            ))}
            {!reportData && [1,2,3].map(i => (
              <div key={i} className="h-14 bg-white/5 rounded-2xl shimmer" />
            ))}
          </div>
        </GlassCard>
      </div>

      {radarData.length > 0 && (
        <div className="mt-8">
          <CompetitorRadar
            data={radarData}
            siteName={reportData?.siteName}
            siteData={reportData?.radar_self}
          />
        </div>
      )}
    </div>
  );
};
