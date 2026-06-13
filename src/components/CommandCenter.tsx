import React, { useState, useEffect } from "react";
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
import { AlertTriangle, Radar, Sparkles, HelpCircle, RefreshCw, ChevronRight } from "lucide-react";
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

    fetchReportData(activeSite, { startDate: dateRange.start, endDate: dateRange.end }, cat);
  };

  const handleNavigate = (view: string, targetCategory?: CategoryType, targetSection?: SectionType) => {
    setActiveView(view);
    if (targetCategory) setCategory(targetCategory);
    if (targetSection) setSection(targetSection);

    if (targetCategory && view !== 'cmd-center') {
      fetchReportData(activeSite, { startDate: dateRange.start, endDate: dateRange.end }, targetCategory);
    }
  };

  const handleStudioTrigger = (targetCategory: CategoryType, viewId: string) => {
    setCategory(targetCategory);
    setActiveView(viewId);
    setSection('Reports');
    fetchReportData(activeSite, { startDate: dateRange.start, endDate: dateRange.end }, targetCategory);
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
      theme === 'dark' ? 'dark bg-[#03050a] text-white' : 'light bg-[#f4f6fa] text-slate-800'
    }`}>

      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {theme === 'dark' ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#080b14_0%,_#03050a_100%)]" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f1f4fb_0%,_#e2e8f0_100%)]" />
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

        <main className={`flex-1 flex flex-col min-w-0 ${isFullscreenReport ? 'h-screen w-screen overflow-hidden' : 'overflow-y-auto custom-scrollbar'} bg-[#080B14] transition-all duration-300`}>
          <div className={`${isFullscreenReport ? 'p-0 h-full w-full' : 'p-8 max-w-[1600px] mx-auto w-full'}`}>
            {isLoading ? (
              <div className="space-y-10">
                 <div className="py-24 text-center glass-panel rounded-[2rem] shadow-sm space-y-4 animate-pulse border-white/5 bg-white/[0.01]">
                  <div className="h-12 w-12 bg-[#00d4ff]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#00d4ff]/20">
                    <RefreshCw className="h-6 w-6 text-[#00d4ff] animate-spin" />
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
              <div>
                <h1 className="font-display font-medium text-2xl text-white tracking-tight">Competitor Radar Overview</h1>
                <p className="text-xs text-white/40 mt-0.5 uppercase tracking-wider">Standalone cross-platform competitors metrics mapping</p>
              </div>

              {marketingReport?.radarData && marketingReport.radarData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-panel rounded-2xl p-6 h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={marketingReport.radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.06)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.02)" />
                        <RadarGraph name={marketingReport.siteName} dataKey="Current Site" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.15} />
                        <RadarGraph name="Alpha Force" dataKey="Competitor Alpha" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.06} />
                        <RadarGraph name="Beta Matrix" dataKey="Competitor Beta" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.03} />
                        <RadarGraph name="Gamma Shield" dataKey="Competitor Gamma" stroke="#22c55e" fill="#22c55e" fillOpacity={0.03} />
                        <ChartTooltip contentStyle={{ backgroundColor: '#0c0f1d', borderColor: 'rgba(0, 212, 255, 0.2)', fontSize: '11px', color: '#fff' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="glass-panel rounded-2xl p-6 bg-[#0c101b] justify-between flex flex-col">
                    <div>
                      <h3 className="font-display font-medium text-xs text-[#00d4ff] uppercase tracking-wider border-b border-white/5 pb-2 mb-4">AI Radar Insights</h3>
                      <p className="text-xs text-white/80 font-sans leading-relaxed italic">
                        "{marketingReport.executiveSummary.substring(0, 300)}..."
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/5">
                      <div className="text-[10px] font-mono text-white/30 uppercase">SYSTEM DIAGNOSTIC PARAMETERS: SUITE SECURE</div>
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
              category={category}
              setCategory={setCategory}
              isFullscreen={isFullscreenReport}
              setIsFullscreen={setIsFullscreenReport}
              userAvatarUrl={user.avatarUrl}
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
