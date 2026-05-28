import React, { useState, useEffect } from "react";
import { UserProfile, SiteProfile, DateRange, ReportResponse } from "../types";
import { supabase } from "../lib/supabaseClient";
import {
  Sparkles,
  Search,
  LineChart,
  BarChart,
  BarChart2,
  PieChart,
  TrendingUp,
  FileText,
  Briefcase,
  Users,
  Download,
  Calendar,
  ChevronDown,
  Plus,
  HelpCircle,
  Clock,
  RotateCcw,
  ChevronRight,
  Monitor,
  CheckCircle,
  Lock,
  ArrowRight
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar as ReBar,
  LineChart as ReLineChart,
  Line as ReLine,
  PieChart as RePieChart,
  Pie as RePie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

interface MainDashboardProps {
  user: UserProfile;
  sites: SiteProfile[];
  activeSite: SiteProfile;
  setActiveSite: (site: SiteProfile) => void;
  onOpenSiteManagement: () => void;
  onLogout: () => void;
  initialDates: DateRange;
}

export default function MainDashboard({
  user,
  sites,
  activeSite,
  setActiveSite,
  onOpenSiteManagement,
  onLogout,
  initialDates,
}: MainDashboardProps) {
  const STORAGE_KEY = `bnb_dashboard_state_${user.id}_${activeSite.id}`;

  const getSavedState = (key: string, defaultValue: any) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultValue;
    try {
      const parsed = JSON.parse(saved);
      return parsed[key] !== undefined ? parsed[key] : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Navigation & Config state
  const [category, setCategory] = useState<"SEO" | "Performance Marketing" | "Social Media Marketing">(() => getSavedState('category', "SEO"));
  const [section, setSection] = useState<"Reports" | "Graphs" | "BnB Report" | "Client Report">(() => getSavedState('section', "Reports"));

  // Date system
  const [dates, setDates] = useState<DateRange>(() => getSavedState('dates', initialDates));

  // Hover state for interactive sidebar
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Profile dropdown card active
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Persist dashboard state
  useEffect(() => {
    const state = { category, section, dates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [category, section, dates, STORAGE_KEY]);

  // Dynamic API Report state
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>("Initializing...");

  const normalizeDateRange = (range: DateRange) => {
    if (range.startDate && range.endDate && range.startDate > range.endDate) {
      return { startDate: range.endDate, endDate: range.startDate };
    }

    return range;
  };

  const getReportCacheKey = (siteId: string, cat: string, startDate: string, endDate: string) => {
    return `BNB_REPORT_${siteId}_${cat}_${startDate}_${endDate}`;
  };

  const isCompleteSeoDatabaseReport = (report: any) => {
    // We only need basic metric data to consider a report "found".
    // This prevents triggering a fresh AI run for reports that already have data.
    return Boolean(
      report &&
      (report.kpi_summary || report.ga4_details || report.gsc_details)
    );
  };

  const isCompleteSeoCachedReport = (report: any) => {
    // If we have narrative and metrics, it's good enough for the local cache.
    return Boolean(
      report?.narrative1 &&
      report?.tableData1
    );
  };

  const testWebhook = async () => {
    const normalizedDates = normalizeDateRange(dates);
    const webhookPath =
      category === "SEO" ? "seo-report" :
      category === "Performance Marketing" ? "performance-report" : "social-report";
    const url = `${import.meta.env.VITE_API_URL}/${webhookPath}`;
    console.log("Testing webhook at:", url);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          site_id: activeSite.id,
          start_date: normalizedDates.startDate,
          end_date: normalizedDates.endDate
        })
      });
      const text = await res.text();
      console.log("Webhook response:", text);
      alert("Webhook Test Result: " + text);
    } catch (err: any) {
      console.error("Webhook error:", err);
      alert("Webhook Error: " + err.message);
    }
  };

  const checkSiteCredentials = async () => {
    const { data, error } = await supabase
      .from("site_credentials")
      .select("platform")
      .eq("site_id", activeSite.id);

    if (error || !data?.length) {
      console.error("No credentials found for site", activeSite.id);
      setErrorMsg(`No credentials found for ${activeSite.name}. Please set them in Site Management.`);
      return false;
    }
    console.log("Credentials found:", data.map(d => d.platform));
    return true;
  };

  const buildReportFromRow = (report: any, cat: string, startDate: string, endDate: string): ReportResponse => {
    const kpi = report.kpi_summary || {};
    const aiTableExplanations = report.ai_table_explanations || {};
    let tableData1: any[] = [];
    let tableData2: any[] | undefined;
    let tableHeader2: string[] | undefined;
    let narrative1 = report.ai_summary || "";
    let narrative2 = "";
    let chartLabels = { a: "Metric A", b: "Metric B", c: "Metric C" };

    if (cat === "SEO") {
      const toIsoDateLabel = (rawDate: string) => {
        if (!rawDate || rawDate.length !== 8) return rawDate;
        return `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      };

      const ga4 = kpi.ga4 || {};
      const gsc = kpi.gsc || {};
      const topKeywords = Array.isArray(report.top_keywords) ? report.top_keywords : [];
      const topKeywordsOverview = report.ai_top_keywords_overview || aiTableExplanations.secondary_overview || "";
      const rawCountries = Array.isArray(report.users_by_country) ? report.users_by_country : [];
      const rawLandingPages = Array.isArray(report.top_landing_pages) ? report.top_landing_pages : [];
      const rawPageTitles = Array.isArray(report.top_page_titles) ? report.top_page_titles : [];
      const rawSessionsByChannel = Array.isArray(report.sessions_by_channel)
        ? report.sessions_by_channel
        : Array.isArray(report.ga4_details?.sessions_by_channel)
          ? report.ga4_details.sessions_by_channel
          : [];
      const rawEventsByName = Array.isArray(report.events_by_event_name)
        ? report.events_by_event_name
        : Array.isArray(report.ga4_details?.events_by_event_name)
          ? report.ga4_details.events_by_event_name
          : [];
      const rawKeyEventsByPlatform = Array.isArray(report.key_events_by_platform)
        ? report.key_events_by_platform
        : Array.isArray(report.ga4_details?.key_events_by_platform)
          ? report.ga4_details.key_events_by_platform
          : [];

      const formatChange = (metric: any) => {
        if (metric?.change_percent === undefined || metric?.change_percent === null) return "0%";
        const value = typeof metric.change_percent === "number" ? metric.change_percent.toFixed(1) : String(metric.change_percent);
        return value.startsWith("-") ? `${value}%` : `+${value}%`;
      };

      tableData1 = [
        { metric: "Organic Traffic (Users)", current: ga4.totalUsers?.current?.toLocaleString() || "0", previous: ga4.totalUsers?.previous?.toLocaleString() || "0", change: formatChange(ga4.totalUsers) },
        { metric: "Sessions", current: ga4.sessions?.current?.toLocaleString() || "0", previous: ga4.sessions?.previous?.toLocaleString() || "0", change: formatChange(ga4.sessions) },
        { metric: "New Users", current: ga4.newUsers?.current?.toLocaleString() || "0", previous: ga4.newUsers?.previous?.toLocaleString() || "0", change: formatChange(ga4.newUsers) },
        { metric: "Events", current: ga4.eventCount?.current?.toLocaleString() || "0", previous: ga4.eventCount?.previous?.toLocaleString() || "0", change: formatChange(ga4.eventCount) },
      ];
      chartLabels = { a: "Organic Visitors", b: "", c: "" };
      narrative1 = aiTableExplanations.kpi_overview || narrative1 || `SEO performance delivered ${ga4.totalUsers?.current?.toLocaleString() || "0"} users and ${gsc.clicks?.toLocaleString?.() || gsc.clicks || 0} Search Console clicks during the selected period.`;
      narrative2 = topKeywordsOverview || (topKeywords.length > 0
        ? `Top search themes were led by ${topKeywords[0].keyword}, with ${topKeywords[0].clicks} clicks.`
        : `Search Console and GA4 data were collected successfully for the selected period.`);
      tableHeader2 = ["Query", "Clicks", "CTR", "Position"];
      tableData2 = topKeywords.slice(0, 5).map((keyword: any) => ({
        item: keyword.keyword,
        value: String(keyword.clicks ?? 0),
        share: `${typeof keyword.ctr === "number" ? (keyword.ctr * 100).toFixed(1) : keyword.ctr || "0.0"}%`,
        trend: `${typeof keyword.position === "number" ? keyword.position.toFixed(1) : keyword.position || "0.0"}`,
      }));

      const countryMap = rawCountries.reduce((acc: Record<string, number>, row: any) => {
        const country = row?.country || "Unknown";
        const users = Number(row?.users || 0);
        acc[country] = (acc[country] || 0) + users;
        return acc;
      }, {});

      const topCountries = Object.entries(countryMap)
        .map(([country, users]) => ({ country, users: Number(users || 0) }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 10);

      const topPages = rawLandingPages
        .map((p: any) => ({ page: p?.page || "(not set)", views: Number(p?.sessions || 0) }))
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 10);

      const topPageTitles = rawPageTitles
        .map((p: any) => ({ title: p?.title || "(untitled)", views: Number(p?.views || 0) }))
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 10);

      const sessionsByChannel = rawSessionsByChannel
        .map((c: any) => ({ channel: c?.channel || "Unassigned", sessions: Number(c?.sessions || 0) }))
        .sort((a: any, b: any) => b.sessions - a.sessions)
        .slice(0, 8);

      const eventsByEventName = rawEventsByName
        .map((e: any) => ({ eventName: e?.eventName || "unknown_event", count: Number(e?.count || 0) }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10);

      const keyEventsByPlatform = rawKeyEventsByPlatform
        .map((k: any) => ({ platform: k?.platform || "web", keyEvents: Number(k?.keyEvents || 0) }))
        .sort((a: any, b: any) => b.keyEvents - a.keyEvents)
        .slice(0, 6);

      const userActivityOverTime = (Array.isArray(report.chart_datasets) ? report.chart_datasets : []).map((d: any) => ({
        date: toIsoDateLabel(String(d?.label || "")),
        users: Number(d?.valueA || 0),
      }));

      const rawAdvice = Array.isArray(report.ai_recommendations) ? report.ai_recommendations : [];
      const adviceList = rawAdvice.map((adv: any) => {
        if (typeof adv === 'string') {
          return { title: "SEO Advice", description: adv, impact: "High", effort: "Medium" };
        }
        return {
          title: adv?.title || "SEO Advice",
          description: adv?.description || "Actionable insight",
          impact: adv?.impact || "High",
          effort: adv?.effort || "Medium"
        };
      });

      return {
        title: `${cat} Report`,
        narrative1,
        narrative2,
        tableHeader1: ["Metric", "Current", "Previous", "Change"],
        tableData1,
        chartData: report.chart_datasets || [],
        chartLabelA: chartLabels.a,
        chartLabelB: chartLabels.b,
        chartLabelC: chartLabels.c,
        tableHeader2,
        tableData2,
        adviceList,
        isMocked: false,
        reportStartDate: startDate,
        reportEndDate: endDate,
        topCountries,
        topPages,
        topPageTitles,
        sessionsByChannel,
        eventsByEventName,
        keyEventsByPlatform,
        userActivityOverTime,
        aiTopKeywordsOverview: topKeywordsOverview,
        tableExplanations: aiTableExplanations,
      };
    } else if (cat === "Performance Marketing") {
      const as = kpi.ad_spend || {};
      const mi = kpi.meta_impressions || {};
      tableData1 = [
        { metric: "Ad Spend (Google)", current: `$${as.current?.toFixed(2) || "0.00"}`, previous: `$${as.previous?.toFixed(2) || "0.00"}`, change: as.change_percent ? (as.change_percent.startsWith("-") ? as.change_percent : `+${as.change_percent}`) + "%" : "0%" },
        { metric: "Meta Impressions", current: mi.current?.toLocaleString() || "0", previous: mi.previous?.toLocaleString() || "0", change: mi.change_percent ? (mi.change_percent.startsWith("-") ? mi.change_percent : `+${mi.change_percent}`) + "%" : "N/A" },
      ];
      chartLabels = { a: "Ad Spend ($)", b: "Impressions", c: "Clicks" };
    } else if (cat === "Social Media Marketing") {
      const fi = kpi.fb_impressions || {};
      const ii = kpi.ig_impressions || {};
      tableData1 = [
        { metric: "FB Page Impressions", current: fi.current?.toLocaleString() || "0", previous: fi.previous?.toLocaleString() || "0", change: fi.change_percent ? (fi.change_percent.startsWith("-") ? fi.change_percent : `+${fi.change_percent}`) + "%" : "0%" },
        { metric: "IG Impressions", current: ii.current?.toLocaleString() || "0", previous: ii.previous?.toLocaleString() || "0", change: ii.change_percent ? (ii.change_percent.startsWith("-") ? ii.change_percent : `+${ii.change_percent}`) + "%" : "N/A" },
      ];
      chartLabels = { a: "FB Impressions", b: "IG Impressions", c: "" };
    }

    const rawAdvice = Array.isArray(report.ai_recommendations) ? report.ai_recommendations : [];
    const adviceList = rawAdvice.map((adv: any) => {
      if (typeof adv === 'string') {
        return { title: "Strategic Advice", description: adv, impact: "High", effort: "Medium" };
      }
      return {
        title: adv?.title || "Strategic Advice",
        description: adv?.description || "Actionable insight",
        impact: adv?.impact || "High",
        effort: adv?.effort || "Medium"
      };
    });

    return {
      title: `${cat} Report`,
      narrative1,
      narrative2,
      tableHeader1: ["Metric", "Current", "Previous", "Change"],
      tableData1,
      chartData: report.chart_datasets || [],
      chartLabelA: chartLabels.a,
      chartLabelB: chartLabels.b,
      chartLabelC: chartLabels.c,
      tableHeader2,
      tableData2,
      adviceList,
      isMocked: false,
      reportStartDate: startDate,
      reportEndDate: endDate,
      topCountries: [],
      topPages: [],
      topPageTitles: [],
      sessionsByChannel: [],
      eventsByEventName: [],
      keyEventsByPlatform: [],
      userActivityOverTime: (report.chart_datasets || []).map((d: any) => ({ date: d.label, users: Number(d.valueA || 0) })),
      aiTopKeywordsOverview: report.ai_top_keywords_overview || "",
      tableExplanations: aiTableExplanations,
    };
  };

  const fetchStoredReport = async (siteId: string, startDate: string, endDate: string, cat: string) => {
    const { data: report, error } = await supabase
      .from("processed_reports")
      .select("*")
      .eq("site_id", siteId)
      .eq("module", cat === "SEO" ? "seo" : cat === "Performance Marketing" ? "performance" : "social")
      .eq("start_date", startDate)
      .eq("end_date", endDate)
      .maybeSingle();

    if (error) {
      console.error("Stored report lookup error", error);
      return null;
    }

    if (!report) return null;

    if (cat === "SEO" && !isCompleteSeoDatabaseReport(report)) {
      return null;
    }

    return buildReportFromRow(report, cat, startDate, endDate);
  };

  const fetchReportData = async (siteToQuery = activeSite, dateRangeToQuery = dates, cat = category) => {
    if (!siteToQuery) return;
    const normalizedDates = normalizeDateRange(dateRangeToQuery);
    setIsLoading(true);
    setPollingStatus("Contacting API...");
    setErrorMsg(null);

    const cachedReport = await fetchStoredReport(siteToQuery.id, normalizedDates.startDate, normalizedDates.endDate, cat);
    if (cachedReport) {
      setReportData(cachedReport);
      setIsLoading(false);
      setPollingStatus("Loaded from Supabase cache");
      localStorage.setItem(getReportCacheKey(siteToQuery.id, cat, normalizedDates.startDate, normalizedDates.endDate), JSON.stringify(cachedReport));
      return;
    }

    // Check credentials before calling API
    const hasCredentials = await checkSiteCredentials();
    if (!hasCredentials) {
      setIsLoading(false);
      return;
    }

    const webhookPath =
      cat === "SEO" ? "seo-report" :
      cat === "Performance Marketing" ? "performance-report" : "social-report";
    const webhookUrl = `${import.meta.env.VITE_API_URL}/${webhookPath}`;

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          site_id: siteToQuery.id,
          start_date: normalizedDates.startDate,
          end_date: normalizedDates.endDate,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const { report_id, data: immediateData } = await response.json();
      if (!report_id) throw new Error("API did not return a report_id");

      if (immediateData) {
        const formattedReport = buildReportFromRow(immediateData, cat, normalizedDates.startDate, normalizedDates.endDate);
        setReportData(formattedReport);
        localStorage.setItem(getReportCacheKey(siteToQuery.id, cat, normalizedDates.startDate, normalizedDates.endDate), JSON.stringify(formattedReport));
        setIsLoading(false);
        setPollingStatus("Loaded cached report");
        return;
      }

      let attempts = 0;
      const POLL_TIMEOUT_SEC = 300; // Increased to 5 minutes for AI processing
      const startTime = Date.now();

      const loadCompletedReport = async (retries = 5) => {
        for (let attempt = 0; attempt < retries; attempt++) {
          const { data: report, error: reportError } = await supabase
            .from("processed_reports")
            .select("*")
            .eq("report_id", report_id)
            .maybeSingle();

          if (reportError) {
            console.error("Report load error", reportError);
          }

          if (report) {
            const formattedReport = buildReportFromRow(report, cat, normalizedDates.startDate, normalizedDates.endDate);
            setReportData(formattedReport);
            localStorage.setItem(getReportCacheKey(siteToQuery.id, cat, normalizedDates.startDate, normalizedDates.endDate), JSON.stringify(formattedReport));
            return true;
          }

          if (attempt < retries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        return false;
      };

      const pollInterval = setInterval(async () => {
        attempts++;
        const elapsed = (Date.now() - startTime) / 1000;

        const { data, error } = await supabase
          .from("report_status")
          .select("status, error_message")
          .eq("report_id", report_id)
          .maybeSingle();

        if (error) {
          console.error("Poll error", error);
          return;
        }

        if (data?.status) {
          const statusMap: Record<string, string> = {
            'pending': 'Queuing report request...',
            'fetching_credentials': 'Retrieving API credentials from Agency settings...',
            'fetching_ga4': 'Downloading metrics from Google Analytics 4...',
            'fetching_gsc': 'Retrieving top queries from Search Console...',
            'fetching_gads': 'Downloading Google Ads performance data...',
            'fetching_meta': 'Fetching Meta Insights...',
            'fetching_data': 'Downloading raw metrics from external APIs...',
            'processing': 'Aggregating metrics and building charts...',
            'generating_ai': 'Consulting Gemini AI for insights & recommendations...',
            'completed': 'Finalizing report...'
          };
          setPollingStatus(statusMap[data.status] || data.status);
        }

        if (data?.status === "completed") {
          clearInterval(pollInterval);
          const loaded = await loadCompletedReport();
          if (!loaded) {
            setErrorMsg("The backend finished, but the completed report was not readable yet. Please retry in a few seconds.");
          }
          setIsLoading(false);
        } else if (data?.status === "failed") {
          clearInterval(pollInterval);
          setIsLoading(false);
          setErrorMsg(data?.error_message || "Backend workflow failed. Check API logs.");
        } else if (elapsed > POLL_TIMEOUT_SEC) {
          clearInterval(pollInterval);
          setIsLoading(false);
          setErrorMsg(`Polling timeout after ${POLL_TIMEOUT_SEC} seconds.`);
        }
      }, 3000);
    } catch (err: any) {
      console.error("API trigger error:", err);
      setIsLoading(false);
      setErrorMsg(err.message || "Failed to start report generation");
    }
  };

  // Load cached report on tab switch or site switch
  useEffect(() => {
    const loadReport = async () => {
      const normalizedDates = normalizeDateRange(dates);
      const cacheKey = getReportCacheKey(activeSite.id, category, normalizedDates.startDate, normalizedDates.endDate);
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const isStaleSeoCache = category === "SEO" && !isCompleteSeoCachedReport(parsed);

          if (!isStaleSeoCache) {
            setReportData(parsed);
            return;
          }
          localStorage.removeItem(cacheKey);
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }

      // If not in local cache, try fetching from Supabase instantly
      const stored = await fetchStoredReport(activeSite.id, normalizedDates.startDate, normalizedDates.endDate, category);
      if (stored) {
        setReportData(stored);
        localStorage.setItem(cacheKey, JSON.stringify(stored));
      } else {
        setReportData(null);
      }
    };

    loadReport();
  }, [activeSite, category, dates.startDate, dates.endDate]);

  // Handle explicit user submission of date-range generate
  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedDates = normalizeDateRange(dates);
    if (normalizedDates.startDate !== dates.startDate || normalizedDates.endDate !== dates.endDate) {
      setDates(normalizedDates);
    }
    fetchReportData(activeSite, normalizedDates, category);
  };

  // Exporter to trigger download of DOC memo
  const handleDownloadDoc = () => {
    if (!reportData) return;
    const includeAdvice = section === "BnB Report";
    
    const plainTextMemo = `
========================================
BNB.AI ENTERPRISE INTEL REPORT
========================================
Profile Name: ${activeSite.name}
Website: ${activeSite.url}
Focus: ${category} - ${section}
Date Period: ${dates.startDate} to ${dates.endDate}

TITLE: ${reportData.title}

1. OVERVIEW TREND ANALYSIS:
${reportData.narrative1}

2. CORE METRICS CONSOLIDATED MATRIX:
----------------------------------------
${reportData.tableHeader1.join(" | ")}
----------------------------------------
${reportData.tableData1
  .map((row) => `${row.metric} | ${row.current} | ${row.previous} | ${row.change}`)
  .join("\n")}
----------------------------------------

3. CONTEXTUAL METRICS SEGMENTATION:
${reportData.narrative2}

${
  reportData.tableData2 && reportData.tableHeader2
    ? `
----------------------------------------
${reportData.tableHeader2.join(" | ")}
----------------------------------------
${reportData.tableData2
  .map((row) => `${row.item} | ${row.value} | ${row.share} | ${row.trend}`)
  .join("\n")}
----------------------------------------
`
    : ""
}

${
  includeAdvice && reportData.adviceList.length > 0
    ? `
4. AI REAL-TIME RECOMMENDATIONS & ADVICE:
${reportData.adviceList
  .map((adv, idx) => `[Recommendation ${idx + 1}] ${adv.title}\nImpact: ${adv.impact} | Effort: ${adv.effort}\nDetails: ${adv.description}\n`)
  .join("\n")}
`
    : ""
}

Report compiled securely via standard AI Marketing Intelligence SDK - {new Date().getFullYear()}.
`;

    const blob = new Blob([plainTextMemo], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activeSite.name.replace(/\s+/g, "_")}_${category.replace(/\s+/g, "_")}_Report.txt`;
    link.click();
  };

  // Trigger browser print to allow PDF generation
  const handlePrintPdf = () => {
    window.print();
  };

  // Setup dynamic color wheel for charts
  const CHART_COLORS = ["#1a1a1a", "#d97706", "#4b5563", "#059669", "#2563eb"];
  const isSeoCategory = category === "SEO";

  const renderSeoMarketingCharts = () => {
    if (!reportData) return null;

    const topCountries = reportData.topCountries || [];
    const userActivity = reportData.userActivityOverTime || [];
    const topPageTitles = reportData.topPageTitles || [];
    const sessionsByChannel = reportData.sessionsByChannel || [];
    const eventsByEventName = reportData.eventsByEventName || [];
    const keyEventsByPlatform = reportData.keyEventsByPlatform || [];

    return (
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-2xl border border-stone-100">
          <h3 className="font-bold mb-4 text-neutral-900">Active users by country</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ReBarChart data={topCountries} layout="vertical" margin={{ left: 10, right: 10, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="country" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReBar dataKey="users" fill="#1a1a1a" radius={[0, 4, 4, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100">
          <h3 className="font-bold mb-4 text-neutral-900">User activity over time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ReLineChart data={userActivity} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1ece3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReLine type="monotone" dataKey="users" stroke="#d97706" strokeWidth={2.5} dot={false} />
            </ReLineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100">
          <h3 className="font-bold mb-4 text-neutral-900">Views by page title / screen class</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ReBarChart data={topPageTitles.slice(0, 8)} margin={{ left: 0, right: 10, top: 8, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="title" angle={-20} textAnchor="end" interval={0} height={85} tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <ReBar dataKey="views" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100">
          <h3 className="font-bold mb-4 text-neutral-900">Event count by event name</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ReBarChart data={eventsByEventName.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 10, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="eventName" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReBar dataKey="count" fill="#d97706" radius={[0, 4, 4, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-100">
            <h3 className="font-bold mb-4 text-neutral-900">Sessions by channel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <RePie
                  data={sessionsByChannel}
                  dataKey="sessions"
                  nameKey="channel"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {sessionsByChannel.map((_, idx) => (
                    <Cell key={`session-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </RePie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-100">
            <h3 className="font-bold mb-4 text-neutral-900">Key events by platform</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <RePie
                  data={keyEventsByPlatform}
                  dataKey="keyEvents"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {keyEventsByPlatform.map((_, idx) => (
                    <Cell key={`platform-${idx}`} fill={CHART_COLORS[(idx + 1) % CHART_COLORS.length]} />
                  ))}
                </RePie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderSeoAlternatingBlocks = (includeCharts: boolean) => {
    if (!reportData) return null;
    const tableExplanations = reportData.tableExplanations || {};

    const topCountries = reportData.topCountries || [];
    const userActivity = reportData.userActivityOverTime || [];
    const topPages = reportData.topPageTitles || [];
    const eventsByEventName = reportData.eventsByEventName || [];
    const sessionsByChannel = reportData.sessionsByChannel || [];
    const keyEventsByPlatform = reportData.keyEventsByPlatform || [];

    const totalUsersByCountry = topCountries.reduce((sum, row) => sum + Number(row.users || 0), 0);
    const topCountry = topCountries[0];
    const peakDay = [...userActivity].sort((a, b) => b.users - a.users)[0];
    const topPage = topPages[0];
    const topEvent = eventsByEventName[0];
    const topChannel = sessionsByChannel[0];
    const topPlatform = keyEventsByPlatform[0];

    const blockCardClass = "border border-stone-100 rounded-xl overflow-hidden bg-white";
    const sentenceClass = "px-4 py-3 text-sm text-neutral-600 bg-stone-50 border-b border-stone-100";

    const blocks = [
      {
        title: "Active users by country",
        sentence: tableExplanations.active_users_by_country || (topCountry
          ? `The table below shows country-level active users, where ${topCountry.country} contributes the highest traffic.`
          : "The table below shows country-level active users for the selected period."),
        headers: ["Country", "Users"],
        rows: topCountries.slice(0, 8).map((r) => [r.country, r.users.toLocaleString()]),
        chart: (
          <ResponsiveContainer width="100%" height={220}>
            <ReBarChart data={topCountries.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 10, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="country" width={100} tick={{ fontSize: 10 }} />
              <Tooltip />
              <ReBar dataKey="users" fill="#1a1a1a" radius={[0, 4, 4, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        )
      },
      {
        title: "User activity over time",
        sentence: tableExplanations.user_activity_over_time || (peakDay
          ? `The table below summarizes daily users, with a peak on ${peakDay.date} at ${peakDay.users.toLocaleString()} users.`
          : "The table below summarizes daily users during the selected period."),
        headers: ["Date", "Users"],
        rows: userActivity.slice(-10).map((r) => [r.date, r.users.toLocaleString()]),
        chart: (
          <ResponsiveContainer width="100%" height={220}>
            <ReLineChart data={userActivity} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1ece3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <ReLine type="monotone" dataKey="users" stroke="#d97706" strokeWidth={2} dot={false} />
            </ReLineChart>
          </ResponsiveContainer>
        )
      },
      {
        title: "Views by page title / screen class",
        sentence: tableExplanations.views_by_page_title || (topPage
          ? `The table below lists top page titles by views, led by "${topPage.title}".`
          : "The table below lists top page titles by views."),
        headers: ["Page title", "Views"],
        rows: topPages.slice(0, 8).map((r) => [r.title, r.views.toLocaleString()]),
        chart: (
          <ResponsiveContainer width="100%" height={220}>
            <ReBarChart data={topPages.slice(0, 8)} margin={{ left: 0, right: 10, top: 8, bottom: 65 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="title" angle={-18} textAnchor="end" interval={0} height={80} tick={{ fontSize: 9 }} />
              <YAxis />
              <Tooltip />
              <ReBar dataKey="views" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        )
      },
      {
        title: "Sessions by channel",
        sentence: tableExplanations.sessions_by_channel || (topChannel
          ? `The table below compares sessions by channel, with ${topChannel.channel} as the leading source.`
          : "The table below compares sessions by channel."),
        headers: ["Channel", "Sessions"],
        rows: sessionsByChannel.slice(0, 8).map((r) => [r.channel, r.sessions.toLocaleString()]),
        chart: (
          <ResponsiveContainer width="100%" height={220}>
            <RePieChart>
              <RePie data={sessionsByChannel} dataKey="sessions" nameKey="channel" cx="50%" cy="50%" outerRadius={85} label>
                {sessionsByChannel.map((_, idx) => (
                  <Cell key={`session-block-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </RePie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        )
      },
      {
        title: "Event count by event name",
        sentence: tableExplanations.event_count_by_event_name || (topEvent
          ? `The table below highlights event activity, where ${topEvent.eventName} has the highest count.`
          : "The table below highlights event activity by event name."),
        headers: ["Event", "Count"],
        rows: eventsByEventName.slice(0, 8).map((r) => [r.eventName, r.count.toLocaleString()]),
        chart: (
          <ResponsiveContainer width="100%" height={220}>
            <ReBarChart data={eventsByEventName.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 10, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="eventName" width={100} tick={{ fontSize: 10 }} />
              <Tooltip />
              <ReBar dataKey="count" fill="#d97706" radius={[0, 4, 4, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        )
      },
      {
        title: "Key events by platform",
        sentence: tableExplanations.key_events_by_platform || (topPlatform
          ? `The table below summarizes platform-level key events, with ${topPlatform.platform} contributing the highest volume.`
          : "The table below summarizes key events by platform."),
        headers: ["Platform", "Key events"],
        rows: keyEventsByPlatform.slice(0, 8).map((r) => [r.platform, r.keyEvents.toLocaleString()]),
        chart: (
          <ResponsiveContainer width="100%" height={220}>
            <RePieChart>
              <RePie data={keyEventsByPlatform} dataKey="keyEvents" nameKey="platform" cx="50%" cy="50%" outerRadius={85} label>
                {keyEventsByPlatform.map((_, idx) => (
                  <Cell key={`platform-block-${idx}`} fill={CHART_COLORS[(idx + 1) % CHART_COLORS.length]} />
                ))}
              </RePie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        )
      },
    ];

    return (
      <div className="space-y-5">
        {blocks.map((block) => (
          <div key={block.title} className={blockCardClass}>
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
              <h4 className="text-sm font-semibold text-neutral-900">{block.title}</h4>
            </div>
            <p className={sentenceClass}>{block.sentence}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-stone-500 uppercase tracking-widest font-mono text-[9px] border-b border-stone-100">
                    {block.headers.map((h) => (
                      <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-stone-50 last:border-b-0">
                      {row.map((col, cidx) => (
                        <td key={cidx} className="px-4 py-2.5 text-neutral-700">{col}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {includeCharts && (
              <div className="px-3 py-3 border-t border-stone-100 bg-[#fcfcfb]">
                {block.chart}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 font-sans flex flex-col selection:bg-amber-100 selection:text-amber-900">
      
      {/* 1. TOP NAVIGATION AREA */}
      <nav id="dashboard-navbar" className="bg-white border-b border-[#eae6dd] h-16 px-6 sticky top-0 z-40 flex items-center justify-between">
        
        {/* Left Side: Brand Logo \& Interactive Site Selector */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 cursor-pointer" onClick={() => fetchReportData()}>
            <div className="h-7 w-7 bg-neutral-900 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-amber-100" />
            </div>
            <span className="font-display font-semibold text-neutral-900 text-sm tracking-tight">BNB.AI</span>
          </div>

          <div className="h-5 w-px bg-stone-200"></div>

          {/* Active Site Container switch dropdown */}
          <div className="relative flex items-center">
            <span className="text-xs text-neutral-400 mr-2 font-mono hidden sm:inline uppercase">Current site:</span>
            <div className="relative">
              <select
                id="site-nav-select"
                value={activeSite.id}
                onChange={(e) => {
                  const selection = sites.find((s) => s.id === e.target.value);
                  if (selection) setActiveSite(selection);
                }}
                className="bg-[#fbfcfa] border border-[#e2dec9] rounded-lg text-xs font-semibold text-neutral-800 py-1.5 pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer hover:border-neutral-900 transition-colors"
              >
                {sites.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.url.replace("https://", "").replace("http://", "")})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-neutral-500">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Profile drop panel element */}
        <div className="relative">
          <button
            id="top-profile-trigger"
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center space-x-2 pl-3 py-1 pr-1 border border-[#e2dec9] rounded-full hover:border-[#1a1a1a] transition-all bg-stone-50/50"
          >
            <div className="h-7 w-7 bg-neutral-900 rounded-full flex items-center justify-center font-display text-amber-50 text-xs font-bold shrink-0">
              {user.name ? user.name.charAt(0) : "A"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[11px] font-bold leading-none text-neutral-800">{user.name}</p>
              <p className="text-[9px] text-[#888] scale-95 leading-none mt-1 origin-left truncate max-w-[110px]">{user.email}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
          </button>

          {/* Connected Site Dropdown list */}
          {isProfileDropdownOpen && (
            <div id="profile-dropdown-card" className="absolute right-0 mt-2.5 w-72 bg-white rounded-2xl border border-[#e0dcce] shadow-xl p-5 origin-top-right z-50">
              
              {/* User overview section */}
              <div className="pb-4 border-b border-stone-100 flex items-center space-x-3">
                <div className="h-9 w-9 bg-[#1a1a1a] rounded-full flex items-center justify-center text-amber-100 font-display font-bold text-sm">
                  {user.name ? user.name.charAt(0) : "A"}
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-neutral-900">{user.name}</h5>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Connected profiles list quick links */}
              <div className="py-4 border-b border-stone-100">
                <p className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest mb-2.5">
                  Connected Site Profiles
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {sites.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setActiveSite(st);
                        setIsProfileDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        st.id === activeSite.id
                          ? "bg-amber-50 text-amber-900 font-medium border border-amber-200/50"
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <span className="truncate pr-2">{st.name}</span>
                      <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    onOpenSiteManagement();
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full text-left font-mono text-[10px] text-amber-700 hover:underline mt-3 flex items-center space-x-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register new Site Profile</span>
                </button>
              </div>

              {/* View More footer navigation option */}
              <div className="pt-3 flex items-center justify-between">
                <button
                  onClick={() => {
                    onOpenSiteManagement();
                    setIsProfileDropdownOpen(false);
                  }}
                  className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:underline"
                >
                  View More &rarr;
                </button>

                <button
                  onClick={onLogout}
                  className="text-[10px] font-mono font-bold text-[#b91c1c] hover:underline"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Grid container: Left Sidebar and Main Area */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto">
        
        {/* 2. LEFT SIDEBAR NAVIGATION */}
        <aside
          id="sidebar-navigation"
          className="w-full md:w-64 bg-white border-r border-[#eae6dd] py-6 px-4 shrink-0 flex flex-col gap-6"
        >
          {/* Active Site profile banner summary */}
          <div className="bg-[#FAF9F5] border border-[#e2dec9] rounded-xl p-3.5">
            <span className="text-[9px] font-mono font-bold text-stone-400 block tracking-wider uppercase mb-1">
              Active Business Container
            </span>
            <p className="font-display font-semibold text-xs text-neutral-900 truncate leading-snug">{activeSite.name}</p>
            <p className="text-[10px] text-amber-700 font-mono truncate scale-95 origin-left mt-0.5">{activeSite.url}</p>
            <span className="inline-flex items-center text-[9px] font-semibold font-mono text-[#555] bg-neutral-200/50 border border-neutral-300/30 rounded px-2 py-0.5 mt-2">
              {activeSite.industry}
            </span>
          </div>

          {/* Navigation Categories with Interactive submenus on hover/click */}
          <div className="space-y-4 flex-1">
            <p className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest px-2.5">
              Marketing Intelligence
            </p>

            <div className="space-y-2">
              {[
                { label: "SEO", icon: TrendingUp },
                { label: "Performance Marketing", icon: BarChart2 },
                { label: "Social Media Marketing", icon: Users },
              ].map((item) => {
                const isSelected = category === item.label;
                const isHovered = hoveredCategory === item.label;
                const CategoryIcon = item.icon;

                return (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredCategory(item.label)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className="space-y-1 relative"
                  >
                    <button
                      onClick={() => setCategory(item.label as any)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl font-display text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-neutral-900 text-amber-50 shadow"
                          : "hover:bg-stone-50 text-neutral-700"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <CategoryIcon className={`h-4.5 w-4.5 ${isSelected ? "text-amber-200" : "text-stone-400"}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronRight className={`h-3 w-3 transition-transform ${isSelected ? "rotate-90 text-amber-200" : "text-stone-300"}`} />
                    </button>

                    {/* Submenu of Reports, Graphs, BnB Report, Client Report */}
                    {/* Shows permanently if selected, OR temporarily on hover! */}
                    {(isSelected || isHovered) && (
                      <div className="pl-6 pt-1 pb-1.5 space-y-1 bg-amber-50/15 border-l border-stone-200 ml-5 rounded-bl-lg transition-transform">
                        {[
                          { name: "Reports", label: "AI Analysis" },
                          { name: "Graphs", label: "Visual Charts" },
                          { name: "BnB Report", label: "Internal Strategy" },
                          { name: "Client Report", label: "Client Summary" },
                        ].map((sub) => {
                          const isSubSelected = isSelected && section === sub.name;
                          return (
                            <button
                              key={sub.name}
                              onClick={() => {
                                setCategory(item.label as any);
                                setSection(sub.name as any);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] flex items-center justify-between transition-colors ${
                                isSubSelected
                                  ? "text-neutral-900 font-semibold bg-[#faf9f5]"
                                  : "text-stone-500 hover:text-stone-900"
                              }`}
                            >
                              <span>{sub.name}</span>
                              <span className="text-[8px] font-mono font-medium text-stone-300 scale-90">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100 text-[10px] text-neutral-400 font-mono space-y-1 pb-4">
            <p>Platform status: Online</p>
            <p>UTC Sync: {new Date().toISOString().split('T')[0]}</p>
          </div>
        </aside>

        {/* 3. MAIN CONTENT AREA */}
        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          
          {/* Header Module Header with Dates selection panel at top */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-[#eae6dd] rounded-2xl p-5 shadow-sm">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-amber-700 tracking-wider uppercase mb-1">
                <span>{category}</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>{section}</span>
              </div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-neutral-900">
                {activeSite.name}
              </h1>
            </div>

            {/* Date Picker Form */}
            <form onSubmit={handleGenerateReport} className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 bg-[#FAF9F5] border border-[#e2dec9] rounded-lg px-3 py-1.5">
                <Calendar className="h-4.5 w-4.5 text-neutral-400" />
                <div className="flex items-center space-x-1.5 text-xs text-neutral-700">
                  <input
                    type="date"
                    value={dates.startDate}
                    onChange={(e) => setDates({ ...dates, startDate: e.target.value })}
                    className="bg-transparent border-none text-neutral-800 font-semibold focus:outline-none"
                    placeholder="Start date"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dates.endDate}
                    onChange={(e) => setDates({ ...dates, endDate: e.target.value })}
                    className="bg-transparent border-none text-neutral-800 font-semibold focus:outline-none"
                    placeholder="End date"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-amber-100 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center space-x-1.5"
              >
                {isLoading ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>Synchronizing Ads...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Generate AI Report</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={testWebhook}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold rounded-lg border border-stone-200 transition-all flex items-center space-x-1.5"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Test Webhook</span>
              </button>
            </form>
          </div>

          {/* ERROR DISPLAY */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold">Generation Failed</p>
                  <p className="mt-1 opacity-90">{errorMsg}</p>
                </div>
              </div>
              <button
                onClick={() => fetchReportData()}
                className="px-3 py-1 bg-white border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* LOADING STATE REASSURING BANNER */}
          {isLoading ? (
            <div className="py-24 text-center bg-white border border-[#eae6dd] rounded-2xl shadow-sm space-y-4 animate-pulse">
              <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-200">
                <Clock className="h-5 w-5 text-amber-700 animate-spin" />
              </div>
              <h3 className="font-display font-medium text-lg text-neutral-900">{pollingStatus}</h3>
              <p className="text-sm text-neutral-500 max-w-md mx-auto">
                BNB.AI is connecting to your marketing properties and running narrative analysis. This typically takes 30-60 seconds.
              </p>
            </div>
          ) : reportData ? (
            
            /* DYNAMIC REPORTS SEGENTS INTERFACES */
            <div className="space-y-6">
              {/* SECTION 11 — reports view */}
              {section === "Reports" && (
                <div className="space-y-6 bg-white border border-[#eae6dd] rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-2">
                    <h3 className="font-display font-bold text-lg text-neutral-900">{reportData.title}</h3>
                  </div>

                  <div className="border border-stone-100 rounded-xl overflow-hidden bg-white">
                    <p className="p-4 text-sm text-neutral-700 font-serif leading-relaxed bg-amber-50/20 border-b border-amber-100">
                      {reportData.narrative1}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-100 text-stone-500 uppercase tracking-widest font-mono text-[9px]">
                            {reportData.tableHeader1.map((head, i) => (
                              <th key={i} className="py-3 px-4 font-semibold">{head}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.tableData1.map((row, idx) => (
                            <tr key={idx} className="border-b border-stone-50 hover:bg-stone-50/50 text-neutral-700">
                              <td className="py-2.5 px-4 font-medium text-neutral-900">{row.metric}</td>
                              <td className="py-2.5 px-4 font-mono">{row.current}</td>
                              <td className="py-2.5 px-4 text-stone-500 font-mono">{row.previous}</td>
                              <td className="py-2.5 px-4 font-semibold">
                                <span className={(row.change && typeof row.change === "string" && row.change.startsWith("+")) ? "text-emerald-700" : "text-amber-850"}>
                                  {row.change || ""}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {reportData.tableData2 && reportData.tableHeader2 && (
                    <div className="border border-stone-100 rounded-xl overflow-hidden bg-white">
                      <p className="p-4 text-sm text-neutral-600 leading-relaxed bg-stone-50 border-b border-stone-100">
                        {reportData.narrative2}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-stone-50 border-b border-stone-100 text-stone-500 uppercase tracking-widest font-mono text-[9px]">
                              {reportData.tableHeader2.map((head, i) => (
                                <th key={i} className="py-2.5 px-4 font-semibold">{head}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.tableData2.map((row, idx) => (
                              <tr key={idx} className="border-b border-stone-50 hover:bg-stone-50/50 text-neutral-700">
                                <td className="py-2.5 px-4 font-medium text-neutral-900">{row.item}</td>
                                <td className="py-2.5 px-4 font-mono">{row.value}</td>
                                <td className="py-2.5 px-4 text-stone-400 font-mono">{row.share}</td>
                                <td className="py-2.5 px-4 font-medium">
                                  <span className={(row.trend && typeof row.trend === "string" && (row.trend.includes("Strong") || row.trend.includes("Positive") || row.trend.includes("Accelerat"))) ? "text-emerald-700" : "text-stone-500"}>
                                    {row.trend || ""}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {isSeoCategory && (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider">Structured SEO Breakdown</p>
                      {renderSeoAlternatingBlocks(false)}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 12 — GRAPHS VIEW */}
              {section === "Graphs" && (
                <div className="bg-white border border-[#eae6dd] rounded-2xl p-6 shadow-sm">
                  {isSeoCategory ? (
                    renderSeoMarketingCharts()
                  ) : (
                    <div className="space-y-4">
                      <h3 className="font-display font-semibold text-neutral-900 text-sm">Performance Trend</h3>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={reportData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1ece3" />
                            <XAxis dataKey="label" stroke="#888" fontSize={10} />
                            <YAxis stroke="#888" fontSize={10} />
                            <Tooltip />
                            <ReLine type="monotone" dataKey="valueA" stroke="#1a1a1a" strokeWidth={2} name={reportData.chartLabelA} />
                            <ReLine type="monotone" dataKey="valueB" stroke="#d97706" strokeWidth={2} name={reportData.chartLabelB} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 13 — BNB REPORT SECTION (Detailed Personal Strategic Analysis) */}
              {section === "BnB Report" && (
                <div className="space-y-6 bg-white border border-[#eae6dd] rounded-2xl p-6 md:p-8 shadow-sm print:border-none print:shadow-none">
                  
                  {/* Title and Download actions bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-[#1a1a1a] text-amber-100 px-2.5 py-1 rounded">
                        Business & Brand Strategy Report
                      </span>
                      <h3 className="font-display font-bold text-lg text-neutral-900 mt-2">{reportData.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadDoc}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-neutral-700 text-xs font-semibold rounded-lg border border-stone-350 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Word (DOC)</span>
                      </button>
                      <button
                        onClick={handlePrintPdf}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-50 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* SENTENCE */}
                  <div className="p-4 bg-stone-50 border-l-4 border-neutral-900 rounded-r-xl">
                    <p className="text-sm text-neutral-700 font-serif leading-relaxed">
                      {reportData.narrative1}
                    </p>
                  </div>

                  {/* TABLE */}
                  <div className="overflow-x-auto border border-stone-100 rounded-xl my-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-100 text-stone-500 uppercase tracking-widest font-mono text-[9px]">
                          {reportData.tableHeader1.map((head, i) => (
                            <th key={i} className="py-2.5 px-4 font-semibold">{head}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.tableData1.map((row, idx) => (
                          <tr key={idx} className="border-b border-stone-50 text-neutral-750">
                            <td className="py-2.5 px-4 font-semibold text-stone-900">{row.metric}</td>
                            <td className="py-2.5 px-4 font-mono">{row.current}</td>
                            <td className="py-2.5 px-4 text-stone-400 font-mono">{row.previous}</td>
                            <td className="py-2.5 px-4 font-bold text-amber-700">{row.change}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {isSeoCategory ? (
                    <>
                      <div className="p-4 bg-[#fafbfc] border border-stone-150 rounded-xl my-6">
                        <p className="text-xs font-semibold text-neutral-600 mb-3 uppercase tracking-wider font-mono scale-95">Sentence | Table | Chart Blocks</p>
                        {renderSeoAlternatingBlocks(true)}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-[#fafbfc] border border-stone-150 rounded-xl my-6">
                      <p className="text-xs font-semibold text-neutral-600 mb-3 uppercase tracking-wider font-mono scale-95">Internal Trajectory Trend Alignment</p>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={reportData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" fontSize={9} />
                            <YAxis fontSize={9} />
                            <Tooltip />
                            <ReLine type="monotone" dataKey="valueA" stroke="#1a1a1a" strokeWidth={2} name={reportData.chartLabelA} />
                            <ReLine type="monotone" dataKey="valueB" stroke="#d97706" strokeWidth={2} name={reportData.chartLabelB} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ADVICE / RECOMMENDATIONS */}
                  {reportData.adviceList.length > 0 && (
                    <div className="space-y-4 my-6">
                      <div className="flex items-center space-x-2 text-xs font-mono font-bold text-amber-800 tracking-wider uppercase border-b border-stone-100 pb-2">
                        <Sparkles className="h-4 w-4" />
                        <span>AI Executive Advice & Action Items</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {reportData.adviceList.map((adv, idx) => (
                          <div key={idx} className="bg-amber-50/20 border border-amber-300/40 p-5 rounded-xl space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="text-xs font-display font-semibold text-neutral-900">{adv.title}</h4>
                              <div className="flex gap-1.5 shrink-0 ml-2">
                                <span className="bg-neutral-900 text-amber-50 text-[8px] font-mono font-medium px-2 py-0.5 rounded">
                                  {adv.impact}
                                </span>
                                <span className="bg-stone-100 text-neutral-600 text-[8px] font-mono font-medium px-2 py-0.5 rounded border border-stone-200">
                                  {adv.effort}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-[#555] leading-normal">{adv.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECONDARY SENTENCE */}
                  <div className="text-xs text-neutral-400 font-serif pt-4 border-t border-stone-100 leading-normal">
                    This report compiles strategic parameters with generated outputs specifically prepared for {user.agencyName} administrators.
                  </div>
                </div>
              )}

              {/* SECTION 14 — CLIENT REPORT SECTION */}
              {section === "Client Report" && (
                <div className="space-y-6 bg-white border border-[#eae6dd] rounded-2xl p-6 md:p-8 shadow-sm print:border-none print:shadow-none">
                  
                  {/* Clean presentation-safe header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-neutral-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200 uppercase tracking-widest">
                        Client Presentation-Ready Report
                      </span>
                      <h3 className="font-display font-bold text-lg text-neutral-900 mt-2">{reportData.title}</h3>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleDownloadDoc}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-neutral-700 text-xs font-semibold rounded-lg border border-stone-300 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export DOCX</span>
                      </button>
                      <button
                        onClick={handlePrintPdf}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#333] text-amber-100 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* SENTENCE */}
                  <div className="p-4 bg-stone-50 rounded-xl leading-relaxed text-sm text-[#444] font-serif">
                    {reportData.narrative1}
                  </div>

                  {/* TABLE */}
                  <div className="overflow-x-auto border border-stone-100 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-100 text-stone-500 uppercase tracking-widest font-mono text-[9px]">
                          {reportData.tableHeader1.map((head, i) => (
                            <th key={i} className="py-2.5 px-4 font-semibold">{head}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.tableData1.map((row, idx) => (
                          <tr key={idx} className="border-b border-stone-50 hover:bg-stone-50 text-neutral-700">
                            <td className="py-3 px-4 font-medium text-neutral-900">{row.metric}</td>
                            <td className="py-3 px-4 font-mono font-semibold">{row.current}</td>
                            <td className="py-3 px-4 text-stone-400 font-mono">{row.previous}</td>
                            <td className="py-3 px-4 text-emerald-700 font-bold">{row.change}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {isSeoCategory ? (
                    <>
                      <div className="p-4 bg-[#fbfcfa] border border-stone-100 rounded-xl my-6">
                        <p className="text-xs font-semibold text-neutral-600 mb-3 uppercase tracking-wider font-mono">Sentence | Table | Chart Blocks</p>
                        {renderSeoAlternatingBlocks(true)}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-[#fbfcfa] border border-stone-100 rounded-xl my-6">
                      <p className="text-xs font-semibold text-neutral-600 mb-3 uppercase tracking-wider font-mono">Performance Metric Trends</p>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={reportData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" fontSize={9} />
                            <YAxis fontSize={9} />
                            <Tooltip />
                            <ReLine type="monotone" dataKey="valueA" stroke="#1a1a1a" strokeWidth={2} name={reportData.chartLabelA} />
                            <ReLine type="monotone" dataKey="valueB" stroke="#d97706" strokeWidth={2} name={reportData.chartLabelB} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* SENTENCE */}
                  <div className="p-4 bg-neutral-900 text-amber-50 rounded-xl text-xs sm:text-sm font-sans flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-neutral-100">Compiled by {user.agencyName}</h4>
                      <p className="text-neutral-400 scale-95 origin-left">Report authenticated via live system API credentials.</p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0 ml-3 hidden sm:block" />
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="py-24 text-center bg-white border border-[#eae6dd] rounded-2xl shadow-sm space-y-4">
              <div className="h-10 w-10 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-stone-200">
                <HelpCircle className="h-5 w-5 text-stone-400" />
              </div>
              <h3 className="font-display font-medium text-lg text-neutral-900">No report data found</h3>
              <p className="text-sm text-neutral-500 max-w-md mx-auto">
                Select a different date range or site, or click below to manually trigger an AI report generation.
              </p>
              <button
                onClick={() => fetchReportData()}
                className="px-6 py-2.5 bg-neutral-900 text-amber-50 rounded-xl text-xs font-bold shadow-lg hover:bg-neutral-800 transition-all"
              >
                Trigger Sync Now
              </button>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}



