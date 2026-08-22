import React, { useState } from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Cell,
  LineChart, Line,
  PieChart, Pie,
  Legend
} from 'recharts';
import * as Icons from 'lucide-react';
import { MarketingReport, SectionType } from '../types';

import { CompetitorRadar } from './CompetitorRadar';
import { WorldMap } from './WorldMap';
import ShareDialog from './ShareDialog';

interface ReportViewsProps {
  report: MarketingReport;
  activeSection: SectionType;
  isSharedMode?: boolean;
}

const COLORS = ['#FFFFFF', '#9CA3AF', '#D1D5DB', '#4B5563', '#1F2937', '#6B7280', '#374151'];

// Custom Tooltip component for a high-fidelity "Neural" look
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111111] border border-white/10 p-3 rounded-lg shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill || '#FFFFFF' }} />
            <p className="text-xs font-display font-bold text-white">
              <span className="text-gray-400 font-medium mr-1">{entry.name}:</span>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const DynamicIcon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const IconComponent = (Icons as any)[name] || Icons.Activity;
  return <IconComponent size={size} />;
};

const getCompetitorStatus = (comp: any) => {
  const name = comp.name?.toLowerCase() || "";
  const allText = JSON.stringify(comp).toLowerCase();

  if (name.includes('thomas') || name.includes('akbar') || allText.includes('1.9m')) {
    return { level: 'Very High', color: 'bg-white', icon: '⚪', text: 'text-white' };
  }
  if (name.includes('sotc') || name.includes('hyderabad') || allText.includes('dated') || allText.includes('friction')) {
    return { level: 'Medium', color: 'bg-gray-400', icon: '⚪', text: 'text-gray-400' };
  }
  return { level: 'Low', color: 'bg-gray-600', icon: '⚪', text: 'text-gray-600' };
};

export default function ReportViews({ report, activeSection, isSharedMode }: ReportViewsProps) {
  const isReports = activeSection === "Reports";
  const isGraphs = activeSection === "Graphs";
  const isBnBReport = activeSection === "BnB Report";
  const isClientReport = activeSection === "Client Report";

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  if (!report) {
    return (
      <div className="p-12 text-center glass-panel rounded-2xl max-w-xl mx-auto my-12 border border-dashed border-white/10">
        <Icons.Activity size={32} className="text-white mx-auto mb-4 animate-pulse" />
        <h3 className="font-display font-medium text-lg text-white mb-2">Neural Feed Interrupted</h3>
        <p className="text-xs text-white/40 leading-relaxed font-sans">Awaiting telemetry synchronization from the site node.</p>
      </div>
    );
  }

  // Structure from BNB fast
  const renderKpiGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {report.kpis.slice(0, 6).map((kpi, idx) => (
        <div key={idx} className="glass-panel rounded-2xl p-5 flex flex-col justify-between group relative overflow-hidden h-32">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">{kpi.label}</span>
            <div className="text-2xl font-display font-bold text-white tracking-tight">{kpi.value}</div>
          </div>
          <div className="mt-auto flex items-center gap-1">
             <span className="text-[10px] font-mono font-bold text-white">
               {kpi.isPositive ? '▲' : '▼'} {Math.abs(kpi.change)}%
             </span>
          </div>
          <div className="absolute right-4 top-5 text-white opacity-10 group-hover:opacity-30 transition-opacity">
            <DynamicIcon name={kpi.icon} size={24} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div id="report-content" className="space-y-10 pb-20 animate-in fade-in duration-1000">

      {/* 1. Header (UI from bnb.ai) */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center px-3 py-1 rounded-md bg-white/10 border border-white/20">
              <span className="text-[9px] font-mono font-bold text-white uppercase tracking-[0.2em]">Active Division: {report.category}</span>
            </div>
            {isClientReport && !isSharedMode && (
              <button
                onClick={() => setIsShareDialogOpen(true)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors border border-white/10"
                title="Share Report"
              >
                <Icons.Share2 size={14} />
              </button>
            )}
          </div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">
            {report.siteName} {activeSection}
          </h1>
          <div className="flex items-center gap-2 text-gray-500 text-xs font-mono">
             <Icons.Calendar size={12} className="text-white" />
             <span>Scanning Period: {report.dateRange.start} → {report.dateRange.end}</span>
          </div>
        </div>

        <div className="text-right hidden lg:block">
           <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Compiled At: {new Date(report.generatedAt).toLocaleString()}</p>
           <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mt-1">Hash Vector: {report.id}</p>
        </div>
      </div>

      {/* SYSTEM DIAGNOSTIC (Visual Debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 border border-white/20 rounded-lg bg-white/5 flex gap-4 text-[10px] font-mono text-white">
          <span>[SYSTEM_LINK] SECTION: {activeSection}</span>
          <span>[SYSTEM_LINK] KPI_COUNT: {report.kpis?.length || 0}</span>
          <span>[SYSTEM_LINK] SEO_NODE: {report.seo ? 'ONLINE' : 'OFFLINE'}</span>
          {report.seo && (
            <>
              <span>[SYSTEM_LINK] GEO_NODES: {report.seo.activeUsersByCountry?.length || 0}</span>
              <span>[SYSTEM_LINK] TEMPORAL_NODES: {report.seo.userActivityOverTime?.length || 0}</span>
            </>
          )}
        </div>
      )}

      {/* 2. KPI Ribbon - Removed from Reports mode */}
      {!isReports && report.kpis && renderKpiGrid()}

      {/* 3. Main Data Area (Combined Structure) */}
      <div className="space-y-12">
        {/* EXECUTIVE NARRATIVE - Removed from Reports mode */}
        {!isGraphs && !isReports && (
          <div className="glass-panel p-8 rounded-[2rem] border-l-4 border-l-white bg-[#111111] shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/10 rounded-xl text-white">
                  <Icons.Sparkles size={20} />
                </div>
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-widest">Executive Briefing</h3>
              </div>
            <p className="text-lg text-white/80 leading-relaxed font-serif italic">
              "{report.executiveSummary}"
            </p>
          </div>
        )}

        {/* Dynamic Category Router */}
        {report.category === 'Combined Intelligence' && (
          <div className="space-y-16">
            {report.seo && (
              <div className="space-y-8">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="p-2 rounded-lg bg-white/10 text-white">
                    <Icons.Search size={20} />
                  </div>
                  <h2 className="text-xl font-display font-bold text-white uppercase tracking-widest">Organic Intelligence (SEO)</h2>
                </div>
                <SeoReportView data={report.seo} section={activeSection} radarData={report.radarData} report={report} hideRadar />
              </div>
            )}

            {report.performance && (
              <div className="space-y-8 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="p-2 rounded-lg bg-white/10 text-white">
                    <Icons.Zap size={20} />
                  </div>
                  <h2 className="text-xl font-display font-bold text-white uppercase tracking-widest">Performance Intelligence (Ads)</h2>
                </div>
                <PerformanceReportView data={report.performance} section={activeSection} radarData={report.radarData} report={report} hideRadar />
              </div>
            )}

            {!isGraphs && !isReports && isBnBReport && (
              <div className="mt-12 pt-12 border-t border-white/10">
                <CompetitorRadar
                  data={report.radarData}
                  siteName={report.siteName}
                  siteData={report.radar_self}
                />
              </div>
            )}
          </div>
        )}

        {report.category === 'SEO' && report.seo && (
          <SeoReportView data={report.seo} section={activeSection} radarData={report.radarData} report={report} />
        )}
        {report.category === 'Performance Marketing' && report.performance && (
          <PerformanceReportView data={report.performance} section={activeSection} radarData={report.radarData} report={report} />
        )}
        {report.category === 'Social Media Marketing' && report.social && (
          <SocialReportView data={report.social} section={activeSection} />
        )}

        {/* ROADMAP SECTION - MOVED TO BOTTOM */}
        {isBnBReport && report.improvement_roadmap && (
          <div className="glass-panel p-10 rounded-[2.5rem] border border-white/20 bg-[#111111] shadow-2xl space-y-8">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <div className="p-3 bg-white/10 rounded-2xl text-white">
                <Icons.Map size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-white uppercase tracking-widest">Strategic Improvement Roadmap</h3>
                <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-1">Growth vector trajectory mapping</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl italic text-white/80 text-sm leading-relaxed">
              {report.improvement_roadmap.summary}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Icons.ArrowUpRight size={14} /> Core Strengths
                </div>
                <div className="space-y-2">
                  {report.improvement_roadmap.strengths.map((s, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-[11px] text-white/60">{s}</div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-400 text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Icons.ArrowDownRight size={14} /> Identified Weaknesses
                </div>
                <div className="space-y-2">
                  {report.improvement_roadmap.weaknesses.map((w, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-[11px] text-white/60">{w}</div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Icons.Zap size={14} /> Strategic Opportunities
                </div>
                <div className="space-y-2">
                  {report.improvement_roadmap.opportunities.map((o, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-[11px] text-white/60">{o}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-4">Recommended Tactical Actions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.improvement_roadmap.actions.map((action, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl group hover:border-white/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${action.effort === 'High' ? 'bg-white/10 text-white' : action.effort === 'Medium' ? 'bg-white/10 text-white' : 'bg-white/10 text-white'}`}>
                        {action.effort} EFFORT
                      </span>
                    </div>
                    <h5 className="text-xs font-display font-bold text-white mb-1">{action.title}</h5>
                    <p className="text-[10px] text-white/40 font-mono">Target: {action.target}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ADVICE SECTION - Removed from Reports mode */}
        {/* ADVICE SECTION - Neural Strategy Markers */}
        {isBnBReport && report.adviceList && report.adviceList.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Icons.Zap size={20} className="text-white" />
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-widest">Neural Strategy Markers</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {report.adviceList.map((adv, i) => (
                <div key={i} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/20 transition-all bg-[#111111]">
                  <div>
                    <h4 className="font-display font-bold text-sm text-white mb-2">{typeof adv === 'string' ? 'Insight node' : adv.title}</h4>
                    <p className="text-xs text-white/50 leading-relaxed">{typeof adv === 'string' ? adv : adv.description}</p>
                    {typeof adv !== 'string' && adv.target && (
                      <div className="mt-4 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                        <p className="text-[10px] text-white/80 font-mono uppercase tracking-wider">Target: {adv.target}</p>
                      </div>
                    )}
                  </div>
                  {typeof adv !== 'string' && (
                    <div className="mt-6 flex items-center gap-2 pt-4 border-t border-white/5">
                       <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${adv.priority === 'High' ? 'bg-white/10 text-white' : 'bg-white/10 text-white'}`}>{adv.priority} PRIORITY</span>
                       <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-gray-500 uppercase">{adv.impact} IMPACT</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REMOVED STANDALONE STATISTICAL VECTOR */}

        {/* Client Auth Badge */}
      {isClientReport && (
        <div className="p-8 glass-panel rounded-[2rem] flex items-center justify-between border-white/20 bg-white/5">
          <div>
            <h4 className="font-display font-bold text-white uppercase tracking-widest">Authenticated Client Briefing</h4>
            <p className="text-xs text-white/40 mt-1 font-mono uppercase">Verified Analytical Vector: {report.id.substring(0, 16)}</p>
          </div>
          <Icons.CheckCircle className="text-white" size={48} />
        </div>
      )}

      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        siteId={report.site_id || ''}
        dateRange={{ start: report.dateRange.start, end: report.dateRange.end }}
      />
    </div>
    </div>
  );
}

/* --- SEO VIEW --- */
function SeoReportView({ data, section, radarData, report, hideRadar }: { data: any, section: SectionType, radarData: any[], report: MarketingReport, hideRadar?: boolean }) {
  const isReports = section === "Reports";
  const isGraphs = section === "Graphs";
  const isBnB = section === "BnB Report";
  const isClient = section === "Client Report";

  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("all");

  if (isGraphs) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <GraphBlock title="Geographical Engagement" data={data.activeUsersByCountry} dataKey="users" nameKey="country" type="bar" />
        <GraphBlock title="Temporal Activity Flux" data={data.userActivityOverTime} dataKey="users" nameKey="date" type="line" />
        <GraphBlock title="Search Query Resonance" data={data.topKeywords} dataKey="clicks" nameKey="keyword" type="bar" horizontal />
        <GraphBlock title="Content Resonance" data={data.viewsByPageTitle} dataKey="views" nameKey="pageTitle" type="bar" horizontal />
        <GraphBlock title="Source Node Distribution" data={data.sessionsByChannel} dataKey="sessions" nameKey="channel" type="pie" />
        <GraphBlock title="Event Density" data={data.eventCountByEventName} dataKey="count" nameKey="event" type="bar" />
        <GraphBlock title="Hardware Vector Access" data={data.keyEventsByPlatform} dataKey="events" nameKey="platform" type="pie" />
      </div>
    );
  }

  const showVisuals = !isReports;

  return (
    <div className="space-y-6">
      {/* 0. SEO KPI Summary (Added for BnB strategy markers) */}
      <DataBlock
        title="SEO Strategy Summary"
        icon={Icons.Target}
        insight={data.activeUsersInsight}
        advice={isBnB ? data.sectionAdvice.kpi_advice : []}
        adviceTitle="OVERALL SEO STRATEGY"
        fullWidth
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-28">
            <span className="text-[9px] uppercase text-gray-500 font-mono font-bold tracking-widest">Visibility Index</span>
            <div className="text-xl font-display font-bold text-white">High</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-28">
            <span className="text-[9px] uppercase text-gray-500 font-mono font-bold tracking-widest">Growth Vector</span>
            <div className="text-xl font-display font-bold text-white">Active</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-28">
            <span className="text-[9px] uppercase text-gray-500 font-mono font-bold tracking-widest">Market Reach</span>
            <div className="text-xl font-display font-bold text-white">Global</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-28">
            <span className="text-[9px] uppercase text-gray-500 font-mono font-bold tracking-widest">Search Authority</span>
            <div className="text-xl font-display font-bold text-white">Optimal</div>
          </div>
        </div>
      </DataBlock>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Column 1 */}
        <div className="space-y-6">
          {/* 1. Active Users (Small) */}
          <DataBlock title="Active Users By Country" icon={Icons.Globe} insight={data.activeUsersInsight} advice={isBnB ? data.sectionAdvice.demographics : []} adviceTitle="DEMOGRAPHIC STRATEGY">
            <div className="space-y-8">
              <DataTable headers={['Country', 'Nodes']} rows={data.activeUsersByCountry.map((c: any) => [c.country, c.users?.toLocaleString() || "0"])} />
              {showVisuals && (
                <div className="w-full">
                  <WorldMap data={data.activeUsersByCountry} />
                </div>
              )}
            </div>
          </DataBlock>

          {/* 4. Page Views (Small) */}
          <DataBlock title="Views By Page Title" icon={Icons.Layers} insight={data.viewsByPageInsight} advice={isBnB ? data.sectionAdvice.pages : []} adviceTitle="PAGE OPTIMIZATION">
             <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-2' : ''} gap-6 items-stretch`}>
              <DataTable headers={['Page Title', 'Views']} rows={data.viewsByPageTitle.map((p: any) => [p.pageTitle, p.views?.toLocaleString() || "0"])} />
              {showVisuals && (
                <div className="h-48 bg-black/20 rounded-xl p-2 border border-white/5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.viewsByPageTitle.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={8} />
                      <YAxis dataKey="pageTitle" type="category" width={80} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8 }} />
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="views" name="Views" radius={[0, 4, 4, 0]} barSize={10} fill="#FFFFFF" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </DataBlock>

          {/* 6. Events (Small) */}
          <DataBlock title="Event Density" icon={Icons.Activity} insight={data.eventInsight} advice={isBnB ? data.sectionAdvice.events : []} adviceTitle="EVENT MONITORING">
             <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-2' : ''} gap-6 items-stretch`}>
              <DataTable headers={['Event', 'Count']} rows={data.eventCountByEventName.map((e: any) => [e.event, e.count?.toLocaleString() || "0"])} />
              {showVisuals && (
                <div className="h-48 bg-black/20 rounded-xl p-2 border border-white/5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.eventCountByEventName.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={8} />
                      <YAxis dataKey="event" type="category" width={80} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8 }} />
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} barSize={10} fill="#FFFFFF" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </DataBlock>
        </div>

        {/* Column 2 */}
        <div className="space-y-6">
          {/* 2. Timeline (Small) */}
          <DataBlock title="User Activity Timeline" icon={Icons.Calendar} insight={data.userActivityInsight} advice={isBnB ? data.sectionAdvice.timeline : []} adviceTitle="TIMELINE STRATEGY">
            <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-2' : ''} gap-6 items-stretch`}>
              <DataTable headers={['Date', 'Users']} rows={data.userActivityOverTime.map((a: any) => [a.date, a.users?.toLocaleString() || "0"])} />
              {showVisuals && (
                <div className="h-48 bg-black/20 rounded-xl p-2 border border-white/5">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.userActivityOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={8} interval="preserveStartEnd" minTickGap={30} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={8} />
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="users" name="Active Members" stroke="#FFFFFF" strokeWidth={2} dot={data.userActivityOverTime.length < 31 ? { fill: '#FFFFFF', r: 2 } : false} activeDot={{ r: 4, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </DataBlock>

          {/* 5. Sessions (Small) */}
          <DataBlock title="Sessions By Channel" icon={Icons.Users} insight={data.sessionsInsight} advice={isBnB ? data.sectionAdvice.channels : []} adviceTitle="CHANNEL ALLOCATION">
             <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-2' : ''} gap-6 items-stretch`}>
              <DataTable headers={['Channel', 'Sessions']} rows={data.sessionsByChannel.map((s: any) => [s.channel, s.sessions?.toLocaleString() || "0"])} />
              {showVisuals && (
                <div className="h-48 bg-black/20 rounded-xl p-2 border border-white/5 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.sessionsByChannel.slice(0, 5)} dataKey="sessions" nameKey="channel" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                        {data.sessionsByChannel.slice(0, 5).map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </DataBlock>

          {/* 7. Platform Access (Small) */}
          <DataBlock title="Hardware Vector Access" icon={Icons.Database} insight={data.platformInsight} advice={isBnB ? data.sectionAdvice.platforms : []} adviceTitle="PLATFORM BLUEPRINTS">
             <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-2' : ''} gap-6 items-stretch`}>
              <DataTable headers={['Platform', 'Events']} rows={data.keyEventsByPlatform.map((p: any) => [p.platform, p.events?.toLocaleString() || "0"])} />
              {showVisuals && (
                <div className="h-48 bg-black/20 rounded-xl p-2 border border-white/5 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.keyEventsByPlatform.slice(0, 4)} dataKey="events" nameKey="platform" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                        {data.keyEventsByPlatform.slice(0, 4).map((_: any, index: number) => <Cell key={index} fill={COLORS[(index+3) % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </DataBlock>
        </div>
      </div>

      {/* 3. Keywords (Full Width) */}
      <DataBlock title="Top Search Keywords" icon={Icons.Search} insight={data.topKeywordsInsight} advice={isBnB ? data.sectionAdvice.keywords : []} adviceTitle="KEYWORD STRATEGY" fullWidth>
         <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-12' : ''} gap-6 items-center`}>
          <div className={showVisuals ? "xl:col-span-8" : ""}>
            <DataTable headers={['Keyword', 'Clicks', 'CTR', 'Pos']} rows={data.topKeywords.map((k: any) => [k.keyword, k.clicks?.toLocaleString() || "0", k.ctr, k.position])} />
          </div>
          {showVisuals && (
            <div className="xl:col-span-4 h-56 bg-black/20 rounded-xl p-4 border border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.topKeywords.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={8} />
                      <YAxis dataKey="keyword" type="category" width={80} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8 }} />
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="clicks" name="Clicks" radius={[0, 4, 4, 0]} barSize={10} fill="#FFFFFF" />
                    </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </DataBlock>

      {!hideRadar && !isClient && !isReports && isBnB && (
        <div className="mt-12">
          <CompetitorRadar
            data={radarData}
            siteName={report.siteName}
            siteData={report.radar_self}
          />
        </div>
      )}

      {/* Competitor Breakdown */}
      {!isClient && data.aiCompetitorAnalysis?.competitor_breakdown?.length > 0 && (
        <div className="mt-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-white">
                <Icons.Search size={20} />
              </div>
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-widest">Competitor Deep Dive</h3>
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase">Filter:</span>
              <select
                value={selectedCompetitor}
                onChange={(e) => setSelectedCompetitor(e.target.value)}
                className="bg-[#111111] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/50 transition-all cursor-pointer"
              >
                <option value="all">All Adversaries</option>
                {data.aiCompetitorAnalysis.competitor_breakdown.map((c: any, i: number) => (
                  <option key={i} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.aiCompetitorAnalysis.competitor_breakdown
              .filter((c: any) => selectedCompetitor === "all" || c.name === selectedCompetitor)
              .map((comp: any, idx: number) => {
                const status = getCompetitorStatus(comp);
                const discoveryKw = comp.discovery_query || "Local Search Discovery";

                return (
                  <div key={idx} className="glass-panel p-6 rounded-2xl border-l-4 border-l-white bg-[#111111] relative group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex flex-col">
                        <h4 className="font-display font-bold text-white text-sm uppercase tracking-widest">{comp.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${status.color} animate-pulse`} />
                          <span className={`text-[9px] font-mono uppercase tracking-tighter ${status.text} opacity-80`}>
                            Status: Active | Activity: {status.level}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          <span className="text-[8px] text-gray-500 font-mono uppercase tracking-tighter">
                            Trigger: {discoveryKw}
                          </span>
                        </div>
                        {comp.url && (
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20"
                            title="Visit Website"
                          >
                            <Icons.ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-500 uppercase block mb-2">Inferred Actions</span>
                    <div className="space-y-2">
                      {(Array.isArray(comp.inferred_actions) ? comp.inferred_actions : [comp.inferred_actions]).map((action: string, i: number) => (
                        <p key={i} className="text-xs text-white/70 leading-relaxed font-sans">{action}</p>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-2 border-t border-white/5">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-green-500 uppercase block mb-2">Strengths</span>
                      <ul className="space-y-1.5">
                        {(Array.isArray(comp.strengths) ? comp.strengths : [comp.strengths]).map((s: string, i: number) => (
                          <li key={i} className="text-[11px] text-white/50 leading-tight flex gap-1.5">
                             <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                             {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-500 uppercase block mb-2">Weaknesses</span>
                      <ul className="space-y-1.5">
                        {(Array.isArray(comp.weaknesses) ? comp.weaknesses : [comp.weaknesses]).map((w: string, i: number) => (
                          <li key={i} className="text-[11px] text-white/50 leading-tight flex gap-1.5">
                             <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                             {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
          {data.aiCompetitorAnalysis.overall_threat_summary && (
            <p className="text-xs text-gray-500 italic font-mono bg-white/5 p-4 rounded-xl border border-white/5">
              Neural Summary: {data.aiCompetitorAnalysis.overall_threat_summary}
            </p>
          )}
        </div>
      )}

      {/* Self Gap Analysis */}
      {!isClient && data.aiCompetitorAnalysis?.self_gap_analysis && (
        <div className="mt-12 glass-panel p-10 rounded-[2.5rem] border border-white/20 bg-[#111111] shadow-2xl">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
            <div className="p-2.5 rounded-xl bg-white/10 text-white">
              <Icons.Zap size={20} />
            </div>
            <h3 className="font-display font-bold text-lg text-white uppercase tracking-widest">Self Gap Analysis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold mb-3">Internal Strengths</h4>
                <ul className="space-y-2">
                  {data.aiCompetitorAnalysis.self_gap_analysis.strengths?.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 leading-relaxed">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold mb-3">Identified Weaknesses</h4>
                <ul className="space-y-2">
                  {data.aiCompetitorAnalysis.self_gap_analysis.weaknesses?.map((w: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                      <Icons.AlertCircle size={12} className="text-white mt-0.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold mb-3">Missed Opportunities</h4>
                <ul className="space-y-2">
                  {data.aiCompetitorAnalysis.self_gap_analysis.missed_opportunities?.map((m: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                      <Icons.ArrowUpRight size={12} className="text-white mt-0.5 shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold mb-3">Actionable Gaps</h4>
                <ul className="space-y-2">
                  {data.aiCompetitorAnalysis.self_gap_analysis.actionable_gaps?.map((a: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 leading-relaxed">
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- PERFORMANCE VIEW --- */
function PerformanceReportView({ data, section, radarData, report, hideRadar }: { data: any, section: SectionType, radarData: any[], report: MarketingReport, hideRadar?: boolean }) {
  const isReports = section === "Reports";
  const isGraphs = section === "Graphs";
  const isBnB = section === "BnB Report";
  const isClient = section === "Client Report";

  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("all");

  if (isGraphs) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <GraphBlock title="Google Ads Metrics Flux" data={data.googleAdsKpis} dataKey="pctChange" nameKey="metric" type="bar" />
        <GraphBlock title="Google Top Campaigns" data={data.topCampaigns} dataKey="leads" nameKey="campaign" type="pie" />
        <GraphBlock title="Google Top Keywords" data={data.topKeywords} dataKey="clicks" nameKey="keyword" type="bar" horizontal />
        <GraphBlock title="Google Device Breakdown" data={data.googleDeviceBreakdown} dataKey="impressions" nameKey="device" type="pie" />
        <GraphBlock title="Meta Ads Metrics Flux" data={data.metaAdsKpis} dataKey="pctChange" nameKey="metric" type="bar" />
        <GraphBlock title="Meta Campaign conversion path" data={data.metaTopCampaigns} dataKey="leads" nameKey="campaign" type="pie" />
        <GraphBlock title="Meta Top Ad Sets" data={data.metaAdSets} dataKey="leads" nameKey="adSet" type="bar" horizontal />
        <GraphBlock title="Hardware gateway access" data={data.metaDeviceBreakdown} dataKey="impressions" nameKey="device" type="bar" horizontal />
      </div>
    );
  }

  const performanceAdvice = data.sectionAdvice || {};
  const showVisuals = !isReports;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* 1. Google Ads KPI (4 Columns - Large) -> Full Width */}
        <DataBlock title="Google Ads KPI Summary" icon={Icons.Target} insight={data.googleAdsInsight} advice={isBnB ? performanceAdvice.kpi_advice : []} adviceTitle="KPI STRATEGY" fullWidth>
           <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-12' : ''} gap-6 items-center`}>
            <div className={showVisuals ? "xl:col-span-8" : "w-full"}>
              {isReports ? (
                <DataTable headers={['Metric', 'Current', 'Previous', 'Change']} rows={data.googleAdsKpis.map((k: any) => [k.metric, k.current, k.previous, `${k.pctChange > 0 ? '+' : ''}${k.pctChange}%`])} />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.googleAdsKpis
                    .filter((k: any) => !isClient || ['Impressions', 'Clicks', 'Leads', 'Cost per Lead (₹)'].includes(k.metric))
                    .slice(0, 8).map((kpi: any, i: number) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 group hover:border-white/30 transition-all flex flex-col justify-between h-28">
                      <span className="text-[9px] uppercase text-gray-500 font-mono font-bold tracking-widest">{kpi.metric}</span>
                      <div className="flex items-end justify-between">
                        <span className="text-xl font-display font-bold text-white">{kpi.current}</span>
                        <span className="text-[10px] font-mono font-bold text-white">
                          {kpi.pctChange > 0 ? '+' : ''}{kpi.pctChange}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {showVisuals && (
              <div className="xl:col-span-4 h-56 bg-black/20 rounded-xl p-4 border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.googleAdsKpis.filter((k: any) => ['Impressions', 'Clicks', 'Leads', 'Conversions'].includes(k.metric))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="metric" stroke="rgba(255,255,255,0.3)" fontSize={8} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={8} />
                    <ChartTooltip content={<CustomTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="currentValue" name="Current" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="previousValue" name="Previous" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </DataBlock>

        {/* 2. Google Campaigns (4 Columns - Large) -> Full Width */}
        <DataBlock title="Google Top Campaigns" icon={Icons.TrendingUp} insight={data.topCampaignsInsight} advice={isBnB ? performanceAdvice.campaign_advice : []} adviceTitle="CAMPAIGN STEPS" fullWidth>
          <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-12' : ''} gap-6 items-center`}>
            <div className={showVisuals ? "xl:col-span-8" : ""}>
               {isClient ? (
                 <DataTable headers={['Campaign', 'Impr', 'Clicks', 'Leads', 'CPA']} rows={data.topCampaigns.map((c: any) => [c.campaign, c.impressions?.toLocaleString() || "0", c.clicks?.toLocaleString() || "0", c.leads.toString(), c.cpa])} />
               ) : (
                 <DataTable headers={['Campaign', 'Cost', 'Leads', 'CPA']} rows={data.topCampaigns.map((c: any) => [c.campaign, c.cost, c.leads.toString(), c.cpa])} />
               )}
            </div>
            {showVisuals && (
               <div className="xl:col-span-4 h-56 bg-black/20 rounded-xl p-4 border border-white/5">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.topCampaigns.slice(0, 5)}
                        dataKey={data.topCampaigns.some((c: any) => c.leads > 0) ? "leads" : "costValue"}
                        nameKey="campaign"
                        cx="50%" cy="50%"
                        outerRadius={50}
                        innerRadius={30}
                      >
                        {data.topCampaigns.slice(0, 5).map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                 </ResponsiveContainer>
               </div>
            )}
          </div>
        </DataBlock>

        {/* 3. Google Keywords (4 Columns - Large) -> Full Width */}
        <DataBlock title="Google Top Keywords" icon={Icons.Search} insight={data.topKeywordsInsight} advice={isBnB ? performanceAdvice.keyword_advice : []} adviceTitle="KEYWORD STEPS" fullWidth>
           <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-12' : ''} gap-6 items-center`}>
             <div className={showVisuals ? "xl:col-span-8" : ""}>
               {isClient ? (
                 <DataTable headers={['Keyword', 'Impr', 'Clicks', 'Leads', 'CPA']} rows={data.topKeywords.map((k: any) => [k.keyword, k.impressions?.toLocaleString() || "0", k.clicks?.toLocaleString() || "0", k.leads?.toString() || "0", k.cpa])} />
               ) : (
                 <DataTable headers={['Keyword', 'Impr', 'Clicks', 'CTR']} rows={data.topKeywords.map((k: any) => [k.keyword, k.impressions?.toLocaleString() || "0", k.clicks?.toString() || "0", k.ctr])} />
               )}
             </div>
             {showVisuals && (
               <div className="xl:col-span-4 h-56 bg-black/20 rounded-xl p-4 border border-white/5">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.topKeywords.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={8} />
                      <YAxis dataKey="keyword" type="category" width={80} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8 }} />
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="clicks" name="Clicks" radius={[0, 4, 4, 0]} barSize={10} fill="#FFFFFF" />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
             )}
           </div>
        </DataBlock>

        {/* 4. Google Devices (4 Columns - Large) -> Full Width */}
        <DataBlock title="Google Device Breakdown" icon={Icons.Monitor} insight={data.googleDeviceInsight} advice={isBnB ? performanceAdvice.device_advice : []} adviceTitle="HARDWARE STEPS" fullWidth>
          <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-12' : ''} gap-6 items-center`}>
            <div className={showVisuals ? "xl:col-span-8" : ""}>
               {isClient ? (
                 <DataTable headers={['Device', 'Impr', 'Clicks', 'Leads', 'CPA']} rows={data.googleDeviceBreakdown.map((d: any) => [d.device, d.impressions?.toLocaleString() || "0", d.clicks?.toLocaleString() || "0", d.leads?.toString() || "0", d.cpa])} />
               ) : (
                 <DataTable headers={['Device', 'Impr', 'Clicks', 'Cost']} rows={data.googleDeviceBreakdown.map((d: any) => [d.device, d.impressions?.toLocaleString() || "0", d.clicks?.toString() || "0", d.cost])} />
               )}
            </div>
            {showVisuals && (
              <div className="xl:col-span-4 h-56 bg-black/20 rounded-xl p-4 border border-white/5 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.googleDeviceBreakdown.slice(0, 4)} dataKey="impressions" nameKey="device" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                      {data.googleDeviceBreakdown.slice(0, 4).map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip content={<CustomTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </DataBlock>

        {/* 5. Meta Ads KPI (2 Columns - Small) -> Full Width for charts */}
        <DataBlock title="Meta Ads KPI Summary" icon={Icons.Tv} insight={data.metaAdsInsight} advice={isBnB ? performanceAdvice.meta_kpi_advice : []} adviceTitle="SOCIAL KPI STEPS" fullWidth>
           <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-12' : ''} gap-6 items-center`}>
            <div className={showVisuals ? "xl:col-span-8" : "w-full"}>
              {isReports ? (
                <DataTable headers={['Metric', 'Current', 'Previous', 'Change']} rows={data.metaAdsKpis.map((k: any) => [k.metric, k.current, k.previous, `${k.pctChange > 0 ? '+' : ''}${k.pctChange}%`])} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.metaAdsKpis
                    .filter((k: any) => !isClient || ['Impressions', 'Clicks', 'Leads', 'Cost per Lead'].includes(k.metric))
                    .map((kpi: any, i: number) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center hover:border-white/20 transition-all">
                      <div>
                        <span className="text-[9px] uppercase text-gray-500 font-mono font-bold tracking-widest block mb-1">{kpi.metric}</span>
                        <span className="text-xl font-display font-bold text-white">{kpi.current}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white">
                        {kpi.pctChange > 0 ? '+' : ''}{kpi.pctChange}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {showVisuals && (
              <div className="xl:col-span-4 h-56 bg-black/20 rounded-xl p-4 border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.metaAdsKpis.filter((k: any) => ['Impressions', 'Clicks', 'Leads', 'Spend', 'Conversions'].includes(k.metric))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="metric" stroke="rgba(255,255,255,0.3)" fontSize={8} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={8} />
                    <ChartTooltip content={<CustomTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="currentValue" name="Current" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="previousValue" name="Previous" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </DataBlock>

        {/* 6. Meta Campaigns (4 Columns - Large) -> Full Width */}
        <DataBlock title="Meta Top Campaigns" icon={Icons.Zap} insight={data.metaTopCampaignsInsight} advice={isBnB ? performanceAdvice.meta_campaign_advice : []} adviceTitle="META CAMPAIGN STEPS" fullWidth>
           <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-12' : ''} gap-6 items-center`}>
            <div className={showVisuals ? "xl:col-span-8" : ""}>
               {isClient ? (
                 <DataTable headers={['Campaign', 'Impr', 'Clicks', 'Leads', 'CPL']} rows={data.metaTopCampaigns.map((c: any) => [c.campaign, c.impressions?.toLocaleString() || "0", c.clicks?.toLocaleString() || "0", c.leads?.toString() || "0", c.costPerLead])} />
               ) : (
                 <DataTable headers={['Campaign', 'Reach', 'Cost', 'Leads']} rows={data.metaTopCampaigns.map((c: any) => [c.campaign, c.impressions?.toLocaleString() || "0", c.cost, c.leads?.toString() || "0"])} />
               )}
            </div>
            {showVisuals && (
               <div className="xl:col-span-4 h-56 bg-black/20 rounded-xl p-4 border border-white/5">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.metaTopCampaigns.slice(0, 5)}
                        dataKey={data.metaTopCampaigns.some((c: any) => c.leads > 0) ? "leads" : "costValue"}
                        nameKey="campaign"
                        cx="50%" cy="50%"
                        outerRadius={50}
                        innerRadius={30}
                      >
                        {data.metaTopCampaigns.slice(0, 5).map((_: any, index: number) => <Cell key={index} fill={COLORS[(index+2) % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                 </ResponsiveContainer>
               </div>
            )}
          </div>
        </DataBlock>

        {/* 7. Meta Adsets (4 Columns - Large) -> Full Width */}
        <DataBlock title="Meta Top Ad Sets" icon={Icons.Target} insight={data.metaAdSetsInsight} advice={isBnB ? performanceAdvice.meta_adset_advice : []} adviceTitle="TARGETING STEPS" fullWidth>
           <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-12' : ''} gap-6 items-center`}>
            <div className={showVisuals ? "xl:col-span-8" : ""}>
               {isClient ? (
                 <DataTable headers={['Ad Set', 'Impr', 'Clicks', 'Leads', 'CPL']} rows={data.metaAdSets.map((a: any) => [a.adSet, a.impressions?.toLocaleString() || "0", a.clicks?.toLocaleString() || "0", a.leads?.toString() || "0", a.costPerLead])} />
               ) : (
                 <DataTable headers={['Ad Set', 'Impr', 'Cost', 'Leads']} rows={data.metaAdSets.map((a: any) => [a.adSet, a.impressions?.toLocaleString() || "0", a.cost, a.leads?.toString() || "0"])} />
               )}
            </div>
            {showVisuals && (
               <div className="xl:col-span-4 h-56 bg-black/20 rounded-xl p-4 border border-white/5">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.metaAdSets.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={8} />
                      <YAxis dataKey="adSet" type="category" width={80} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8 }} />
                      <ChartTooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Bar
                        dataKey={data.metaAdSets.some((a: any) => a.leads > 0) ? "leads" : "costValue"}
                        name={data.metaAdSets.some((a: any) => a.leads > 0) ? "Leads" : "Cost (₹)"}
                        radius={[0, 4, 4, 0]}
                        barSize={10}
                        fill="#9CA3AF"
                      />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            )}
          </div>
        </DataBlock>

        {/* 8. Meta Devices (4 Columns - Large) -> Full Width */}
        <DataBlock title="Meta Device Breakdown" icon={Icons.Smartphone} insight={data.metaDeviceInsight} advice={isBnB ? performanceAdvice.meta_device_advice : []} adviceTitle="META HARDWARE STEPS" fullWidth>
           <div className={`grid grid-cols-1 ${showVisuals ? 'xl:grid-cols-12' : ''} gap-6 items-center`}>
            <div className={showVisuals ? "xl:col-span-8" : ""}>
               {isClient ? (
                 <DataTable headers={['Device', 'Impr', 'Clicks', 'Leads', 'CPL']} rows={data.metaDeviceBreakdown.map((d: any) => [d.device, d.impressions?.toLocaleString() || "0", d.clicks?.toLocaleString() || "0", d.leads?.toString() || "0", d.costPerLead])} />
               ) : (
                 <DataTable headers={['Device', 'Impr', 'Clicks', 'Cost']} rows={data.metaDeviceBreakdown.map((d: any) => [d.device, d.impressions?.toLocaleString() || "0", d.clicks?.toString() || "0", d.cost])} />
               )}
            </div>
            {showVisuals && (
               <div className="xl:col-span-4 h-56 bg-black/20 rounded-xl p-4 border border-white/5 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.metaDeviceBreakdown.slice(0, 4)} dataKey="impressions" nameKey="device" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                      {data.metaDeviceBreakdown.slice(0, 4).map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip content={<CustomTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </DataBlock>

      </div>

      {!hideRadar && !isClient && !isReports && isBnB && (
        <div className="mt-12">
          <CompetitorRadar
            data={radarData}
            siteName={report.siteName}
            siteData={report.radar_self}
          />
        </div>
      )}

      {/* Competitor Breakdown */}
      {!isClient && data.aiCompetitorAnalysis?.competitor_breakdown?.length > 0 && (
        <div className="mt-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-white">
                <Icons.Search size={20} />
              </div>
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-widest">Competitor Deep Dive</h3>
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase">Filter:</span>
              <select
                value={selectedCompetitor}
                onChange={(e) => setSelectedCompetitor(e.target.value)}
                className="bg-[#111111] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/50 transition-all cursor-pointer"
              >
                <option value="all">All Adversaries</option>
                {data.aiCompetitorAnalysis.competitor_breakdown.map((c: any, i: number) => (
                  <option key={i} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.aiCompetitorAnalysis.competitor_breakdown
              .filter((c: any) => selectedCompetitor === "all" || c.name === selectedCompetitor)
              .map((comp: any, idx: number) => {
                const status = getCompetitorStatus(comp);
                const discoveryKw = comp.discovery_query || "Local Search Discovery";

                return (
                  <div key={idx} className="glass-panel p-6 rounded-2xl border-l-4 border-l-white bg-[#111111] relative group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex flex-col">
                        <h4 className="font-display font-bold text-white text-sm uppercase tracking-widest">{comp.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${status.color} animate-pulse`} />
                          <span className={`text-[9px] font-mono uppercase tracking-tighter ${status.text} opacity-80`}>
                            Status: Active | Activity: {status.level}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          <span className="text-[8px] text-gray-500 font-mono uppercase tracking-tighter">
                            Trigger: {discoveryKw}
                          </span>
                        </div>
                        {comp.url && (
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20"
                            title="Visit Website"
                          >
                            <Icons.ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-500 uppercase block mb-2">Inferred Actions</span>
                    <div className="space-y-2">
                      {(Array.isArray(comp.inferred_actions) ? comp.inferred_actions : [comp.inferred_actions]).map((action: string, i: number) => (
                        <p key={i} className="text-xs text-white/70 leading-relaxed font-sans">{action}</p>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-2 border-t border-white/5">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-green-500 uppercase block mb-2">Strengths</span>
                      <ul className="space-y-1.5">
                        {(Array.isArray(comp.strengths) ? comp.strengths : [comp.strengths]).map((s: string, i: number) => (
                          <li key={i} className="text-[11px] text-white/50 leading-tight flex gap-1.5">
                             <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                             {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-500 uppercase block mb-2">Weaknesses</span>
                      <ul className="space-y-1.5">
                        {(Array.isArray(comp.weaknesses) ? comp.weaknesses : [comp.weaknesses]).map((w: string, i: number) => (
                          <li key={i} className="text-[11px] text-white/50 leading-tight flex gap-1.5">
                             <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                             {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
          {data.aiCompetitorAnalysis.overall_threat_summary && (
            <p className="text-xs text-gray-500 italic font-mono bg-white/5 p-4 rounded-xl border border-white/5">
              Neural Summary: {data.aiCompetitorAnalysis.overall_threat_summary}
            </p>
          )}
        </div>
      )}

      {/* Self Gap Analysis */}
      {!isClient && data.aiCompetitorAnalysis?.self_gap_analysis && (
        <div className="mt-12 glass-panel p-10 rounded-[2.5rem] border border-white/20 bg-[#111111] shadow-2xl">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
            <div className="p-2.5 rounded-xl bg-white/10 text-white">
              <Icons.Zap size={20} />
            </div>
            <h3 className="font-display font-bold text-lg text-white uppercase tracking-widest">Self Gap Analysis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold mb-3">Internal Strengths</h4>
                <ul className="space-y-2">
                  {data.aiCompetitorAnalysis.self_gap_analysis.strengths?.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 leading-relaxed">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold mb-3">Identified Weaknesses</h4>
                <ul className="space-y-2">
                  {data.aiCompetitorAnalysis.self_gap_analysis.weaknesses?.map((w: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                      <Icons.AlertCircle size={12} className="text-white mt-0.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold mb-3">Missed Opportunities</h4>
                <ul className="space-y-2">
                  {data.aiCompetitorAnalysis.self_gap_analysis.missed_opportunities?.map((m: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                      <Icons.ArrowUpRight size={12} className="text-white mt-0.5 shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold mb-3">Actionable Gaps</h4>
                <ul className="space-y-2">
                  {data.aiCompetitorAnalysis.self_gap_analysis.actionable_gaps?.map((a: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 leading-relaxed">
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- SOCIAL VIEW --- */
function SocialReportView({ data, section }: { data: any, section: SectionType }) {
  const isReports = section === "Reports";
  const isGraphs = section === "Graphs";

  if (isGraphs) {
     return (
        <div className="grid grid-cols-1 gap-8 items-start">
           <GraphBlock title="Ecosystem Engagement Trends" data={data.impressionsTimeline} dataKey="facebook" nameKey="date" type="line" secondKey="instagram" />
        </div>
     );
  }

  const showVisuals = !isReports;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <DataBlock title="Social Media KPI Summary" icon={Icons.Users} insight={data.socialInsight} advice={data.sectionAdvice?.kpi_advice} adviceTitle="SOCIAL KPI STRATEGY">
          <div className="space-y-6">
            {isReports ? (
              <DataTable headers={['Metric', 'Current', 'Previous', 'Change']} rows={data.socialKpis.map((k: any) => [k.metric, k.current, k.previous, `${k.pctChange > 0 ? '+' : ''}${k.pctChange}%`])} />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {data.socialKpis.map((kpi: any, i: number) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex justify-between items-center hover:border-white/20 transition-all">
                    <div>
                      <span className="text-[9px] uppercase text-gray-500 font-mono font-bold tracking-widest block mb-1">{kpi.metric}</span>
                      <span className="text-xl font-display font-bold text-white">{kpi.current}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white">
                      {kpi.pctChange > 0 ? '+' : ''}{kpi.pctChange}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {showVisuals && (
              <div className="h-48 bg-black/20 rounded-xl p-4 border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.socialKpis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="metric" stroke="rgba(255,255,255,0.3)" fontSize={8} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={8} />
                    <ChartTooltip content={<CustomTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="pctChange" name="Change %" fill="#FFFFFF" radius={[4, 4, 0, 0]}>
                      {data.socialKpis.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.pctChange >= 0 ? '#FFFFFF' : '#9CA3AF'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </DataBlock>

        {showVisuals && (
          <DataBlock title="Temporal Resonance Stream" icon={Icons.Activity} insight={data.impressionsTimelineInsight} advice={data.sectionAdvice?.timeline_advice} adviceTitle="TIMELINE STRATEGY">
            <div className="h-64 bg-black/20 rounded-[2rem] p-6 border border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.impressionsTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="facebook" name="Facebook" stroke="#FFFFFF" strokeWidth={4} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="instagram" name="Instagram" stroke="#9CA3AF" strokeWidth={4} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DataBlock>
        )}
      </div>
    </div>
  );
}

/* --- REUSABLE MODULES (bnb.ai Representation) --- */

function DataBlock({ title, insight, children, icon: Icon, advice, adviceTitle, fullWidth = false }: { title: string; insight: string; children: React.ReactNode; icon: any, advice?: string[], adviceTitle?: string, fullWidth?: boolean }) {
  return (
    <div className={`glass-panel p-8 rounded-[2.5rem] border border-white/5 bg-[#111111] flex flex-col group transition-all ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
        <div className="p-3 rounded-2xl bg-white/10 text-white border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
          <Icon size={18} />
        </div>
        <h3 className="font-display font-bold text-sm text-white uppercase tracking-widest">{title}</h3>
      </div>

      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-8 group-hover:bg-white/10 transition-all">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/10">
             <Icons.Activity size={12} />
          </div>
          <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">Insight Node</span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed font-sans italic">{insight}</p>
      </div>

      <div className="flex-1 mb-8">{children}</div>

      {advice && Array.isArray(advice) && advice.length > 0 && (
        <div className="mt-auto bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest block mb-3">{adviceTitle}</span>
          <ul className="space-y-2">
            {advice.map((item, i) => (
              <li key={i} className="text-xs text-white/60 leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GraphBlock({ title, data, dataKey, nameKey, type, horizontal = false, secondKey }: { title: string, data: any[], dataKey: string, nameKey: string, type: 'bar' | 'line' | 'pie', horizontal?: boolean, secondKey?: string }) {
  const hasData = data && data.length > 0;

  return (
    <div className="glass-panel p-8 rounded-[2.5rem] min-h-[450px] flex flex-col bg-[#111111] border border-white/5 shadow-2xl hover:border-white/20 transition-all group">
      <h4 className="font-display font-bold text-xs text-white/40 uppercase tracking-widest mb-8 border-b border-white/5 pb-4 group-hover:text-white transition-colors">{title}</h4>
      <div className="w-full h-[320px] relative">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey={horizontal ? undefined : nameKey}
                  type={horizontal ? 'number' : 'category'}
                  hide={false}
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                  stroke="rgba(255,255,255,0.2)"
                  interval="preserveStartEnd"
                  minTickGap={horizontal ? 0 : 30}
                />
                <YAxis dataKey={horizontal ? nameKey : undefined} type={horizontal ? 'category' : 'number'} width={horizontal ? 120 : 40} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} stroke="rgba(255,255,255,0.2)" />
                <ChartTooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey={dataKey} name={title} fill="#FFFFFF" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} barSize={24} />
              </BarChart>
            ) : type === 'line' ? (
              <LineChart data={data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey={nameKey}
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                  stroke="rgba(255,255,255,0.2)"
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} stroke="rgba(255,255,255,0.2)" />
                <ChartTooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey={dataKey} stroke="#FFFFFF" strokeWidth={4} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                {secondKey && <Line type="monotone" dataKey={secondKey} stroke="#9CA3AF" strokeWidth={4} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />}
              </LineChart>
            ) : (
              <PieChart>
                <Pie data={data?.slice(0, 10) || []} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={110} paddingAngle={4}>
                  {data?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <ChartTooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '30px' }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-white gap-3 border border-white/30 border-dashed rounded-2xl bg-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]">
            <Icons.Activity size={32} className="text-white animate-pulse" />
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Awaiting Intelligence Feed...</p>
            <p className="text-[8px] font-mono text-gray-500 uppercase">Input: {title} | Data Nodes: 0</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const rowCount = rows.length;
  const showScroll = rowCount > 10;

  return (
    <div className={`overflow-x-auto rounded-2xl border border-white/5 bg-black/20 custom-scrollbar ${showScroll ? 'max-h-[380px] overflow-y-auto' : ''}`}>
      <table className="w-full text-left border-collapse min-w-max lg:min-w-full">
        <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
          <tr>
            {headers.map((h, i) => <th key={i} className="px-4 py-3 text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 text-[11px] ${j === 0 ? 'text-white/80 font-medium' : 'text-white font-mono group-hover:text-white transition-colors'} ${j > 0 ? 'text-right whitespace-nowrap' : 'whitespace-normal min-w-[120px]'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
