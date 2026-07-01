import React from 'react';
import { ReportResponse } from '../../types';
import { GlassCard } from '../GlassCard';
import {
  ResponsiveContainer,
  BarChart as ReBarChart, Bar as ReBar,
  LineChart as ReLineChart, Line as ReLine,
  PieChart as RePieChart, Pie as RePie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { PALETTE, CHART_COLORS } from '../../constants/theme';

interface SEOReportProps {
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
      <h4 className="text-lg font-bold text-white mb-4">{title}</h4>
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

export const SEOReport: React.FC<SEOReportProps> = ({ reportData, includeCharts, showAdvice, showCompetitors }) => {
  const tableExplanations = reportData.tableExplanations || {};

  const topCountries = reportData.topCountries || [];
  const userActivity = reportData.userActivityOverTime || [];
  const topPages = reportData.topPageTitles || [];
  const eventsByEventName = reportData.eventsByEventName || [];
  const sessionsByChannel = reportData.sessionsByChannel || [];
  const keyEventsByPlatform = reportData.keyEventsByPlatform || [];

  const blocks = [
    {
      title: "Active users by country",
      sentence: tableExplanations.active_users_by_country || "Country-level active users.",
      headers: ["Country", "Users"],
      rows: topCountries.slice(0, 8).map(r => [r.country, r.users?.toLocaleString() || "0"]),
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <ReBarChart data={topCountries.slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" stroke="#9CA3AF" fontSize={10} />
            <YAxis type="category" dataKey="country" width={100} stroke="#9CA3AF" fontSize={10} />
            <Tooltip
              contentStyle={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#FFFFFF' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <ReBar dataKey="users" name="Active Users" fill={PALETTE.cyan} radius={[0, 4, 4, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      )
    },
    {
      title: "User activity over time",
      sentence: tableExplanations.user_activity_over_time || "Daily user trends.",
      headers: ["Date", "Users"],
      rows: userActivity.slice(-10).map(r => [r.date, r.users?.toLocaleString() || "0"]),
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <ReLineChart data={userActivity}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
            <YAxis stroke="#9CA3AF" fontSize={10} />
            <Tooltip
              contentStyle={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#FFFFFF' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <ReLine type="monotone" dataKey="users" name="Active Users" stroke={PALETTE.violet} strokeWidth={2} dot={false} />
          </ReLineChart>
        </ResponsiveContainer>
      )
    },
    {
      title: "Views by page title",
      sentence: tableExplanations.views_by_page_title || "Top performing pages by title.",
      headers: ["Page title", "Views"],
      rows: topPages.slice(0, 8).map(r => [r.title, r.views?.toLocaleString() || "0"]),
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <ReBarChart data={topPages.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="title" stroke="#9CA3AF" fontSize={10} hide={false} />
            <YAxis stroke="#9CA3AF" fontSize={10} />
            <Tooltip
              contentStyle={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#FFFFFF' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <ReBar dataKey="views" name="Page Views" fill={PALETTE.emerald} radius={[4, 4, 0, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      )
    },
    {
      title: "Sessions by channel",
      sentence: tableExplanations.sessions_by_channel || "Traffic distribution by source channel.",
      headers: ["Channel", "Sessions"],
      rows: sessionsByChannel.slice(0, 8).map(r => [r.channel, r.sessions?.toLocaleString() || "0"]),
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <RePieChart>
            <RePie data={sessionsByChannel} dataKey="sessions" nameKey="channel" cx="50%" cy="50%" outerRadius={80}>
              {sessionsByChannel.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </RePie>
            <Tooltip
              contentStyle={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#FFFFFF' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </RePieChart>
        </ResponsiveContainer>
      )
    },
    {
      title: "Event count by event name",
      sentence: tableExplanations.event_count_by_event_name || "Most fired user interactions.",
      headers: ["Event", "Count"],
      rows: eventsByEventName.slice(0, 8).map(e => [e.eventName, e.count?.toLocaleString() || "0"]),
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <ReBarChart data={eventsByEventName.slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" stroke="#9CA3AF" fontSize={10} />
            <YAxis type="category" dataKey="eventName" width={120} stroke="#9CA3AF" fontSize={10} />
            <Tooltip
              contentStyle={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#FFFFFF' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <ReBar dataKey="count" name="Event Count" fill={PALETTE.amber} radius={[0, 4, 4, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      )
    },
    {
      title: "Key events by platform",
      sentence: tableExplanations.key_events_by_platform || "Platform-wise conversion events.",
      headers: ["Platform", "Key events"],
      rows: keyEventsByPlatform.slice(0, 8).map(k => [k.platform, k.keyEvents?.toLocaleString() || "0"]),
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <RePieChart>
            <RePie data={keyEventsByPlatform} dataKey="keyEvents" nameKey="platform" cx="50%" cy="50%" outerRadius={80}>
              {keyEventsByPlatform.map((_, idx) => (
                <Cell key={`platform-${idx}`} fill={CHART_COLORS[(idx + 2) % CHART_COLORS.length]} />
              ))}
            </RePie>
            <Tooltip
              contentStyle={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#FFFFFF' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </RePieChart>
        </ResponsiveContainer>
      )
    }
  ];

  const adviceMap: Record<string, string[]> = (reportData.sectionAdvice as any) || {};

  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        let adviceKey = '';
        if (b.title.includes('country')) adviceKey = 'country_advice';
        else if (b.title.includes('activity')) adviceKey = 'activity_advice';
        else if (b.title.includes('page title')) adviceKey = 'page_title_advice';
        else if (b.title.includes('channel')) adviceKey = 'channel_advice';
        else if (b.title.includes('Event count')) adviceKey = 'event_advice';
        else if (b.title.includes('Key events')) adviceKey = 'platform_advice';
        const adviceList = adviceMap[adviceKey] || [];

        return (
          <div key={i}>
            {renderStandardBlock(b.title, b.sentence, b.headers, b.rows, includeCharts ? b.chart : undefined)}
            {showAdvice && adviceList.length > 0 && (
              <div className="mt-[-1rem] mb-6 mx-6 p-4 bg-white/5 border-l-4 border-white rounded-r-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white mb-2">📌 Strategic Protocol</p>
                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                  {adviceList.map((adv, idx) => <li key={idx}>{adv}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      })}
      {showCompetitors && reportData.aiCompetitorAnalysis && renderCompetitorBlock(reportData.aiCompetitorAnalysis, "SEO Competitor Analysis")}
    </div>
  );
};
