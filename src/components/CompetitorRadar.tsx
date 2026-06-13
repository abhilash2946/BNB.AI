import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Radar as RadarIcon } from 'lucide-react';
import { RadarDataPoint } from '../types';

export const CompetitorRadar: React.FC<{ data: RadarDataPoint[] }> = ({ data }) => {
  if (!data || !data.length) {
    return (
      <div className="glass-panel p-12 text-center rounded-[2rem] border border-white/5 bg-[#0b0f19]/80">
        <RadarIcon size={48} className="mx-auto text-gray-600 mb-4 opacity-50 animate-pulse" />
        <h3 className="font-display font-bold text-lg text-white mb-2 uppercase tracking-widest">Competitor Radar Offline</h3>
        <p className="text-gray-400 text-xs max-w-xs mx-auto font-sans">Neural sync with competitor nodes has not been established yet. Generate a comprehensive report to activate scanning.</p>
      </div>
    );
  }
  return (
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
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="rgba(255,255,255,0.05)" />
            <Radar name="Current Site" dataKey="Current Site" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.2} />
            <Radar name="Competitor Alpha" dataKey="Competitor Alpha" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.1} />
            <Radar name="Competitor Beta" dataKey="Competitor Beta" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
            <Radar name="Competitor Gamma" dataKey="Competitor Gamma" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
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
            * Radar data represents relative market strength indexed against global industry benchmarks.
         </p>
      </div>
    </div>
  );
};
