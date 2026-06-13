import React from 'react';
import { ReportResponse } from '../../types';
import { GlassCard } from '../GlassCard';
import {
  ResponsiveContainer,
  LineChart as ReLineChart, Line as ReLine,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { PALETTE } from '../../constants/theme';

interface SocialReportProps {
  reportData: ReportResponse;
  includeCharts: boolean;
}

const renderStandardBlock = (title: string, sentence: string, headers: string[], rows: (string | number)[][], chartComponent?: React.ReactNode) => (
  <GlassCard className="p-6 mb-6 overflow-hidden">
    <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
    <p className="text-sm text-gray-400 mb-6 italic">{sentence}</p>
    <div className={`grid grid-cols-1 ${chartComponent ? "lg:grid-cols-2" : ""} gap-8`}>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {chartComponent && <div className="bg-black/20 rounded-xl p-4 border border-white/5">{chartComponent}</div>}
    </div>
  </GlassCard>
);

export const SocialReport: React.FC<SocialReportProps> = ({ reportData, includeCharts }) => {
  const tableExplanations = reportData.tableExplanations || {};
  const kpi = reportData.tableData1 || [];

  return (
    <div className="space-y-6">
      {renderStandardBlock(
        "Social Media KPI Summary",
        tableExplanations.kpi_overview || "Neural comparison of Social reach and impressions.",
        ["Metric", "Current", "Previous", "Change"],
        kpi.map(r => [r.metric, r.current, r.previous, r.change]),
        includeCharts ? (
          <ResponsiveContainer width="100%" height={220}>
            <ReLineChart data={reportData.chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={9} />
              <YAxis stroke="#9CA3AF" fontSize={9} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #00D4FF', borderRadius: '8px' }}
                itemStyle={{ color: '#00D4FF' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              <ReLine type="monotone" dataKey="valueA" stroke={PALETTE.cyan} strokeWidth={2} name="FB Impressions" />
              <ReLine type="monotone" dataKey="valueB" stroke={PALETTE.violet} strokeWidth={2} name="IG Impressions" />
            </ReLineChart>
          </ResponsiveContainer>
        ) : null
      )}
    </div>
  );
};
