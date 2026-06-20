import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Radar as RadarIcon, ShieldCheck } from 'lucide-react';

interface CompetitorRadarProps {
  data: any[];
  siteName?: string;
  siteData?: Record<string, number>;
}

export const CompetitorRadar: React.FC<CompetitorRadarProps> = ({ data, siteName, siteData }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-[2rem] border border-white/5 bg-[#0b0f19]/80">
        <RadarIcon size={48} className="mx-auto text-gray-600 mb-4 opacity-50 animate-pulse" />
        <h3 className="font-display font-bold text-lg text-white mb-2 uppercase tracking-widest">Competitor Radar Offline</h3>
        <p className="text-gray-400 text-xs max-w-xs mx-auto font-sans">Neural sync with competitor nodes has not been established yet. Generate a comprehensive report to activate scanning.</p>
      </div>
    );
  }

  const sample = data[0];
  const competitorKeys = Object.keys(sample).filter(k => k !== 'subject' && k !== 'Current Site' && k !== 'you');
  const colors = ['#7c3aed', '#f43f5e', '#22c55e', '#f59e0b'];

  // Prepare data for self radar
  const formattedSiteData = siteData ? Object.entries(siteData).map(([subject, value]) => ({
    subject,
    value
  })) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 1. Competitor Comparison Radar */}
      <div className="glass-panel p-8 rounded-[2rem] border border-white/5 bg-[#0b0f19]/80 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
          <div className="p-2 bg-[#00d4ff]/10 rounded-xl text-[#00d4ff]">
             <RadarIcon size={18} />
          </div>
          <h3 className="font-display font-bold text-sm text-white uppercase tracking-widest">Competitor Tactical Radar</h3>
        </div>

        <div className="flex-1 min-h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} stroke="rgba(255,255,255,0.05)" />

              <Radar
                name="Current Site"
                dataKey="Current Site"
                stroke="#00d4ff"
                fill="#00d4ff"
                fillOpacity={0.2}
              />

              {competitorKeys.map((key, idx) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={colors[idx % colors.length]}
                  fill={colors[idx % colors.length]}
                  fillOpacity={0.1}
                />
              ))}

              <Tooltip
                contentStyle={{ background: '#0c101b', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} iconSize={8} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5">
           <p className="text-[10px] text-gray-500 font-mono italic leading-relaxed">
              * Relative market strength indexed against industry benchmarks.
           </p>
        </div>
      </div>

      {/* 2. Individual Site Radar */}
      <div className="glass-panel p-8 rounded-[2rem] border border-white/5 bg-[#0b0f19]/80 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
             <ShieldCheck size={18} />
          </div>
          <h3 className="font-display font-bold text-sm text-white uppercase tracking-widest">
            {siteName || 'Current Site'} Strategic Radar
          </h3>
        </div>

        <div className="flex-1 min-h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={formattedSiteData || data}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} stroke="rgba(255,255,255,0.05)" />

              <Radar
                name={siteName || "Current Site"}
                dataKey={formattedSiteData ? "value" : "Current Site"}
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
              />

              <Tooltip
                contentStyle={{ background: '#0c101b', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5">
           <p className="text-[10px] text-gray-500 font-mono italic leading-relaxed uppercase tracking-wider">
              Neural signature for {siteName || 'Primary Node'}
           </p>
        </div>
      </div>
    </div>
  );
};
