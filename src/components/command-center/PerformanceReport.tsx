import React from 'react';
import { ReportResponse } from '../../types';
import { GlassCard } from '../GlassCard';
import {
  ResponsiveContainer,
  BarChart as ReBarChart, Bar as ReBar,
  LineChart as ReLineChart, Line as ReLine,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { PALETTE } from '../../constants/theme';

interface PerformanceReportProps {
  reportData: ReportResponse;
  includeCharts: boolean;
  showAdvice: boolean;
  showCompetitors: boolean;
}

const renderCompetitorBlock = (data: ReportResponse['aiCompetitorAnalysis'], title: string) => {
  if (!data) return null;
  const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  return (
    <GlassCard className="p-6 mb-6">
      <h4 className="text-lg font-bold text-cyan-400 mb-4">{title}</h4>
      {isObject ? (
        <div className="space-y-4">
          {Array.isArray(data.inferred_actions) && data.inferred_actions.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">🔍 Inferred Actions</p>
              <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                {data.inferred_actions.map((action: string, idx: number) => <li key={idx}>{action}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(data.actionable_steps) && data.actionable_steps.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-400 mb-2">📌 Recommended Actions</p>
              <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                {data.actionable_steps.map((step: string, idx: number) => <li key={idx}>{step}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : <p className="text-sm text-gray-300">{String(data)}</p>}
    </GlassCard>
  );
};

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

export const PerformanceReport: React.FC<PerformanceReportProps> = ({ reportData, includeCharts, showAdvice, showCompetitors }) => {
  const perf = reportData.performance || {};
  const ads = perf;
  const googleKpi = perf.googleAdsKpis || [];

  // Create current/previous maps from googleAdsKpis for the charts/calculations
  const current: any = {};
  const previous: any = {};
  googleKpi.forEach((k: any) => {
    const key = k.metric.toLowerCase().replace(/ /g, '_').replace('cost_per_lead_(₹)', 'cost_per_lead').replace('cost_(₹)', 'cost');
    current[key] = k.currentValue;
    previous[key] = k.previousValue;
  });

  if (googleKpi.length === 0 && reportData.tableData1) {
      // Re-map from tableData1 if necessary
  }

  if (googleKpi.length === 0) return null;

  const formatChange = (cur: number | undefined, prev: number | undefined) => {
    if (cur === undefined || prev === undefined || prev === 0) return "N/A";
    const change = ((cur - prev) / prev) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const kpiRows = [
    ["Impressions", current.impressions?.toLocaleString() || "0", previous.impressions?.toLocaleString() || "0", formatChange(current.impressions, previous.impressions)],
    ["Clicks", current.clicks?.toLocaleString() || "0", previous.clicks?.toLocaleString() || "0", formatChange(current.clicks, previous.clicks)],
    ["Cost", `₹${current.cost?.toLocaleString() || "0"}`, `₹${previous.cost?.toLocaleString() || "0"}`, formatChange(current.cost, previous.cost)],
    ["Leads", current.conversions?.toLocaleString() || "0", previous.conversions?.toLocaleString() || "0", formatChange(current.conversions, previous.conversions)],
    ["CPA", `₹${current.cost_per_lead?.toFixed(2) || "0"}`, `₹${previous.cost_per_lead?.toFixed(2) || "0"}`, formatChange(current.cost_per_lead, previous.cost_per_lead)],
  ];

  const blocks = [
    {
      title: "Google Ads KPI Summary",
      sentence: reportData.tableExplanations?.kpi_overview || "Consolidated performance metrics.",
      headers: ["Metric", "Current", "Previous", "Change"],
      rows: kpiRows,
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <ReBarChart data={[{ name: 'Impr', cur: current.impressions, prev: previous.impressions }, { name: 'Clicks', cur: current.clicks, prev: previous.clicks }, { name: 'Leads', cur: current.conversions, prev: previous.conversions }]}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
            <YAxis stroke="#9CA3AF" fontSize={10} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #00D4FF', borderRadius: '8px' }}
              itemStyle={{ color: '#00D4FF' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <ReBar dataKey="cur" name="Current" fill={PALETTE.cyan} radius={[4, 4, 0, 0]} />
            <ReBar dataKey="prev" name="Previous" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      )
    }
  ];

  if (ads.topCampaigns?.length > 0) {
    blocks.push({
      title: "Google Top Campaigns",
      sentence: reportData.tableExplanations?.top_campaigns || "High-performing marketing campaigns by spend and conversion.",
      headers: ["Campaign", "Cost", "Leads", "CPA"],
      rows: ads.topCampaigns.slice(0, 5).map((c: any) => [c.campaign, c.cost, c.leads, c.cpa]),
    });
  }

  if (ads.topKeywords?.length > 0) {
    blocks.push({
      title: "Google Top Keywords",
      sentence: reportData.tableExplanations?.top_keywords || "Search terms driving the highest engagement volume.",
      headers: ["Keyword", "Impr", "Clicks", "CTR"],
      rows: ads.topKeywords.slice(0, 5).map((kw: any) => [kw.keyword, kw.impressions?.toLocaleString(), kw.clicks?.toLocaleString(), kw.ctr]),
    });
  }

  const metaKpi = reportData.metaKpi || {};
  const metaCurrent = metaKpi.current || {};
  const metaPrevious = metaKpi.previous || {};
  const metaCampaigns = reportData.metaCampaigns || [];
  const metaAdsets = reportData.metaAdsets || [];
  const metaDevices = reportData.metaDevices || [];
  const metaDaily = reportData.metaDaily || [];

  if (Object.keys(metaCurrent).length > 0 || metaCampaigns.length > 0) {
    const metaKpiRows = [
      ["Impressions", metaCurrent.impressions?.toLocaleString() || "0", metaPrevious.impressions?.toLocaleString() || "0", formatChange(metaCurrent.impressions, metaPrevious.impressions)],
      ["Clicks", metaCurrent.clicks?.toLocaleString() || "0", metaPrevious.clicks?.toLocaleString() || "0", formatChange(metaCurrent.clicks, metaPrevious.clicks)],
      ["Cost (₹)", `₹${metaCurrent.spend?.toLocaleString() || "0"}`, `₹${metaPrevious.spend?.toLocaleString() || "0"}`, formatChange(metaCurrent.spend, metaPrevious.spend)],
      ["Leads", metaCurrent.leads?.toLocaleString() || "0", metaPrevious.leads?.toLocaleString() || "0", formatChange(metaCurrent.leads, metaPrevious.leads)],
      ["CTR (%)", metaCurrent.ctr?.toFixed(2) || "0", metaPrevious.ctr?.toFixed(2) || "0", formatChange(metaCurrent.ctr, metaPrevious.ctr)],
    ];

    blocks.push({
      title: "Meta Ads KPI Summary",
      sentence: reportData.tableExplanations?.meta_kpi_overview || "Performance metrics from Meta Ads campaigns.",
      headers: ["Metric", "Current", "Previous", "Change"],
      rows: metaKpiRows,
      chart: includeCharts ? (
        <ResponsiveContainer width="100%" height={200}>
          <ReLineChart data={metaDaily}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
            <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={10} />
            <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={10} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #00D4FF', borderRadius: '8px' }}
              itemStyle={{ color: '#00D4FF' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <ReLine yAxisId="left" type="monotone" dataKey="spend" stroke={PALETTE.cyan} strokeWidth={2} name="Spend (₹)" dot={false} />
            <ReLine yAxisId="right" type="monotone" dataKey="impressions" stroke={PALETTE.violet} strokeWidth={2} name="Impressions" dot={false} />
          </ReLineChart>
        </ResponsiveContainer>
      ) : null
    });

    if (metaCampaigns.length > 0) {
      blocks.push({
        title: "Meta Top Campaigns",
        sentence: reportData.tableExplanations?.meta_campaigns || "Campaigns sorted by spend and leads.",
        headers: ["Campaign", "Impressions", "Cost", "Leads", "Cost/Lead"],
        rows: metaCampaigns.slice(0, 5).map((c: any) => [
          c.campaign,
          c.impressions?.toLocaleString() || "0",
          `₹${(c.spend || 0).toFixed(2)}`,
          c.leads?.toLocaleString() || "0",
          `₹${(c.leads > 0 ? c.spend / c.leads : 0).toFixed(2)}`
        ]),
      });
    }

    if (metaAdsets.length > 0) {
      blocks.push({
        title: "Meta Ad Sets (Targeting)",
        sentence: reportData.tableExplanations?.meta_adsets || "Audience and interest targeting performance.",
        headers: ["Ad Set", "Impressions", "Cost", "Leads", "Cost/Lead"],
        rows: metaAdsets.slice(0, 5).map((as: any) => [
          as.adset,
          as.impressions?.toLocaleString() || "0",
          `₹${(as.spend || 0).toFixed(2)}`,
          as.leads?.toLocaleString() || "0",
          `₹${(as.leads > 0 ? as.spend / as.leads : 0).toFixed(2)}`
        ]),
      });
    }

    if (metaDevices.length > 0) {
      blocks.push({
        title: "Meta Device Breakdown",
        sentence: reportData.tableExplanations?.meta_devices || "Performance by device type.",
        headers: ["Device", "Impressions", "Clicks", "Cost"],
        rows: metaDevices.map((d: any) => [
          d.device.replace(/_/g, ' '),
          d.impressions?.toLocaleString() || "0",
          d.clicks?.toLocaleString() || "0",
          `₹${(d.spend || 0).toFixed(2)}`
        ]),
      });
    }
  }

  const adviceMap: Record<string, string[]> = (reportData.sectionAdvice as any) || {};

  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        let adviceKey = '';
        if (b.title.includes('Google Ads KPI')) adviceKey = 'kpi_advice';
        else if (b.title.includes('Google Top Campaigns')) adviceKey = 'campaign_advice';
        else if (b.title.includes('Google Top Keywords')) adviceKey = 'keyword_advice';
        else if (b.title.includes('Meta Ads KPI')) adviceKey = 'meta_kpi_advice';
        else if (b.title.includes('Meta Top Campaigns')) adviceKey = 'meta_campaign_advice';
        else if (b.title.includes('Meta Ad Sets')) adviceKey = 'meta_adset_advice';
        else if (b.title.includes('Meta Device')) adviceKey = 'meta_device_advice';

        const adviceList = adviceMap[adviceKey] || [];

        return (
          <div key={i}>
            {renderStandardBlock(b.title, b.sentence, b.headers, b.rows, includeCharts ? b.chart : undefined)}
            {showAdvice && adviceList.length > 0 && (
              <div className="mt-[-1rem] mb-6 mx-6 p-4 bg-violet-500/5 border-l-4 border-violet-500 rounded-r-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">📌 Performance Protocol</p>
                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                  {adviceList.map((adv, idx) => <li key={idx}>{adv}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      })}
      {showCompetitors && reportData.aiCompetitorAnalysis && renderCompetitorBlock(reportData.aiCompetitorAnalysis, "Performance Competitor Analysis")}
    </div>
  );
};
