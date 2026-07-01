import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiItem {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
}

export const KpiRibbon: React.FC<{ items: KpiItem[] }> = ({ items }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
    {items.map((item, i) => (
      <div key={i} className="kpi-card group">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs uppercase tracking-wider text-gray-400">{item.label}</span>
          <item.icon size={18} className="text-white group-hover:text-gray-300 transition" aria-hidden="true" />
        </div>
        <div className="text-2xl font-bold font-mono">{item.value}</div>
        <div className={`text-xs mt-2 ${item.change.startsWith('+') ? 'text-green-400' : item.change.startsWith('-') ? 'text-red-400' : 'text-gray-400'}`}>
          {item.change}
        </div>
      </div>
    ))}
  </div>
);