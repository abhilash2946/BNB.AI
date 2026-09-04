import React from 'react';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface ReportCard {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}

export const ReportsStudioCards: React.FC<{ reports: ReportCard[] }> = ({ reports }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
    {reports.map((r, i) => (
      <GlassCard key={i} className="p-5 cursor-pointer group" onClick={r.onClick}>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
          <r.icon size={22} className="text-white" />
        </div>
        <h3 className="font-bold text-lg">{r.title}</h3>
        <p className="text-gray-400 text-sm mt-1">{r.description}</p>
      </GlassCard>
    ))}
  </div>
);