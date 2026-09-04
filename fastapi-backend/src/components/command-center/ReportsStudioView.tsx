import React from 'react';
import { Sparkles, TrendingUp, Target, Users, Zap } from 'lucide-react';
import { ReportsStudioCards } from '../ReportsStudioCards';

interface ReportsStudioViewProps {
  onSelectReport: (type: string) => void;
}

export const ReportsStudioView: React.FC<ReportsStudioViewProps> = ({ onSelectReport }) => {
  const reports = [
    { title: "Executive Intel", description: "Strategic high-level KPIs and neural trends", icon: Sparkles, color: "from-cyan-500 to-blue-500", type: "SEO" },
    { title: "Organic Pulse", description: "Deep-dive organic traffic & keyword matrices", icon: TrendingUp, color: "from-emerald-500 to-teal-500", type: "SEO" },
    { title: "Paid Protocol", description: "Google & Meta ads conversion analytics", icon: Target, color: "from-violet-500 to-purple-500", type: "Performance Marketing" },
    { title: "Unified Deck", description: "Combined SEO & Ads Intelligence ecosystem", icon: Zap, color: "from-amber-500 to-orange-500", type: "Combined Intelligence" },
  ];
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="glass p-8">
        <h2 className="text-3xl font-bold mb-2">Reports Studio</h2>
        <p className="text-gray-400">Select an intelligence module to generate a specialized report</p>
      </div>
      <ReportsStudioCards reports={reports.map(r => ({ ...r, onClick: () => onSelectReport(r.type) }))} />
    </div>
  );
};
