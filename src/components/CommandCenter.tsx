import React, { useState, useEffect, useRef } from "react";
import { UserProfile, SiteProfile, DateRange, MarketingReport, CategoryType, SectionType } from "../types";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { useTheme } from "../contexts/ThemeContext";
import { exportReportToPDF } from "../utils/exportReport";
import { useReportData } from "./command-center/useReportData";
import { mapReportResponseToMarketingReport } from "../utils/mapper";

import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import HomeDashboard from "./HomeDashboard";
import ReportsStudio from "./ReportsStudio";
import AIAssistant from "./AIAssistant";
import ReportViews from "./ReportViews";
import ClientReports from "./command-center/ClientReports";
import { AlertTriangle, Radar, Sparkles, HelpCircle, RefreshCw, ChevronRight, ChevronDown } from "lucide-react";
import {
  Radar as RadarGraph,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip as ChartTooltip
} from 'recharts';

interface CommandCenterProps {
  user: UserProfile;
  sites: SiteProfile[];
  activeSite: SiteProfile;
  setActiveSite: (site: SiteProfile) => void;
  onOpenSiteManagement: () => void;
  onLogout: () => void;
  initialDates: DateRange;
}

export default function CommandCenter({
  user, sites, activeSite, setActiveSite, onOpenSiteManagement, onLogout, initialDates
}: CommandCenterProps) {
  const { theme, toggleTheme } = useTheme();
  const STORAGE_KEY = `bnb_dashboard_state_v3_${user.id}_${activeSite.id}`;

  const getSavedState = (key: string, defaultValue: any) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultValue;
    try { const p = JSON.parse(saved); return p[key] !== undefined ? p[key] : defaultValue; }
    catch { return defaultValue; }
  };

  const [activeView, setActiveView] = useState<string>(() => getSavedState("activeView", "cmd-center"));
  const [category, setCategory] = useState<CategoryType>(() => getSavedState("category", "SEO"));
  const [section, setSection] = useState<SectionType>(() => getSavedState("section", "Reports"));

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const saved = getSavedState("dateRange", { start: initialDates.startDate, end: initialDates.endDate });
    return saved;
  });

  const [sidebarExpanded, setSidebarExpanded] = useState(() => getSavedState("sidebarExpanded", true));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isFullscreenReport, setIsFullscreenReport] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Radar switching states
  const [isSelfRadar, setIsSelfRadar] = useState(false);
  const [radarDropdownOpen, setRadarDropdownOpen] = useState(false);
  const [selectedDeepDive, setSelectedDeepDive] = useState<string>("all");
  const radarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (radarRef.current && !radarRef.current.contains(event.target as Node)) {
        setRadarDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const {
    reportData, isLoading, errorMsg, pollingStatus, fetchReportData
  } = useReportData(user, activeSite, { startDate: dateRange.start, endDate: dateRange.end }, category);

  const [marketingReport, setMarketingReport] = useState<MarketingReport | null>(null);

  useEffect(() => {
    if (activeView === 'client-ppt' && category !== 'Combined Intelligence') {
      setCategory('Combined Intelligence');
    }
  }, [activeView, category]);

  useEffect(() => {
    if (reportData) {
      const mapped = mapReportResponseToMarketingReport(
        reportData,
        activeSite.id + "_" + category,
        activeSite.name,
        category,
        dateRange,
        activeSite.imageUrl
      );
      setMarketingReport(mapped);
    } else {
      setMarketingReport(null);
    }
  }, [reportData, activeSite, category, dateRange]);

  useEffect(() => {
    const state = { activeView, category, section, dateRange, sidebarExpanded };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Sync with URL
    const params = new URLSearchParams(window.location.search);
    params.set('site_id', activeSite.id);
    params.set('view', activeView);
    params.set('category', category);
    params.set('section', section);
    params.set('start_date', dateRange.start);
    params.set('end_date', dateRange.end);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [activeView, category, section, dateRange, activeSite.id, sidebarExpanded, STORAGE_KEY]);

  const handleGenerateReport = (targetCategory?: CategoryType) => {
    let cat = targetCategory || category;
    // Enforcement for Client PPT view
    if (activeView === 'client-ppt') cat = 'Combined Intelligence';

    setResetTrigger(prev => prev + 1);
    fetchReportData(activeSite, { startDate: dateRange.start, endDate: dateRange.end }, cat);
  };

  const handleNavigate = (view: string, targetCategory?: CategoryType, targetSection?: SectionType) => {
    setActiveView(view);
    if (targetCategory) setCategory(targetCategory);
    if (targetSection) setSection(targetSection);

    if (targetCategory && view !== 'cmd-center') {
      // Use skipSync=true to avoid automatic report generation on navigation
      fetchReportData(activeSite, { startDate: dateRange.start, endDate: dateRange.end }, targetCategory, true);
    }
  };

  const handleStudioTrigger = (targetCategory: CategoryType, viewId: string) => {
    setCategory(targetCategory);
    setActiveView(viewId);
    setSection('Reports');
    // Use skipSync=true to avoid automatic report generation
    fetchReportData(activeSite, { startDate: dateRange.start, endDate: dateRange.end }, targetCategory, true);
  };

  const handleSelectSite = (site: SiteProfile) => {
    setActiveSite(site);
    setActiveView('cmd-center');
  };

  const testWebhook = async () => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const webhookPath = category === "SEO" ? "seo-report" : category === "Performance Marketing" ? "performance-report" : category === "Combined Intelligence" ? "combined-report" : "social-report";
    const url = `${API_URL}/${webhookPath}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          site_id: activeSite.id,
          start_date: dateRange.start,
          end_date: dateRange.end
        })
      });
      const text = await res.text();
      alert("Webhook Test Result: " + text);
    } catch (err: any) {
      alert("Webhook Error: " + err.message);
    }
  };

  return (
    <div className={`h-screen flex flex-col font-sans transition-colors duration-300 overflow-hidden ${
      theme === 'dark' ? 'dark bg-[#000000] text-white' : 'light bg-[#f4f6fa] text-slate-800'
    }`}>

      {/* Deep atmospheric background matching Image 2 texture */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {theme === 'dark' ? (
          <div className="absolute inset-0 bg-[#000000] bg-[radial-gradient(circle_at_50%_40%,_#1A1A1A_0%,_#000000_80%)] opacity-80" />
        ) : (
          <div className="absolute inset-0 bg-[#f1f4fb]" />
        )}
      </div>

      <TopBar
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={() => {
          if (window.innerWidth < 768) {
            setMobileSidebarOpen(!mobileSidebarOpen);
          } else {
            setSidebarExpanded(!sidebarExpanded);
          }
        }}
        sites={sites}
        selectedSite={activeSite}
        onSelectSite={handleSelectSite}
        dateRange={dateRange}
        onChangeDateRange={setDateRange}
        reportLoaded={!!marketingReport}
        isGenerating={isLoading}
        onGenerate={() => handleGenerateReport()}
        onExportPdf={() => exportReportToPDF('report-content', `BNB_AI_${activeSite.name}_${category}_Report`)}
        darkTheme={theme === 'dark'}
        onToggleTheme={toggleTheme}
        onNavigateHome={() => handleNavigate('cmd-center')}
        onOpenSiteManagement={onOpenSiteManagement}
        userName={user.name}
        userEmail={user.email}
        userAvatarUrl={user.avatarUrl}
        onLogout={onLogout}
        isFullscreen={isFullscreenReport}
      />

      <div className={`flex-1 flex relative z-10 overflow-hidden ${isFullscreenReport ? 'p-0' : ''}`}>
        {!isFullscreenReport && (
          <Sidebar
            expanded={sidebarExpanded}
            activeView={activeView}
            activeCategory={category}
            activeSection={section}
            onNavigate={handleNavigate}
            onOpenSiteManagement={onOpenSiteManagement}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        )}

        <main className={`flex-1 flex flex-col min-w-0 ${isFullscreenReport ? 'h-screen w-screen overflow-hidden' : 'overflow-y-auto custom-scrollbar'} bg-transparent transition-all duration-300`}>
          <div className={`${isFullscreenReport ? 'p-0 h-full w-full' : 'p-8 max-w-[1600px] mx-auto w-full'}`}>
            {isLoading ? (
              <div className="space-y-10">
                 <div className="py-24 text-center glass-panel rounded-[2rem] shadow-sm space-y-4 animate-pulse border-[#262626] bg-[#111111]">
                  <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <RefreshCw className="h-6 w-6 text-white animate-spin" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-white tracking-tight">{pollingStatus || "Synchronizing Neural Link..."}</h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                    Connecting to Apex acquisition nodes and generating AI narrative briefs.
                    This Typically takes 30-60 seconds.
                  </p>
                </div>
                <LoadingSkeleton />
              </div>
            ) : errorMsg ? (
            <div className="glass-panel border-r-4 border-r-[#f43f5e] p-8 text-center rounded-2xl max-w-xl mx-auto my-12">
              <div className="p-3 bg-[#f43f5e]/15 text-[#f43f5e] rounded-full inline-block mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="font-display font-medium text-lg text-white mb-2">Systems Protocol Error</h3>
              <p className="text-xs text-white/65 leading-relaxed font-sans mb-6">{errorMsg}</p>
              <button
                onClick={() => handleGenerateReport()}
                className="px-5 py-2.5 bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white text-xs font-semibold rounded-xl hover:shadow-lg transition-transform hover:scale-105"
              >
                Initiate Protocol Retry
              </button>
            </div>
          ) : activeView === 'cmd-center' ? (
            <HomeDashboard
              report={marketingReport}
              onNavigateToCategory={(cat) => {
                const viewId = cat === 'SEO' ? 'seo-intel' : cat === 'Performance Marketing' ? 'perf-intel' : 'social-intel';
                handleNavigate(viewId, cat as CategoryType, 'Reports');
              }}
              onTriggerSync={() => handleGenerateReport()}
            />
          ) : activeView === 'competitor' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display font-medium text-2xl text-white tracking-tight">Competitor Radar Overview</h1>
                  <p className="text-xs text-white/40 mt-0.5 uppercase tracking-wider">Standalone cross-platform competitors metrics mapping</p>
                </div>

                <div className="flex items-center gap-4">
                  {/* View Toggle (Competitors vs Self) */}
                  <div className="flex items-center p-1 bg-[#0c101b] border border-white/10 rounded-xl shadow-lg">
                    <button
                      onClick={() => setIsSelfRadar(false)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${
                        !isSelfRadar
                          ? 'bg-[#00d4ff] text-black shadow-[0_0_10px_rgba(0,212,255,0.4)]'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      Competitors
                    </button>
                    <button
                      onClick={() => setIsSelfRadar(true)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${
                        isSelfRadar
                          ? 'bg-[#00d4ff] text-black shadow-[0_0_10px_rgba(0,212,255,0.4)]'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      Self
                    </button>
                  </div>

                  {/* Category Dropdown */}
                  <div className="relative" ref={radarRef}>
                    <button
                      onClick={() => setRadarDropdownOpen(!radarDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0c101b] border border-white/10 rounded-xl text-xs text-white hover:border-[#00d4ff]/40 transition-all shadow-lg"
                    >
                      <Radar size={14} className="text-[#00d4ff]" />
                      <span className="font-medium">
                        {category === "SEO" ? "SEO Radar" : "Performance Radar"}
                      </span>
                      <ChevronDown size={14} className={`text-white/40 transition-transform ${radarDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {radarDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#111111] p-1.5 shadow-2xl z-50">
                        <div className="px-2.5 py-1 text-[10px] font-mono text-white/40 tracking-wider uppercase mb-1">SWITCH RADAR CORE</div>
                        <button
                          onClick={() => {
                            handleNavigate('competitor', 'SEO', 'Reports');
                            setRadarDropdownOpen(false);
                          }}
                          className={`w-full flex items-center px-2.5 py-2 rounded-lg text-xs transition-all ${
                            category === 'SEO'
                              ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-l-2 border-[#00d4ff]'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          SEO Radar
                        </button>
                        <button
                          onClick={() => {
                            handleNavigate('competitor', 'Performance Marketing', 'Reports');
                            setRadarDropdownOpen(false);
                          }}
                          className={`w-full flex items-center px-2.5 py-2 mt-1 rounded-lg text-xs transition-all ${
                            category === 'Performance Marketing'
                              ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-l-2 border-[#00d4ff]'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          Performance Radar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {((isSelfRadar && marketingReport?.radar_self) || (marketingReport?.radarData && marketingReport.radarData.length > 0)) ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-panel rounded-2xl p-6 h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={isSelfRadar && marketingReport?.radar_self
                          ? Object.entries(marketingReport.radar_self).map(([subject, value]) => ({ subject, "Current Site": value }))
                          : marketingReport?.radarData
                        }
                      >
                        <PolarGrid stroke="rgba(255,255,255,0.06)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.02)" />

                        {isSelfRadar ? (
                          <RadarGraph
                            name={marketingReport?.siteName || "Current Site"}
                            dataKey="Current Site"
                            stroke="#FFFFFF"
                            fill="#FFFFFF"
                            fillOpacity={0.25}
                          />
                        ) : (() => {
                          const sample = marketingReport?.radarData?.[0] || {};
                          const competitorKeys = Object.keys(sample).filter(k => k !== 'subject' && k !== 'Current Site' && k !== 'you');
                          const colors = ['#7c3aed', '#f43f5e', '#22c55e', '#eab308', '#ec4899'];

                          return (
                            <>
                              <RadarGraph name={marketingReport?.siteName} dataKey="Current Site" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.15} />
                              {competitorKeys.map((key, idx) => (
                                <RadarGraph
                                  key={key}
                                  name={key}
                                  dataKey={key}
                                  stroke={colors[idx % colors.length]}
                                  fill={colors[idx % colors.length]}
                                  fillOpacity={0.06}
                                />
                              ))}
                              <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                            </>
                          );
                        })()}

                        <ChartTooltip contentStyle={{ backgroundColor: '#0c0f1d', borderColor: 'rgba(0, 212, 255, 0.2)', fontSize: '11px', color: '#fff' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="glass-panel rounded-2xl p-6 bg-[#0c101b] flex flex-col h-[450px]">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2 shrink-0">
                      <h3 className="font-display font-medium text-xs text-[#00d4ff] uppercase tracking-wider">Competitor Deep Dive</h3>

                      {(() => {
                        const compData = category === 'SEO' ? marketingReport?.seo?.aiCompetitorAnalysis : marketingReport?.performance?.aiCompetitorAnalysis;
                        const competitors = compData?.competitor_breakdown || [];

                        if (competitors.length === 0) return null;

                        return (
                          <select
                            value={selectedDeepDive}
                            onChange={(e) => setSelectedDeepDive(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#00d4ff]/40 transition-all cursor-pointer"
                          >
                            <option value="all">All Adversaries</option>
                            {competitors.map((c: any) => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                      {(() => {
                        const compData = category === 'SEO' ? marketingReport?.seo?.aiCompetitorAnalysis : marketingReport?.performance?.aiCompetitorAnalysis;
                        const competitors = (compData?.competitor_breakdown || [])
                          .filter((c: any) => selectedDeepDive === "all" || c.name === selectedDeepDive);

                        if (competitors.length === 0) {
                          return (
                            <div className="h-full flex items-center justify-center text-center p-4">
                              <p className="text-[10px] text-white/30 uppercase tracking-widest leading-relaxed">
                                No deep dive data available for this category sequence.
                              </p>
                            </div>
                          );
                        }

                        return competitors.map((comp: any, idx: number) => (
                          <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">{comp.name}</h4>
                              <div className="px-2 py-0.5 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/20">
                                <span className="text-[8px] text-[#00d4ff] font-mono uppercase">Analyzed</span>
                              </div>
                            </div>

                            {comp.inferred_actions && (
                              <div>
                                <span className="text-[9px] font-mono text-white/40 uppercase block mb-1">Tactical Actions</span>
                                <p className="text-[10px] text-white/70 leading-relaxed italic">
                                  "{Array.isArray(comp.inferred_actions) ? comp.inferred_actions[0] : comp.inferred_actions}"
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                              <div>
                                <span className="text-[9px] font-mono text-emerald-500 uppercase block mb-1">Strengths</span>
                                <ul className="space-y-1">
                                  {(Array.isArray(comp.strengths) ? comp.strengths : [comp.strengths]).slice(0, 2).map((s: string, i: number) => (
                                    <li key={i} className="text-[9px] text-white/50 flex gap-1 items-start">
                                      <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                      <span className="truncate">{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <span className="text-[9px] font-mono text-rose-500 uppercase block mb-1">Weaknesses</span>
                                <ul className="space-y-1">
                                  {(Array.isArray(comp.weaknesses) ? comp.weaknesses : [comp.weaknesses]).slice(0, 2).map((w: string, i: number) => (
                                    <li key={i} className="text-[9px] text-white/50 flex gap-1 items-start">
                                      <div className="w-1 h-1 rounded-full bg-rose-500 mt-1 shrink-0" />
                                      <span className="truncate">{w}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 shrink-0">
                      <div className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">DIAGNOSTIC PROTOCOL: {category} CORE</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel border border-dashed border-white/10 p-12 text-center rounded-2xl max-w-xl mx-auto my-12">
                  <div className="p-3 bg-white/5 text-white/40 rounded-full inline-block mb-4">
                    <Radar size={32} className="animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <h3 className="font-display font-semibold text-white/80">Radar Feed Terminal Offline</h3>
                  <p className="text-xs text-white/45 mt-2 mb-6">Telemetry is dependent on an active generated site report.</p>
                  <button onClick={() => handleGenerateReport()} className="px-4 py-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/15 border border-[#00d4ff]/25 text-white text-xs font-semibold rounded-lg transition-colors">Trigger Radar Core Sync</button>
                </div>
              )}
            </div>
          ) : activeView === 'studio' ? (
            <ReportsStudio onTriggerModule={handleStudioTrigger} />
          ) : activeView === 'client-ppt' ? (
            <ClientReports
              report={marketingReport}
              siteId={activeSite.id}
              category={category}
              setCategory={setCategory}
              isFullscreen={isFullscreenReport}
              setIsFullscreen={setIsFullscreenReport}
              userAvatarUrl={user.avatarUrl}
              userName={user.name}
              resetTrigger={resetTrigger}
            />
          ) : activeView === 'client-doc' ? (
            marketingReport ? (
              <ReportViews report={marketingReport} activeSection="Client Report" />
            ) : (
              <div className="glass-panel p-12 text-center rounded-2xl max-w-xl mx-auto my-12">
                <div className="p-3 bg-white/5 text-[#00d4ff] rounded-full inline-block mb-4 hover:scale-105 transition-transform">
                  <Sparkles size={32} className="animate-pulse" />
                </div>
                <h3 className="font-display font-medium text-lg text-white mb-2">No Intel Generated</h3>
                <p className="text-xs text-white/60 leading-relaxed mb-6 font-sans">Active systems are resting safely. Trigger a neural intelligence sync on the {activeSite.name} node to analyze this division's report curves.</p>
                <button onClick={() => handleGenerateReport()} className="px-5 py-2.5 bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white text-xs font-semibold rounded-xl hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-transform hover:scale-105 inline-flex items-center gap-2">Trigger Neural Sync</button>
              </div>
            )
          ) : marketingReport ? (
            <ReportViews report={marketingReport} activeSection={section} />
          ) : (
            <div className="glass-panel p-12 text-center rounded-2xl max-w-xl mx-auto my-12">
              <div className="p-3 bg-white/5 text-[#00d4ff] rounded-full inline-block mb-4 hover:scale-105 transition-transform">
                <Sparkles size={32} className="animate-pulse" />
              </div>
              <h3 className="font-display font-medium text-lg text-white mb-2">No Intel Generated</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-6 font-sans">Active systems are resting safely. Trigger a neural intelligence sync on the {activeSite.name} node to analyze this division's report curves.</p>
              <button onClick={() => handleGenerateReport()} className="px-5 py-2.5 bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white text-xs font-semibold rounded-xl hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-transform hover:scale-105 inline-flex items-center gap-2">Trigger Neural Sync</button>
            </div>
          )}
          </div>
        </main>
      </div>

      <AIAssistant report={marketingReport} />
    </div>
  );
}
