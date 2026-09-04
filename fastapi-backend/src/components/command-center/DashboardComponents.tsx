import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const THEME = {
  bg: '#F3F4F6',
  text: '#111827',
  blue: '#2563EB',
  green: '#10B981',
  orange: '#F59E0B',
  gray: '#E5E7EB',
  white: '#FFFFFF',
  textLight: '#6B7280',
  accent: '#2563EB',
  lightGray: '#F3F4F6'
};

export const KPICard = ({ label, value, trend, trendValue, isPositive }: { label: string; value: string | number; trend?: string; trendValue?: string; isPositive?: boolean }) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-[#E5E7EB] shadow-lg flex flex-col items-center justify-center text-center group hover:border-[#2563EB]/20 transition-all duration-500 hover:shadow-2xl">
    <p className="text-[11px] font-mono font-black text-[#9CA3AF] uppercase tracking-[0.3em] mb-4 group-hover:text-[#2563EB] transition-colors">{label}</p>
    <p className="text-5xl font-display font-black text-[#111827] tracking-tighter">{value}</p>
    {trendValue && (
      <div className={`mt-5 flex items-center gap-2 text-xs font-black ${isPositive ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm ${isPositive ? 'bg-[#10B981]/10' : 'bg-[#F59E0B]/10'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trendValue}
        </span>
        <span className="text-[#9CA3AF] font-mono font-bold tracking-widest">{trend || 'vs LY'}</span>
      </div>
    )}
  </div>
);

export const ScoreRing = ({ label, score, color = THEME.blue, size = "large" }: { label: string; score: number; color?: string; size?: "small" | "large" }) => {
  const radius = size === "large" ? 42 : 25;
  const strokeWidth = size === "large" ? 4 : 4;
  const svgSize = size === "large" ? "w-32 h-32" : "w-16 h-16";
  const fontSize = size === "large" ? "text-3xl" : "text-sm";
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`bg-white p-8 rounded-[2.5rem] border border-[#E5E7EB] shadow-sm flex flex-col items-center group hover:shadow-lg transition-all duration-500 ${size === "small" ? 'p-4' : ''}`}>
      <div className={`relative ${svgSize} flex items-center justify-center mb-6`}>
        <svg className="w-full h-full transform -rotate-90 filter drop-shadow-sm">
          <circle
            cx={size === "large" ? "64" : "32"}
            cy={size === "large" ? "64" : "32"}
            r={radius}
            stroke="#F3F4F6"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size === "large" ? "64" : "32"}
            cy={size === "large" ? "64" : "32"}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className={`absolute font-black text-[#111827] ${fontSize} tracking-tighter`}>{score}</span>
      </div>
      <p className="text-xs font-black text-[#6B7280] uppercase tracking-[0.2em] text-center group-hover:text-[#111827] transition-colors">{label}</p>
    </div>
  );
};

export const InfoCard = ({ children, title, className = "", subtitle }: { children: React.ReactNode; title?: string; className?: string; subtitle?: string }) => (
  <div className={`bg-white rounded-[3rem] border border-[#E5E7EB] shadow-lg p-10 ${className}`}>
    {(title || subtitle) && (
      <div className="flex justify-between items-center mb-10 pb-6 border-b border-[#111827]/5">
        {title && <h3 className="text-xs font-black text-[#111827] uppercase tracking-[0.4em]">{title}</h3>}
        {subtitle && <span className="text-[11px] font-mono font-black text-[#2563EB] uppercase tracking-[0.3em]">{subtitle}</span>}
      </div>
    )}
    {children}
  </div>
);

export const FunnelStep = ({ label, value, subValue, color = THEME.blue, width = "100%", opacity = 1 }: { label: string; value: string | number; subValue?: string; color?: string; width?: string; opacity?: number }) => (
  <div className="flex flex-col gap-2 items-center w-full">
    <div className="flex justify-between items-center w-full max-w-md px-4">
      <span className="text-[11px] font-bold text-[#111827] uppercase tracking-widest">{label}</span>
      <span className="text-sm font-display font-bold text-[#111827]">{value}</span>
    </div>
    <div
      className="h-12 rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-500"
      style={{
        backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
        width: width
      }}
    >
       {subValue && (
         <div className="flex items-center gap-1">
            <TrendingUp size={12} className="text-[#10B981]" />
            <span className="text-[10px] font-bold text-[#10B981]">{subValue}</span>
         </div>
       )}
    </div>
  </div>
);

export const MatrixItem = ({ title, items, color = THEME.blue }: { title: string; items: string[]; color?: string }) => (
  <div className="space-y-6">
    <h3 className="text-xs font-bold text-[#111827] uppercase tracking-[0.2em] flex items-center gap-3">
      <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: color }} />
      {title}
    </h3>
    <ul className="space-y-3">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-3 text-[11px] text-[#6B7280] leading-relaxed">
          <div className="mt-1.5 w-1 h-1 rounded-full bg-[#E5E7EB] shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export const GrowthPill = ({ value, isPositive }: { value: string; isPositive: boolean }) => (
  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold ${isPositive ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]' : 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]'}`}>
    {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
    {value}
  </div>
);
