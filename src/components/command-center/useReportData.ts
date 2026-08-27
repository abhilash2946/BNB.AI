import { useState, useRef, useEffect } from "react";
import { UserProfile, SiteProfile, DateRange, ReportResponse, RawReport, MarketingMetric } from "../../types";
import { supabase } from "../../lib/supabaseClient";
import toast from 'react-hot-toast';
import {
  POLLING_FALLBACK_DELAY_MS,
  REPORT_POLL_INTERVAL_MS,
  REPORT_COMPLETION_RETRIES,
  REPORT_RETRY_DELAY_MS
} from "../../constants/report";

const API_URL = import.meta.env.VITE_API_URL || "http://103.155.85.64:8000";

const formatPads = (v: any) => (typeof v === "number" ? v.toLocaleString('en-IN') : v || "0");

const formatPct = (cur: number, prev: number) => {
  if (!prev) return cur > 0 ? "+100%" : "0%";
  const pct = ((cur - prev) / prev) * 100;
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
};

const parseNumeric = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  const cleaned = val.replace(/[₹$,%X]/g, '').replace(/,/g, '').trim();
  return parseFloat(cleaned) || 0;
};

const toIsoDateLabel = (rawDate: string) => {
  if (!rawDate || rawDate.length !== 8) return rawDate;
  return `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
};

const safeJsonParse = (val: any) => {
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch (e) { return val; }
};

const normalizeList = (val: any) => {
  const parsed = safeJsonParse(val);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'string' && parsed.trim()) return [parsed];
  return [];
};

const extractGa4Lists = (report: RawReport) => {
  const ga4Details = safeJsonParse(report.ga4_details) || {};

  return {
    topPageTitles: normalizeList(report.top_page_titles).length > 0
      ? normalizeList(report.top_page_titles)
      : normalizeList(ga4Details.top_page_titles),
    topLandingPages: normalizeList(report.top_landing_pages).length > 0
      ? normalizeList(report.top_landing_pages)
      : normalizeList(ga4Details.top_landing_pages),
    sessionsByChannel: normalizeList(report.sessions_by_channel).length > 0
      ? normalizeList(report.sessions_by_channel)
      : normalizeList(ga4Details.sessions_by_channel),
    eventsByEventName: normalizeList(report.events_by_event_name).length > 0
      ? normalizeList(report.events_by_event_name)
      : normalizeList(ga4Details.events_by_event_name),
    keyEventsByPlatform: normalizeList(report.key_events_by_platform).length > 0
      ? normalizeList(report.key_events_by_platform)
      : normalizeList(ga4Details.key_events_by_platform),
    usersByCountry: normalizeList(report.users_by_country).length > 0
      ? normalizeList(report.users_by_country)
      : normalizeList(ga4Details.users_by_country)
  };
};

const buildSeoReport = (report: RawReport, startDate: string, endDate: string): ReportResponse => {
  const kpi = safeJsonParse(report.kpi_summary) || {};
  const aiTableExplanations = safeJsonParse(report.ai_table_explanations) || {};
  const multiCharts = safeJsonParse(report.charts) || null;
  const rawCompetitorAnalysis = safeJsonParse(report.ai_competitor_analysis) || null;
  const sectionAdvice = safeJsonParse(report.section_advice) || {};
  const ai_insights = safeJsonParse(report.ai_insights) || {};

  const ga4Lists = extractGa4Lists(report);

  const aiCompetitorAnalysis = {
    inferredActions: normalizeList(rawCompetitorAnalysis?.inferred_actions || rawCompetitorAnalysis?.inferredActions),
    recommendedSteps: normalizeList(rawCompetitorAnalysis?.actionable_steps || rawCompetitorAnalysis?.recommended_steps || rawCompetitorAnalysis?.recommendedSteps),
    competitor_breakdown: rawCompetitorAnalysis?.competitor_breakdown || rawCompetitorAnalysis?.competitors || [],
    overall_threat_summary: rawCompetitorAnalysis?.overall_threat_summary || rawCompetitorAnalysis?.biggest_threat || "",
    self_gap_analysis: safeJsonParse(report.ai_competitor_analysis)?.self_gap_analysis || safeJsonParse(report.ai_self_gap_analysis) || safeJsonParse(report.self_gap_analysis) || {}
  };

  const rawAdvice = normalizeList(report.ai_recommendations);
  const adviceList = rawAdvice.map((adv: any) => {
    if (typeof adv === 'string') return adv;
    return {
      title: adv?.title || "Strategic Advice",
      description: adv?.description || "Actionable insight",
      impact: adv?.impact || "High",
      effort: adv?.effort || "Medium",
      priority: adv?.priority,
      target: adv?.target
    };
  });

  const ga4 = kpi.ga4 || {};
  const gsc = kpi.gsc || {};
  const topKeywords = normalizeList(report.top_keywords);
  let topKeywordsOverview = "";
  const rawOverview = report.ai_top_keywords_overview;
  if (typeof rawOverview === 'string') {
    if (!rawOverview.trim().startsWith('[') && !rawOverview.trim().startsWith('{')) {
      topKeywordsOverview = rawOverview;
    }
  }
  if (!topKeywordsOverview && typeof aiTableExplanations.secondary_overview === 'string') {
    topKeywordsOverview = aiTableExplanations.secondary_overview;
  }

  const formatChange = (metric: any) => {
    if (metric?.change_percent === undefined || metric?.change_percent === null) {
      if (metric?.current !== undefined && metric?.previous !== undefined) {
        const cur = Number(metric.current);
        const prev = Number(metric.previous);
        if (prev === 0) return cur > 0 ? "+100%" : "0%";
        const pct = ((cur - prev) / prev) * 100;
        return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
      }
      return "0%";
    }
    const value = typeof metric.change_percent === "number" ? metric.change_percent.toFixed(1) : String(metric.change_percent);
    return value.startsWith("-") ? `${value}%` : `+${value}%`;
  };

  const tableData1 = [
    { metric: "Organic Traffic (Users)", current: ga4.totalUsers?.current?.toLocaleString('en-IN') || "0", previous: ga4.totalUsers?.previous?.toLocaleString('en-IN') || "0", change: formatChange(ga4.totalUsers) },
    { metric: "Sessions", current: ga4.sessions?.current?.toLocaleString('en-IN') || "0", previous: ga4.sessions?.previous?.toLocaleString('en-IN') || "0", change: formatChange(ga4.sessions) },
    { metric: "New Users", current: ga4.newUsers?.current?.toLocaleString('en-IN') || "0", previous: ga4.newUsers?.previous?.toLocaleString('en-IN') || "0", change: formatChange(ga4.newUsers) },
    { metric: "Events", current: ga4.eventCount?.current?.toLocaleString('en-IN') || "0", previous: ga4.eventCount?.previous?.toLocaleString('en-IN') || "0", change: formatChange(ga4.eventCount) },
    { metric: "Bounce Rate", current: `${((ga4.bounceRate?.current || 0) * 100).toFixed(1)}%`, previous: `${((ga4.bounceRate?.previous || 0) * 100).toFixed(1)}%`, change: formatChange(ga4.bounceRate) },
    { metric: "Avg. Duration", current: `${(ga4.averageSessionDuration?.current || 0).toFixed(0)}s`, previous: `${(ga4.averageSessionDuration?.previous || 0).toFixed(0)}s`, change: formatChange(ga4.averageSessionDuration) },
  ];

  let rawSummary = report.ai_summary;
  if (typeof rawSummary === 'object' && rawSummary !== null) {
    rawSummary = (rawSummary as any).seo_overview || (rawSummary as any).summary || (rawSummary as any).performance_overview || "Performance summary unavailable.";
  }
  let narrative1 = (typeof aiTableExplanations.kpi_overview === 'string' ? aiTableExplanations.kpi_overview : "") || (typeof rawSummary === 'string' ? rawSummary : "") || `SEO performance delivered ${ga4.totalUsers?.current?.toLocaleString('en-IN') || "0"} users and ${gsc.clicks?.toLocaleString?.('en-IN') || gsc.clicks || 0} Search Console clicks.`;

  const narrative2 = topKeywordsOverview || (topKeywords.length > 0
    ? `Top search themes were led by ${topKeywords[0].keyword}, with ${topKeywords[0].clicks} clicks.`
    : `Search Console and GA4 data were collected successfully.`);

  const tableHeader2 = ["Query", "Clicks", "CTR", "Position"];
  const tableData2 = topKeywords.slice(0, 5).map((keyword: any) => ({
    item: keyword.keyword,
    value: String(keyword.clicks ?? 0),
    share: `${typeof keyword.ctr === "number" ? (keyword.ctr * 100).toFixed(1) : keyword.ctr || "0.0"}%`,
    trend: `${typeof keyword.position === "number" ? keyword.position.toFixed(1) : keyword.position || "0.0"}`,
    prev: typeof keyword.previous_position === "number" && keyword.previous_position > 0 ? keyword.previous_position.toFixed(1) : "-",
  }));

  const countryMap = ga4Lists.usersByCountry.reduce((acc: Record<string, number>, row: any) => {
    if (row.country) acc[row.country] = (acc[row.country] || 0) + (Number(row.users) || 0);
    return acc;
  }, {});
  const topCountries = Object.entries(countryMap).map(([country, users]) => ({ country, users: users as number })).sort((a, b) => b.users - a.users);

  const seoData: any = {
    activeUsersByCountry: topCountries,
    activeUsersInsight: aiTableExplanations.active_users_by_country || "Geographical user distribution.",
    userActivityOverTime: (report.chart_datasets || []).map((d: any) => ({
      date: toIsoDateLabel(String(d.label || "")),
      users: Number(d.valueA || 0)
    })),
    userActivityInsight: aiTableExplanations.user_activity_over_time || "Temporal activity flux.",
    topKeywords: topKeywords.map((k: any) => ({
      keyword: k.keyword,
      clicks: k.clicks,
      ctr: `${((k.ctr || 0) * 100).toFixed(2)}%`,
      position: (k.position || 0).toFixed(1),
      previous_position: typeof k.previous_position === "number" && k.previous_position > 0 ? k.previous_position.toFixed(1) : "-"
    })),
    averagePosition: gsc.position,
    topKeywordsInsight: topKeywordsOverview || "Search query resonance mapping.",
    viewsByPageTitle: ga4Lists.topPageTitles.map(p => ({ pageTitle: p.title, views: p.views })),
    viewsByPageInsight: aiTableExplanations.views_by_page_title || "Content resonance metrics.",
    sessionsByChannel: ga4Lists.sessionsByChannel.map(s => ({ channel: s.channel, sessions: s.sessions })),
    sessionsInsight: aiTableExplanations.sessions_by_channel || "Source node distribution.",
    eventCountByEventName: ga4Lists.eventsByEventName.map(e => ({ event: e.eventName, count: e.count })),
    eventInsight: aiTableExplanations.event_count_by_event_name || "Neural event density.",
    keyEventsByPlatform: ga4Lists.keyEventsByPlatform.map(p => ({ platform: p.platform, events: p.keyEvents })),
    platformInsight: aiTableExplanations.key_events_by_platform || "Hardware vector access analytics.",
    totals: ga4,
    sectionAdvice: {
      kpi_advice: sectionAdvice.kpi_advice || [],
      demographics: sectionAdvice.country_advice || sectionAdvice.demographic_advice || [],
      timeline: sectionAdvice.activity_advice || sectionAdvice.timeline_advice || [],
      keywords: sectionAdvice.keyword_advice || [],
      pages: sectionAdvice.page_title_advice || [],
      channels: sectionAdvice.channel_advice || [],
      events: sectionAdvice.event_advice || [],
      platforms: sectionAdvice.platform_advice || []
    },
    aiCompetitorAnalysis: aiCompetitorAnalysis,
    radarData: report.radar_data || []
  };

  return {
    report_id: report.report_id,
    title: `SEO Neural Briefing`, narrative1, narrative2, tableHeader1: ["Metric", "Current", "Previous", "Change"], tableData1,
    chartData: report.chart_datasets || [], chartLabelA: "Active Users", chartLabelB: "Returning", chartLabelC: "New Users",
    tableHeader2, tableData2, adviceList,
    summarizedAdviceList: report.ai_recommendations_summarized,
    isMocked: false, reportStartDate: startDate, reportEndDate: endDate,
    generatedAt: (report as any).created_at || new Date().toISOString(),
    siteName: (report as any).site_name || "Unknown Site",
    category: "SEO",
    dateRange: { start: startDate, end: endDate },
    kpis: tableData1.map((m, i) => ({
      label: m.metric,
      value: m.current,
      change: parseFloat(m.change.replace(/[+%]/g, '')) || 0,
      isPositive: !m.change.startsWith('-'),
      icon: ["Globe", "Zap", "User", "Activity", "BarChart", "Clock"][i] || "Activity"
    })),
     topCountries: topCountries,
    users_by_country: ga4Lists.usersByCountry,
    topPages: ga4Lists.topLandingPages.map(p => ({ page: p.page, views: Number(p.sessions || 0), bounceRate: p.bounceRate })),
    topPageTitles: ga4Lists.topPageTitles.map(p => ({ title: p.title, views: p.views })),
    sessionsByChannel: ga4Lists.sessionsByChannel,
    eventsByEventName: ga4Lists.eventsByEventName,
    keyEventsByPlatform: ga4Lists.keyEventsByPlatform,
    userActivityOverTime: (report.chart_datasets || []).map((d: any) => ({
      date: toIsoDateLabel(String(d.label || "")),
      users: Number(d.valueA || 0)
    })),
    aiTopKeywordsOverview: topKeywordsOverview, aiComparison: report.ai_comparison || "",
    tableExplanations: aiTableExplanations, google_ads_details: safeJsonParse(report.google_ads_details), multiCharts, aiCompetitorAnalysis, sectionAdvice,
    ai_insights: ai_insights,
    executiveSummary: narrative1,
    seo_work_details: safeJsonParse(report.seo_work_details),
    gbp_details: safeJsonParse(report.gbp_details),
    radarData: safeJsonParse(report.radar_data) || [],
    radar_data: safeJsonParse(report.radar_data),
    improvement_roadmap: safeJsonParse(report.improvement_roadmap),
    competitor_intelligence: safeJsonParse(report.competitor_intelligence),
    radar_self: safeJsonParse(report.radar_self),
    seo: seoData
  };
};

const getPerformanceKpis = (report: RawReport): MarketingMetric[] => {
  const kpi = report.kpi_summary || {};
  const gads = kpi.google_ads || { current: {}, previous: {} };
  const gc = gads.current || {};
  const gp = gads.previous || {};

  const metaKpi = report.meta_ads_kpi || { current: {}, previous: {} };
  const mc = metaKpi.current || {};
  const mp = metaKpi.previous || {};

  // Combine Google + Meta for top-level overview
  const totalImpr = (gc.impressions || 0) + (mc.impressions || 0);
  const totalImprPrev = (gp.impressions || 0) + (mp.impressions || 0);

  const totalClicks = (gc.clicks || 0) + (mc.clicks || 0);
  const totalClicksPrev = (gp.clicks || 0) + (mp.clicks || 0);

  const totalLeads = (gc.conversions || 0) + (mc.leads || mc.conversions || 0);
  const totalLeadsPrev = (gp.conversions || 0) + (mp.leads || mp.conversions || 0);

  const totalSpend = (gc.cost || 0) + (mc.spend || mc.cost || 0);
  const totalSpendPrev = (gp.cost || 0) + (mp.spend || mp.cost || 0);

  const totalRevenue = (gc.conversions_value || 0) + (mc.revenue || 0);
  const totalRevenuePrev = (gp.conversions_value || 0) + (mp.revenue || 0);

  const totalCtr = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0;
  const totalCtrPrev = totalImprPrev > 0 ? (totalClicksPrev / totalImprPrev) * 100 : 0;

  const totalCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const totalCpcPrev = totalClicksPrev > 0 ? totalSpendPrev / totalClicksPrev : 0;

  const totalCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const totalCplPrev = totalLeadsPrev > 0 ? totalSpendPrev / totalLeadsPrev : 0;

  const totalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const totalRoasPrev = totalSpendPrev > 0 ? totalRevenuePrev / totalSpendPrev : 0;

  return [
    { metric: "Impressions", current: formatPads(totalImpr), previous: formatPads(totalImprPrev), change: formatPct(totalImpr, totalImprPrev) },
    { metric: "Clicks", current: formatPads(totalClicks), previous: formatPads(totalClicksPrev), change: formatPct(totalClicks, totalClicksPrev) },
    { metric: "Leads", current: formatPads(totalLeads), previous: formatPads(totalLeadsPrev), change: formatPct(totalLeads, totalLeadsPrev) },
    { metric: "Spend", current: `₹${totalSpend.toLocaleString('en-IN')}`, previous: `₹${totalSpendPrev.toLocaleString('en-IN')}`, change: formatPct(totalSpend, totalSpendPrev) },
    { metric: "CTR", current: `${totalCtr.toFixed(2)}%`, previous: `${totalCtrPrev.toFixed(2)}%`, change: formatPct(totalCtr, totalCtrPrev) },
    { metric: "CPC", current: `₹${totalCpc.toLocaleString('en-IN')}`, previous: `₹${totalCpcPrev.toLocaleString('en-IN')}`, change: formatPct(totalCpc, totalCpcPrev) },
    { metric: "CPL", current: `₹${totalCpl.toLocaleString('en-IN')}`, previous: `₹${totalCplPrev.toLocaleString('en-IN')}`, change: formatPct(totalCpl, totalCplPrev) },
    { metric: "ROAS", current: `${totalRoas.toFixed(2)}X`, previous: `${totalRoasPrev.toFixed(2)}X`, change: formatPct(totalRoas, totalRoasPrev) },
  ];
};

const buildPerformanceReport = (report: RawReport, startDate: string, endDate: string): ReportResponse => {
  const kpi = safeJsonParse(report.kpi_summary) || {};
  const aiTableExplanations = safeJsonParse(report.ai_table_explanations) || {};
  const multiCharts = safeJsonParse(report.charts) || null;
  const rawCompetitorAnalysis = safeJsonParse(report.ai_competitor_analysis) || null;
  const sectionAdvice = safeJsonParse(report.section_advice) || {};
  const ai_insights = safeJsonParse(report.ai_insights) || {};

  const ga4Lists = extractGa4Lists(report);

  const aiCompetitorAnalysis = {
    inferredActions: normalizeList(rawCompetitorAnalysis?.inferred_actions || rawCompetitorAnalysis?.inferredActions),
    recommendedSteps: normalizeList(rawCompetitorAnalysis?.actionable_steps || rawCompetitorAnalysis?.recommended_steps || rawCompetitorAnalysis?.recommendedSteps),
    competitor_breakdown: rawCompetitorAnalysis?.competitor_breakdown || rawCompetitorAnalysis?.competitors || [],
    overall_threat_summary: rawCompetitorAnalysis?.overall_threat_summary || rawCompetitorAnalysis?.biggest_threat || "",
    self_gap_analysis: safeJsonParse(report.ai_competitor_analysis)?.self_gap_analysis || safeJsonParse(report.ai_self_gap_analysis) || safeJsonParse(report.self_gap_analysis) || {}
  };

  const rawAdvice = normalizeList(report.ai_recommendations);
  const adviceList = rawAdvice.map((adv: any) => {
    if (typeof adv === 'string') return adv;
    return {
      title: adv?.title || "Strategic Advice",
      description: adv?.description || "Actionable insight",
      impact: adv?.impact || "High",
      effort: adv?.effort || "Medium",
      priority: adv?.priority,
      target: adv?.target
    };
  });

  const tableData1 = getPerformanceKpis(report);

  let rawSummary = report.ai_summary;
  if (typeof rawSummary === 'object' && rawSummary !== null) {
    rawSummary = (rawSummary as any).performance_overview || (rawSummary as any).summary || "Performance summary unavailable.";
  }
  const narrative1 = (typeof aiTableExplanations.kpi_overview === 'string' ? aiTableExplanations.kpi_overview : "") || (typeof rawSummary === 'string' ? rawSummary : "Performance summary unavailable.");

  const gads_details = safeJsonParse(report.google_ads_details) || {};
  const gads_totals = kpi.google_ads || { current: {}, previous: {} };
  const gtc = gads_totals.current || {};
  const gtp = gads_totals.previous || {};

  const googleAdsKpis: any[] = [
    { metric: "Impressions", current: formatPads(gtc.impressions), previous: formatPads(gtp.impressions), change: formatPct(gtc.impressions, gtp.impressions) },
    { metric: "Clicks", current: formatPads(gtc.clicks), previous: formatPads(gtp.clicks), change: formatPct(gtc.clicks, gtp.clicks) },
    { metric: "Spend", current: `₹${(gtc.cost || 0).toLocaleString('en-IN')}`, previous: `₹${(gtp.cost || 0).toLocaleString('en-IN')}`, change: formatPct(gtc.cost, gtp.cost) },
    { metric: "Leads", current: formatPads(gtc.conversions), previous: formatPads(gtp.conversions), change: formatPct(gtc.conversions, gtp.conversions) },
    { metric: "CTR", current: `${(gtc.ctr || 0).toFixed(2)}%`, previous: `${(gtp.ctr || 0).toFixed(2)}%`, change: formatPct(gtc.ctr, gtp.ctr) },
    { metric: "CPC", current: `₹${(gtc.clicks > 0 ? gtc.cost / gtc.clicks : 0).toFixed(2)}`, previous: `₹${(gtp.clicks > 0 ? gtp.cost / gtp.clicks : 0).toFixed(2)}`, change: formatPct((gtc.clicks > 0 ? gtc.cost / gtc.clicks : 0), (gtp.clicks > 0 ? gtp.cost / gtp.clicks : 0)) },
    { metric: "CPL", current: `₹${(gtc.conversions > 0 ? gtc.cost / gtc.conversions : 0).toFixed(2)}`, previous: `₹${(gtp.conversions > 0 ? gtp.cost / gtp.conversions : 0).toFixed(2)}`, change: formatPct((gtc.conversions > 0 ? gtc.cost / gtc.conversions : 0), (gtp.conversions > 0 ? gtp.cost / gtp.conversions : 0)) },
    { metric: "ROAS", current: `${(gtc.roas || 0).toFixed(2)}X`, previous: `${(gtp.roas || 0).toFixed(2)}X`, change: formatPct(gtc.roas, gtp.roas) },
  ].map(m => ({ ...m, pctChange: parseFloat(m.change.replace(/[+%]/g, '')), isGood: !m.change.startsWith('-'), currentValue: parseNumeric(m.current), previousValue: parseNumeric(m.previous) }));

  const topCampaigns: any[] = (gads_details.top_campaigns || []).map((c: any) => {
    const costValue = c.cost || (c.cost_micros / 1000000) || 0;
    const leadsValue = c.conversions || c.leads || 0;
    const calculatedCpa = leadsValue > 0 ? costValue / leadsValue : 0;

    return {
      campaign: c.campaign || c.name || "Unknown",
      impressions: c.impressions || 0,
      clicks: c.clicks || 0,
      cost: `₹${costValue.toLocaleString('en-IN')}`,
      leads: leadsValue,
      cpa: `₹${(c.cpa || calculatedCpa).toLocaleString('en-IN')}`,
      cpl: `₹${(c.cpl || calculatedCpa).toLocaleString('en-IN')}`,
      costPerLead: (c.costPerLead || calculatedCpa),
      costValue
    };
  });

  // Helper to extract keywords from sentences (AI explanations)
  const extractKeywordsFromText = (text: any): any[] => {
    if (typeof text !== 'string') return [];
    // Find everything between single or double quotes
    const matches = text.match(/['"](.*?)['"]/g);
    if (!matches) return [];
    // Filter out very short matches or empty ones
    return matches
      .map(m => m.replace(/['"]/g, '').trim())
      .filter(m => m.length > 3)
      .map(m => ({
        keyword: m,
        clicks: 0,
        conversions: 0,
        ctr: "N/A"
      }));
  };

  const rawKeywords = Array.isArray(gads_details.top_keywords)
    ? gads_details.top_keywords
    : Array.isArray(gads_details.search_terms)
      ? gads_details.search_terms
      : Array.isArray(report.top_keywords)
        ? normalizeList(report.top_keywords)
        : [
            ...extractKeywordsFromText(gads_details.search_terms),
            ...extractKeywordsFromText(gads_details.top_keywords)
          ];

  const topKeywords: any[] = rawKeywords.map((k: any) => {
    const impressionsVal = Number(k.impressions || k.impr || 0);
    const clicksVal = Number(k.clicks || 0);
    const convVal = Number(k.conversions || k.leads || k.conv || 0);

    let ctrVal = "0.00%";
    if (typeof k.ctr === 'number') {
      // If it's a small decimal (e.g. 0.05), multiply by 100. If it's already > 1 (e.g. 5.0), keep as is.
      const val = k.ctr < 1 && k.ctr > 0 ? k.ctr * 100 : k.ctr;
      ctrVal = `${val.toFixed(2)}%`;
    } else if (k.ctr) {
      ctrVal = String(k.ctr);
    }

    return {
      keyword: k.keyword || k.query || k.item || k.kw || "Unknown",
      impressions: formatPads(impressionsVal),
      clicks: formatPads(clicksVal),
      conversions: formatPads(convVal),
      ctr: ctrVal,
      impressionsValue: impressionsVal,
      clicksValue: clicksVal,
      conversionsValue: convVal
    };
  });

  const googleDeviceBreakdown: any[] = (gads_details.devices || []).map((d: any) => ({
    device: d.device || "Unknown",
    impressions: d.impressions || 0,
    clicks: d.clicks || 0,
    cost: `₹${(d.cost || 0).toLocaleString('en-IN')}`,
    impressionsValue: d.impressions || 0,
    costValue: d.cost || 0
  }));

  const metaKpiRaw = safeJsonParse(report.meta_ads_kpi) || { current: {}, previous: {} };
  const mc = metaKpiRaw.current || {};
  const mp = metaKpiRaw.previous || {};

  const metaAdsKpis: any[] = [
    { metric: "Impressions", current: (mc.impressions || 0).toLocaleString('en-IN'), previous: (mp.impressions || 0).toLocaleString('en-IN'), pctChange: parseFloat(formatPct(mc.impressions, mp.impressions)), isGood: mc.impressions >= mp.impressions, currentValue: mc.impressions, previousValue: mp.impressions },
    { metric: "Clicks", current: (mc.clicks || 0).toLocaleString('en-IN'), previous: (mp.clicks || 0).toLocaleString('en-IN'), pctChange: parseFloat(formatPct(mc.clicks, mp.clicks)), isGood: mc.clicks >= mp.clicks, currentValue: mc.clicks, previousValue: mp.clicks },
    { metric: "Spend", current: `₹${(mc.spend || 0).toLocaleString('en-IN')}`, previous: `₹${(mp.spend || 0).toLocaleString('en-IN')}`, pctChange: parseFloat(formatPct(mc.spend, mp.spend)), isGood: mc.spend <= mp.spend, currentValue: mc.spend, previousValue: mp.spend },
    { metric: "Leads", current: (mc.leads || 0).toLocaleString('en-IN'), previous: (mp.leads || 0).toLocaleString('en-IN'), pctChange: parseFloat(formatPct(mc.leads, mp.leads)), isGood: mc.leads >= mp.leads, currentValue: mc.leads, previousValue: mp.leads },
    { metric: "Cost per Lead", current: `₹${(mc.leads > 0 ? mc.spend / mc.leads : 0).toFixed(2)}`, previous: `₹${(mp.leads > 0 ? mp.spend / mp.leads : 0).toFixed(2)}`, pctChange: parseFloat(formatPct((mc.leads > 0 ? mc.spend / mc.leads : 0), (mp.leads > 0 ? mp.spend / mp.leads : 0))), isGood: (mc.leads > 0 ? mc.spend / mc.leads : 0) <= (mp.leads > 0 ? mp.spend / mp.leads : 0), currentValue: mc.leads > 0 ? mc.spend / mc.leads : 0, previousValue: mp.leads > 0 ? mp.spend / mp.leads : 0 },
    { metric: "ROAS", current: `${(mc.roas || 0).toFixed(2)}X`, previous: `${(mp.roas || 0).toFixed(2)}X`, pctChange: parseFloat(formatPct(mc.roas, mp.roas)), isGood: mc.roas >= mp.roas, currentValue: mc.roas, previousValue: mp.roas },
  ].map(k => ({ ...k, pctChange: parseFloat(k.pctChange.toFixed(1)) }));

  const metaDetails = safeJsonParse(report.meta_ads_details) || {};
  const metaTopCampaigns: any[] = (metaDetails.top_campaigns || []).map((c: any) => ({
    campaign: c.campaign || "Unknown",
    status: c.status || "N/A",
    impressions: c.impressions || 0,
    clicks: c.clicks || 0,
    interactions: c.interactions || 0,
    cost: `₹${(c.spend || c.cost || 0).toLocaleString('en-IN')}`,
    leads: c.leads || 0,
    costPerLead: `₹${(c.costPerLead || (c.leads > 0 ? (c.spend || c.cost) / c.leads : 0)).toFixed(2)}`,
    costValue: c.spend || c.cost || 0
  }));

  const metaAdSets: any[] = (metaDetails.top_adsets || []).map((a: any) => ({
    adSet: a.adset || "Unknown",
    impressions: a.impressions || 0,
    clicks: a.clicks || 0,
    cost: `₹${(a.spend || a.cost || 0).toLocaleString('en-IN')}`,
    leads: a.leads || 0,
    costPerLead: `₹${(a.costPerLead || (a.leads > 0 ? (a.spend || a.cost) / a.leads : 0)).toFixed(2)}`,
    costValue: a.spend || a.cost || 0
  }));

  const metaDeviceBreakdown: any[] = (metaDetails.devices || []).map((d: any) => ({
    device: d.device || "Unknown",
    impressions: d.impressions || 0,
    clicks: d.clicks || 0,
    cost: `₹${(d.spend || 0).toLocaleString('en-IN')}`,
    impressionsValue: d.impressions || 0,
    costValue: d.spend || 0
  }));

  const metaCharts = safeJsonParse(report.meta_ads_charts) || {};

  const kpi_data = safeJsonParse(report.kpi_summary) || {};
  const gads_local = kpi_data.google_ads || { current: {}, previous: {} };
  const gc_local = gads_local.current || {};

  const mc_local = metaKpiRaw.current || {};

  const performanceData: any = {
    googleAdsKpis: tableData1.map(m => ({
      metric: m.metric,
      current: m.current,
      previous: m.previous,
      pctChange: parseFloat(m.change.replace(/[+%]/g, '')),
      isGood: !m.change.startsWith('-'),
      currentValue: parseFloat(m.current.replace(/[₹,]/g, '')),
      previousValue: parseFloat(m.previous.replace(/[₹,]/g, '')),
    })),
    googleAdsInsight: aiTableExplanations.kpi_overview || "Consolidated Google Ads performance.",
    topCampaigns,
    topCampaignsInsight: aiTableExplanations.top_campaigns || "Top performing Google Ads campaigns.",
    topKeywords,
    topKeywordsInsight: aiTableExplanations.top_keywords || "Highest resonance search terms.",
    googleDeviceBreakdown,
    googleDeviceInsight: aiTableExplanations.devices || "Hardware vector performance.",
    metaAdsKpis,
    metaAdsInsight: aiTableExplanations.meta_kpi_overview || "Social performance metrics.",
    metaTopCampaigns,
    metaTopCampaignsInsight: aiTableExplanations.meta_campaigns || "Top Meta Ads campaigns.",
    metaAdSets,
    metaAdSetsInsight: aiTableExplanations.meta_adsets || "Audience targeting performance.",
    metaDeviceBreakdown,
    metaDeviceInsight: aiTableExplanations.meta_devices || "Social hardware vectors.",
    websiteTrafficByCountry: [], // Handled by buildReportFromRow merging
    websiteTrafficInsight: aiTableExplanations.active_users_by_country || "Geographical user distribution.",
    dailyWebsiteActivity: (report.chart_datasets || []).map((d: any) => ({
      date: toIsoDateLabel(String(d.label || "")),
      users: Number(d.valueA || 0)
    })),
    dailyWebsiteActivityInsight: aiTableExplanations.user_activity_over_time || "Temporal activity flux.",
    sessionsByChannel: ga4Lists.sessionsByChannel.map(s => ({ channel: s.channel, sessions: s.sessions })),
    sessionsInsight: aiTableExplanations.sessions_by_channel || "Source node distribution.",
    aiCompetitorAnalysis: aiCompetitorAnalysis,
    totals: { google: gc_local, meta: mc_local },
    sectionAdvice: {
      kpi_advice: sectionAdvice.kpi_advice || [],
      campaign_advice: sectionAdvice.campaign_advice || [],
      keyword_advice: sectionAdvice.keyword_advice || [],
      device_advice: sectionAdvice.device_advice || [],
      meta_kpi_advice: sectionAdvice.meta_kpi_advice || [],
      meta_campaign_advice: sectionAdvice.meta_campaign_advice || [],
      meta_adset_advice: sectionAdvice.meta_adset_advice || [],
      meta_device_advice: sectionAdvice.meta_device_advice || [],
      demographics: sectionAdvice.demographic_advice || [],
      timeline: sectionAdvice.timeline_advice || [],
      channels: sectionAdvice.channel_advice || [],
      events: sectionAdvice.event_advice || [],
      platforms: sectionAdvice.platform_advice || []
    }
  };

  return {
    report_id: report.report_id,
    title: `Performance Marketing Briefing`, narrative1, narrative2: "", tableHeader1: ["Metric", "Current", "Previous", "Change"], tableData1,
    chartData: report.chart_datasets || [], chartLabelA: "Spend", chartLabelB: "Impressions", chartLabelC: "Clicks",
    tableHeader2: undefined, tableData2: undefined, adviceList,
    summarizedAdviceList: report.ai_recommendations_summarized,
    isMocked: false, reportStartDate: startDate, reportEndDate: endDate,
    generatedAt: (report as any).created_at || new Date().toISOString(),
    siteName: (report as any).site_name || "Unknown Site",
    category: "Performance Marketing",
    dateRange: { start: startDate, end: endDate },
    kpis: tableData1.map((m, i) => ({
      label: m.metric,
      value: m.current,
      change: parseFloat(m.change.replace(/[+%]/g, '')) || 0,
      isPositive: !m.change.startsWith('-'),
      icon: ["BarChart", "Zap", "Target", "Wallet", "TrendingUp", "DollarSign"][i] || "Activity"
    })),
    executiveSummary: narrative1,
    radarData: safeJsonParse(report.radar_data) || [],
    users_by_country: ga4Lists.usersByCountry,
    topCountries: [],
    topPages: ga4Lists.topLandingPages.map(p => ({ page: p.page, views: Number(p.sessions || 0), bounceRate: p.bounceRate })),
    topPageTitles: ga4Lists.topPageTitles.map(p => ({ title: p.title, views: p.views })),
    sessionsByChannel: ga4Lists.sessionsByChannel,
    eventsByEventName: ga4Lists.eventsByEventName,
    keyEventsByPlatform: ga4Lists.keyEventsByPlatform,
    userActivityOverTime: (safeJsonParse(report.chart_datasets) || []).map((d: any) => ({
      date: toIsoDateLabel(String(d.label || "")),
      users: Number(d.valueA || 0)
    })),
    aiTopKeywordsOverview: report.ai_top_keywords_overview || "", aiComparison: report.ai_comparison || "",
    tableExplanations: aiTableExplanations, google_ads_details: gads_details, multiCharts, aiCompetitorAnalysis, sectionAdvice,
    ai_insights: ai_insights,
    metaKpi: metaKpiRaw,
    metaCampaigns: metaDetails?.top_campaigns,
    metaAdsets: metaDetails?.top_adsets,
    metaDevices: metaDetails?.devices,
    metaDaily: metaCharts?.daily,
    radar_data: safeJsonParse(report.radar_data),
    improvement_roadmap: safeJsonParse(report.improvement_roadmap),
    competitor_intelligence: safeJsonParse(report.competitor_intelligence),
    radar_self: safeJsonParse(report.radar_self),
    performance: {
      ...performanceData,
      topKeywords, // ADD THIS
      googleAdsKpis,
      metaAdsKpis
    } // This is what ReportViews.tsx uses
  };
};

const buildSocialReport = (report: RawReport, startDate: string, endDate: string): ReportResponse => {
  const aiTableExplanations = safeJsonParse(report.ai_table_explanations) || {};
  const multiCharts = safeJsonParse(report.charts) || null;
  const rawCompetitorAnalysis = safeJsonParse(report.ai_competitor_analysis) || null;
  const ai_insights = safeJsonParse(report.ai_insights) || {};

  const aiCompetitorAnalysis = {
    inferredActions: normalizeList(rawCompetitorAnalysis?.inferred_actions || rawCompetitorAnalysis?.inferredActions),
    recommendedSteps: normalizeList(rawCompetitorAnalysis?.actionable_steps || rawCompetitorAnalysis?.recommended_steps || rawCompetitorAnalysis?.recommendedSteps),
    competitor_breakdown: rawCompetitorAnalysis?.competitor_breakdown || rawCompetitorAnalysis?.competitors || [],
    overall_threat_summary: rawCompetitorAnalysis?.overall_threat_summary || rawCompetitorAnalysis?.biggest_threat || "",
    self_gap_analysis: safeJsonParse(report.ai_competitor_analysis)?.self_gap_analysis || safeJsonParse(report.ai_self_gap_analysis) || safeJsonParse(report.self_gap_analysis) || {}
  };

  const sectionAdvice = safeJsonParse(report.section_advice) || {};

  const rawAdvice = normalizeList(report.ai_recommendations);
  const adviceList = rawAdvice.map((adv: any) => {
    if (typeof adv === 'string') return adv;
    return {
      title: adv?.title || "Strategic Advice",
      description: adv?.description || "Actionable insight",
      impact: adv?.impact || "High",
      effort: adv?.effort || "Medium",
      priority: adv?.priority,
      target: adv?.target
    };
  });

  const kpi = safeJsonParse(report.kpi_summary) || {};
  const fi = kpi.fb_impressions || {};
  const ii = kpi.ig_impressions || {};

  const tableData1 = [
    { metric: "FB Page Impressions", current: fi.current?.toLocaleString('en-IN') || "0", previous: fi.previous?.toLocaleString('en-IN') || "0", change: fi.change_percent ? (String(fi.change_percent).startsWith("-") ? fi.change_percent : `+${fi.change_percent}`) + "%" : "0%" },
    { metric: "IG Impressions", current: ii.current?.toLocaleString('en-IN') || "0", previous: ii.previous?.toLocaleString('en-IN') || "0", change: ii.change_percent ? (String(fi.change_percent).startsWith("-") ? fi.change_percent : `+${fi.change_percent}`) + "%" : "N/A" },
  ];

  let rawSummary = report.ai_summary;
  if (typeof rawSummary === 'object' && rawSummary !== null) {
    rawSummary = (rawSummary as any).social_overview || (rawSummary as any).summary || "Performance summary unavailable.";
  }
  const narrative1 = typeof rawSummary === 'string' ? rawSummary : "Performance summary unavailable.";

  const socialData: any = {
    socialKpis: tableData1.map(m => ({
      metric: m.metric,
      current: m.current,
      previous: m.previous,
      pctChange: parseFloat(m.change.replace('%', '')),
      isGood: !m.change.startsWith('-')
    })),
    socialInsight: aiTableExplanations.kpi_overview || "Social media performance metrics.",
    impressionsTimeline: (report.chart_datasets || []).map((d: any) => ({
      date: d.label,
      facebook: d.valueA,
      instagram: d.valueB
    })),
    impressionsTimelineInsight: aiTableExplanations.timeline_insight || "Ecosystem engagement trends.",
    sectionAdvice: {
      kpi_advice: sectionAdvice.kpi_advice || [],
      timeline_advice: sectionAdvice.timeline_advice || []
    }
  };

  return {
    report_id: report.report_id,
    title: `Social Media Marketing Report`, narrative1, narrative2: "", tableHeader1: ["Metric", "Current", "Previous", "Change"], tableData1,
    chartData: report.chart_datasets || [], chartLabelA: "FB Impressions", chartLabelB: "IG Impressions", chartLabelC: "",
    tableHeader2: undefined, tableData2: undefined, adviceList,
    summarizedAdviceList: report.ai_recommendations_summarized,
    isMocked: false, reportStartDate: startDate, reportEndDate: endDate,
    generatedAt: (report as any).created_at || new Date().toISOString(),
    siteName: (report as any).site_name || "Unknown Site",
    category: "Social Media Marketing",
    dateRange: { start: startDate, end: endDate },
    kpis: tableData1.map((m, i) => ({
      label: m.metric,
      value: m.current,
      change: parseFloat(m.change.replace(/[+%]/g, '')) || 0,
      isPositive: !m.change.startsWith('-'),
      icon: i === 0 ? "Facebook" : "Instagram"
    })),
    executiveSummary: narrative1,
    radarData: safeJsonParse(report.radar_data) || [],
    aiTopKeywordsOverview: report.ai_top_keywords_overview || "", aiComparison: report.ai_comparison || "",
    tableExplanations: aiTableExplanations, google_ads_details: safeJsonParse(report.google_ads_details), multiCharts, aiCompetitorAnalysis, sectionAdvice,
    ai_insights: ai_insights,
    radar_data: safeJsonParse(report.radar_data),
    seo_work_details: safeJsonParse(report.seo_work_details),
    gbp_details: safeJsonParse(report.gbp_details),
    improvement_roadmap: safeJsonParse(report.improvement_roadmap),
    competitor_intelligence: safeJsonParse(report.competitor_intelligence),
    radar_self: safeJsonParse(report.radar_self),
    social: socialData // Add this for ReportViews.tsx
  };
};

const buildCombinedReport = (report: RawReport, startDate: string, endDate: string): ReportResponse => {
  const seoPart = buildSeoReport(report, startDate, endDate);
  const perfPart = buildPerformanceReport(report, startDate, endDate);

  const combinedTableData = [
    seoPart.tableData1[0], // Organic Traffic (Users)
    perfPart.tableData1[2], // Leads
    perfPart.tableData1[6], // Cost per Lead (was index 5, now 6 after adding CPC)
    perfPart.tableData1[0], // Impressions
    perfPart.tableData1[3], // Spend
    seoPart.tableData1[4],  // Bounce Rate
  ];

  // Build the result explicitly to avoid property shadowing from spreads
  // This ensures SEO and Performance data are kept 100% separate in their own branches
  const result: ReportResponse = {
    report_id: report.report_id || `${seoPart.report_id}_${perfPart.report_id}`,
    title: `Combined Intelligence Briefing`,
    category: "Combined Intelligence",
    siteName: seoPart.siteName || perfPart.siteName,
    dateRange: seoPart.dateRange,
    generatedAt: seoPart.generatedAt,
    executiveSummary: `${seoPart.executiveSummary}\n\n${perfPart.executiveSummary}`,
    narrative1: `${seoPart.narrative1}\n\n${perfPart.narrative1}`,
    narrative2: seoPart.narrative2,
    tableHeader1: seoPart.tableHeader1,
    tableData1: combinedTableData,
    tableHeader2: seoPart.tableHeader2,
    tableData2: seoPart.tableData2,

    // KEEP ALL KPIS (Both SEO and Performance) - Total 12+ items
    kpis: [...seoPart.kpis, ...perfPart.kpis],

    chartData: seoPart.chartData,
    chartLabelA: seoPart.chartLabelA,
    chartLabelB: seoPart.chartLabelB,
    chartLabelC: seoPart.chartLabelC,
    adviceList: [...seoPart.adviceList, ...perfPart.adviceList],
    summarizedAdviceList: [...(seoPart.summarizedAdviceList || []), ...(perfPart.summarizedAdviceList || [])],

    // ISOLATED MODULE DATA (The "Tree-Way" approach)
    seo: seoPart.seo,
    performance: perfPart.performance,

    // Preserved SEO Fields
    topCountries: seoPart.topCountries,
    users_by_country: seoPart.users_by_country,
    topPages: seoPart.topPages,
    topPageTitles: seoPart.topPageTitles,
    sessionsByChannel: seoPart.sessionsByChannel,
    eventsByEventName: seoPart.eventsByEventName,
    keyEventsByPlatform: seoPart.keyEventsByPlatform,
    userActivityOverTime: seoPart.userActivityOverTime,
    ga4_details: seoPart.ga4_details, // CRITICAL: Preserves raw GA4 metrics for Slide 5

    // Preserved Performance Fields
    googleAdsKpis: perfPart.tableData1,
    metaKpi: report.meta_ads_kpi || perfPart.metaKpi,
    metaCampaigns: report.meta_ads_details ? safeJsonParse(report.meta_ads_details).top_campaigns : perfPart.metaCampaigns,
    metaAdsets: report.meta_ads_details ? safeJsonParse(report.meta_ads_details).top_adsets : perfPart.metaAdsets,
    metaDevices: report.meta_ads_details ? safeJsonParse(report.meta_ads_details).devices : perfPart.metaDevices,
    metaDaily: report.meta_ads_charts ? safeJsonParse(report.meta_ads_charts).daily : perfPart.metaDaily,
    google_ads_details: safeJsonParse(report.google_ads_details) || perfPart.google_ads_details,
    meta_ads_kpi: safeJsonParse(report.meta_ads_kpi),
    meta_ads_details: safeJsonParse(report.meta_ads_details),
    meta_ads_charts: safeJsonParse(report.meta_ads_charts),

    // AI Insights Merging
    ai_insights: {
      branding: seoPart.ai_insights?.branding || perfPart.ai_insights?.branding || {},
      cover: seoPart.ai_insights?.cover || perfPart.ai_insights?.cover || {},
      conclusion: seoPart.ai_insights?.conclusion || perfPart.ai_insights?.conclusion || "",
      slides: {
        ...(seoPart.ai_insights?.slides || {}),
        ...(perfPart.ai_insights?.slides || {}),
        kpis: [...(seoPart.ai_insights?.slides?.kpis || []), ...(perfPart.ai_insights?.slides?.kpis || [])]
      }
    },

    // Global Fields
    radarData: [...(seoPart.radarData || []), ...(perfPart.radarData || [])],
    radar_data: [...(seoPart.radar_data || []), ...(perfPart.radar_data || [])],
    radar_self: { ...(seoPart.radar_self || {}), ...(perfPart.radar_self || {}) },
    improvement_roadmap: report.improvement_roadmap || seoPart.improvement_roadmap || perfPart.improvement_roadmap,
    competitor_intelligence: report.competitor_intelligence || seoPart.competitor_intelligence || perfPart.competitor_intelligence,
    sectionAdvice: {
      ...(seoPart.sectionAdvice || {}),
      ...(perfPart.sectionAdvice || {})
    },
    chart_datasets: report.chart_datasets
  };

  return result;
};

const buildReportFromRow = (report: RawReport, cat: string, startDate: string, endDate: string): ReportResponse => {
  if (cat === "SEO") return buildSeoReport(report, startDate, endDate);
  if (cat === "Performance Marketing") return buildPerformanceReport(report, startDate, endDate);
  if (cat === "Social Media Marketing") return buildSocialReport(report, startDate, endDate);
  if (cat === "Combined Intelligence") return buildCombinedReport(report, startDate, endDate);
  return {} as ReportResponse;
};

export const useReportData = (user: UserProfile, activeSite: SiteProfile, dates: DateRange, category: string) => {
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState("");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusChannelRef = useRef<any>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (statusChannelRef.current) statusChannelRef.current.unsubscribe();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    };
  }, []);

  const normalizeDateRange = (range: DateRange) => {
    if (range.startDate && range.endDate && range.startDate > range.endDate)
      return { startDate: range.endDate, endDate: range.startDate };
    return range;
  };

  const isCompleteSeoDatabaseReport = (report: RawReport) => Boolean(report && (report.ga4_details || report.kpi_summary?.ga4));
  const isCompletePerformanceDatabaseReport = (report: RawReport) => Boolean(report && (report.google_ads_details || report.meta_ads_kpi));
  const isCompleteCombinedDatabaseReport = (report: RawReport) => Boolean(report && (report.ga4_details || report.kpi_summary?.ga4) && (report.google_ads_details || report.meta_ads_kpi));

  const fetchStoredReport = async (siteId: string, startDate: string, endDate: string, cat: string) => {
    const moduleKey = cat === "SEO" ? "seo" : cat === "Performance Marketing" ? "performance" : cat === "Social Media Marketing" ? "social" : "combined";

    if (moduleKey === "combined") {
      // Combined reports are stored as separate SEO and Performance records
      const [seo, perf] = await Promise.all([
        supabase.from("processed_reports").select("*").eq("site_id", siteId).eq("module", "seo").eq("start_date", startDate).eq("end_date", endDate).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("processed_reports").select("*").eq("site_id", siteId).eq("module", "performance").eq("start_date", startDate).eq("end_date", endDate).order("created_at", { ascending: false }).limit(1).maybeSingle()
      ]);

      if (seo.data && perf.data) {
        // Merge them into a single "RawReport" structure that buildCombinedReport expects
        const mergedRaw: RawReport = {
          ...seo.data,
          report_id: `${seo.data.report_id}_${perf.data.report_id}`,
          kpi_summary: { ...(safeJsonParse(seo.data.kpi_summary) || {}), ...(safeJsonParse(perf.data.kpi_summary) || {}) },
          google_ads_details: perf.data.google_ads_details,
          meta_ads_kpi: perf.data.meta_ads_kpi,
          meta_ads_details: perf.data.meta_ads_details,
          meta_ads_charts: perf.data.meta_ads_charts,
          ai_recommendations: [...(normalizeList(seo.data.ai_recommendations)), ...(normalizeList(perf.data.ai_recommendations))],
          ai_summary: {
            seo_overview: safeJsonParse(seo.data.ai_summary)?.seo_overview || seo.data.ai_summary || "",
            performance_overview: safeJsonParse(perf.data.ai_summary)?.performance_overview || perf.data.ai_summary || ""
          },
          // Merge lists
          top_page_titles: [...(normalizeList(seo.data.top_page_titles)), ...(normalizeList(perf.data.top_page_titles))],
          top_landing_pages: [...(normalizeList(seo.data.top_landing_pages)), ...(normalizeList(perf.data.top_landing_pages))],
          sessions_by_channel: [...(normalizeList(seo.data.sessions_by_channel)), ...(normalizeList(perf.data.sessions_by_channel))],

          ai_insights: {
            branding: { ...(safeJsonParse(seo.data.ai_insights)?.branding || {}), ...(safeJsonParse(perf.data.ai_insights)?.branding || {}) },
            cover: { ...(safeJsonParse(seo.data.ai_insights)?.cover || {}), ...(safeJsonParse(perf.data.ai_insights)?.cover || {}) },
            conclusion: (safeJsonParse(seo.data.ai_insights)?.conclusion || "") + " " + (safeJsonParse(perf.data.ai_insights)?.conclusion || ""),
            slides: {
              ...(safeJsonParse(seo.data.ai_insights)?.slides || {}),
              ...(safeJsonParse(perf.data.ai_insights)?.slides || {})
            }
          },
          radar_self: { ...(safeJsonParse(seo.data.radar_self) || {}), ...(safeJsonParse(perf.data.radar_self) || {}) }
        };
        return buildCombinedReport(mergedRaw, startDate, endDate);
      }
      return null;
    }

    const { data: report, error } = await supabase.from("processed_reports").select("*").eq("site_id", siteId).eq("module", moduleKey).eq("start_date", startDate).eq("end_date", endDate).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !report) {
      return null;
    }
    if (cat === "SEO" && !isCompleteSeoDatabaseReport(report)) return null;
    if (cat === "Performance Marketing" && !isCompletePerformanceDatabaseReport(report)) return null;
    if (cat === "Combined Intelligence" && !isCompleteCombinedDatabaseReport(report)) return null;
    return buildReportFromRow(report, cat, startDate, endDate);
  };

  const checkSiteCredentials = async () => {
    const { data, error } = await supabase.from("site_credentials").select("platform").eq("site_id", activeSite.id);
    if (error || !data?.length) { setErrorMsg(`No credentials found for ${activeSite.name}.`); return false; }
    return true;
  };

  const loadCompletedReport = async (report_id: string, cat: string, nd: { startDate: string, endDate: string }) => {
    try {
      console.log(`[useReportData] Loading completed report ${report_id}...`);
      for (let attempt = 0; attempt < REPORT_COMPLETION_RETRIES; attempt++) {
        const { data: report, error } = await supabase.from("processed_reports").select("*").eq("report_id", report_id).maybeSingle();
        if (error) throw error;
        if (report) {
          setReportData(buildReportFromRow(report, cat, nd.startDate, nd.endDate));
          setIsLoading(false);
          return true;
        }
        if (attempt < REPORT_COMPLETION_RETRIES - 1) await new Promise((resolve) => setTimeout(resolve, REPORT_RETRY_DELAY_MS));
      }
    } catch (err) {
      console.error("[useReportData] Error loading completed report:", err);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const fetchReportData = async (siteToQuery = activeSite, dateRangeToQuery = dates, cat = category, reportIdToQuery?: string) => {
    if (!siteToQuery) return;
    const nd = normalizeDateRange(dateRangeToQuery);
    setIsLoading(true);
    setPollingStatus(cat === "Combined Intelligence" ? "Synchronizing Client PPT..." : "Initializing AI sync...");
    setErrorMsg(null);

    // 1. Try to fetch by exact report_id if provided (highest priority, best for Shared Mode)
    if (reportIdToQuery) {
      if (reportIdToQuery.includes('_')) {
        // Handle combined ID format: seoID_perfID
        const [seo_id, perf_id] = reportIdToQuery.split('_');
        const [seo, perf] = await Promise.all([
          supabase.from("processed_reports").select("*").eq("report_id", seo_id).maybeSingle(),
          supabase.from("processed_reports").select("*").eq("report_id", perf_id).maybeSingle()
        ]);

        if (seo.data && perf.data) {
          // Use the combined builder
          const mergedRaw: RawReport = {
            ...seo.data,
            report_id: reportIdToQuery,
            kpi_summary: { ...(safeJsonParse(seo.data.kpi_summary) || {}), ...(safeJsonParse(perf.data.kpi_summary) || {}) },
            google_ads_details: perf.data.google_ads_details,
            meta_ads_kpi: perf.data.meta_ads_kpi,
            meta_ads_details: perf.data.meta_ads_details,
            meta_ads_charts: perf.data.meta_ads_charts,
            ai_recommendations: [...(normalizeList(seo.data.ai_recommendations)), ...(normalizeList(perf.data.ai_recommendations))],
            ai_summary: {
              seo_overview: safeJsonParse(seo.data.ai_summary)?.seo_overview || seo.data.ai_summary || "",
              performance_overview: safeJsonParse(perf.data.ai_summary)?.performance_overview || perf.data.ai_summary || ""
            },
            top_page_titles: [...(normalizeList(seo.data.top_page_titles)), ...(normalizeList(perf.data.top_page_titles))],
            top_landing_pages: [...(normalizeList(seo.data.top_landing_pages)), ...(normalizeList(perf.data.top_landing_pages))],
            sessions_by_channel: [...(normalizeList(seo.data.sessions_by_channel)), ...(normalizeList(perf.data.sessions_by_channel))],
            ai_insights: {
              branding: { ...(safeJsonParse(seo.data.ai_insights)?.branding || {}), ...(safeJsonParse(perf.data.ai_insights)?.branding || {}) },
              cover: { ...(safeJsonParse(seo.data.ai_insights)?.cover || {}), ...(safeJsonParse(perf.data.ai_insights)?.cover || {}) },
              conclusion: (safeJsonParse(seo.data.ai_insights)?.conclusion || "") + " " + (safeJsonParse(perf.data.ai_insights)?.conclusion || ""),
              slides: { ...(safeJsonParse(seo.data.ai_insights)?.slides || {}), ...(safeJsonParse(perf.data.ai_insights)?.slides || {}) }
            },
            radar_self: { ...(safeJsonParse(seo.data.radar_self) || {}), ...(safeJsonParse(perf.data.radar_self) || {}) }
          };
          setReportData(buildCombinedReport(mergedRaw, nd.startDate, nd.endDate));
          setIsLoading(false);
          return;
        }
      } else {
        const { data: report } = await supabase.from("processed_reports").select("*").eq("report_id", reportIdToQuery).maybeSingle();
        if (report) {
          setReportData(buildReportFromRow(report, cat, nd.startDate, nd.endDate));
          setIsLoading(false);
          return;
        }
      }
    }

    // 2. Fallback to searching by site/date/module
    const cached = await fetchStoredReport(siteToQuery.id, nd.startDate, nd.endDate, cat);
    if (cached) {
      setReportData(cached);
      setIsLoading(false);
      toast.success('Report loaded from intelligence cache');
      return;
    }

    // Shared Mode Enforcement: Guest users cannot trigger new reports or check credentials
    if (user.role === 'Guest' || user.id.startsWith('guest_')) {
      setIsLoading(false);
      setErrorMsg("This shared report link is no longer valid or the data has not been generated yet.");
      return;
    }

    const hasCredentials = await checkSiteCredentials();
    if (!hasCredentials) { setIsLoading(false); return; }

    if (cat === "Combined Intelligence") {
      try {
        setPollingStatus("Synchronizing Client PPT...");
        const [seoRes, perfRes] = await Promise.all([
          fetch(`${API_URL}/seo-report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, site_id: siteToQuery.id, start_date: nd.startDate, end_date: nd.endDate, bnb_mode: (cat === 'BnB Report') })
          }),
          fetch(`${API_URL}/performance-report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, site_id: siteToQuery.id, start_date: nd.startDate, end_date: nd.endDate, bnb_mode: (cat === 'BnB Report') })
          })
        ]);

        if (!seoRes.ok || !perfRes.ok) throw new Error("API error triggering combined reports");

        const seoData = await seoRes.json();
        const perfData = await perfRes.json();

        handleCombinedSuccess(seoData.report_id, perfData.report_id, seoData.data, perfData.data, nd);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message);
        toast.error(`Sync Error: ${err.message}`);
      }
      return;
    }

    const webhookPath = cat === "SEO" ? "seo-report" : cat === "Performance Marketing" ? "performance-report" : cat === "Social Media Marketing" ? "social-report" : "combined-report";
    try {
      const response = await fetch(`${API_URL}/${webhookPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, site_id: siteToQuery.id, start_date: nd.startDate, end_date: nd.endDate, bnb_mode: (cat === 'BnB Report') })
      });
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const { report_id, data: immediateData } = await response.json();
      handleReportSuccess(report_id, immediateData, cat, nd);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message);
      toast.error(`Sync Error: ${err.message}`);
    }
  };

  const handleCombinedSuccess = async (seo_id: string, perf_id: string, immediateSeo: any, immediatePerf: any, nd: { startDate: string, endDate: string }) => {
    let seoReport: any = immediateSeo;
    let perfReport: any = immediatePerf;

    const pollReport = async (rid: string, label: string) => {
      const statusMap: Record<string, string> = { 'pending': 'Queuing...', 'fetching_credentials': 'Credentials...', 'fetching_ga4': 'GA4...', 'fetching_gsc': 'GSC...', 'fetching_gads': 'Google Ads...', 'fetching_meta': 'Meta...', 'fetching_data': 'Data...', 'processing': 'Aggregating...', 'generating_ai': 'Consulting AI...', 'completed': 'Finalizing...' };

      return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          const { data: statusData } = await supabase.from("report_status").select("status, error_message").eq("report_id", rid).maybeSingle();
          if (statusData) {
            setPollingStatus(`[${label}] ${statusMap[statusData.status] || statusData.status}`);
            if (statusData.status === "failed") {
              clearInterval(interval);
              reject(new Error(`${label} Failed: ${statusData.error_message || "Unknown error"}`));
              return;
            }
          }

          const { data } = await supabase.from("processed_reports").select("*").eq("report_id", rid).maybeSingle();
          if (data) {
            clearInterval(interval);
            resolve(data);
          }
        }, REPORT_POLL_INTERVAL_MS);

        setTimeout(() => {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for ${label} report`));
        }, 600000);
      });
    };

    try {
      if (!seoReport) {
        setPollingStatus("Waiting for SEO Report...");
        seoReport = await pollReport(seo_id, "SEO");
      }

      if (!perfReport) {
        setPollingStatus("SEO Synced. Waiting for Performance...");
        perfReport = await pollReport(perf_id, "Performance");
      }

      const seoPart = buildSeoReport(seoReport, nd.startDate, nd.endDate);
      const perfPart = buildPerformanceReport(perfReport, nd.startDate, nd.endDate);

      const merged = {
        ...seoReport,
        report_id: `${seo_id}_${perf_id}`,
        kpi_summary: { ...(seoReport.kpi_summary || {}), ...(perfReport.kpi_summary || {}) },
        google_ads_details: perfReport.google_ads_details,
        meta_ads_kpi: perfReport.meta_ads_kpi,
        meta_ads_details: perfReport.meta_ads_details,
        meta_ads_charts: perfReport.meta_ads_charts,
        ai_recommendations: [...(seoReport.ai_recommendations || []), ...(perfReport.ai_recommendations || [])],
        summarizedAdviceList: [...(seoPart.summarizedAdviceList || []), ...(perfPart.summarizedAdviceList || [])],
        adviceList: [...(seoPart.adviceList || []), ...(perfPart.adviceList || [])],
        ai_summary: {
          seo_overview: seoReport.ai_summary?.seo_overview || seoReport.ai_summary || "",
          performance_overview: perfReport.ai_summary?.performance_overview || perfReport.ai_summary || ""
        },
        ai_insights: {
          branding: seoReport.ai_insights?.branding || perfPart.ai_insights?.branding || {},
          cover: seoReport.ai_insights?.cover || perfPart.ai_insights?.cover || {},
          conclusion: seoReport.ai_insights?.conclusion || perfPart.ai_insights?.conclusion || "",
          slides: {
            ...(seoReport.ai_insights?.slides || {}),
            ...(perfReport.ai_insights?.slides || {})
          }
        },
        ai_competitor_analysis: seoReport.ai_competitor_analysis || perfReport.ai_competitor_analysis,
        improvement_roadmap: seoPart.improvement_roadmap || perfPart.improvement_roadmap,
        competitor_intelligence: seoPart.competitor_intelligence || perfPart.competitor_intelligence,
        radar_self: { ...(seoPart.radar_self || {}), ...(perfPart.radar_self || {}) },
        module: "combined"
      };

      setReportData(buildReportFromRow(merged, "Combined Intelligence", nd.startDate, nd.endDate));
      setIsLoading(false);
      toast.success('Combined intelligence sync complete');
    } catch (err: any) {
      console.error("Combined sync error:", err);
      setIsLoading(false);
      setErrorMsg(err.message);
      toast.error(err.message);
    }
  };

  const handleReportSuccess = async (report_id: string, immediateData: any, cat: string, nd: { startDate: string, endDate: string }) => {
    if (!report_id) {
       console.error("[useReportData] handleReportSuccess called without report_id");
       setIsLoading(false);
       return;
    }

    if (immediateData) {
      console.log(`[useReportData] immediateData received for ${report_id}`);
      setReportData(buildReportFromRow(immediateData, cat, nd.startDate, nd.endDate));
      setIsLoading(false);
      toast.success('Real-time report generated');
      return;
    }

    const statusMap: Record<string, string> = { 'pending': 'Queuing...', 'fetching_credentials': 'Credentials...', 'fetching_ga4': 'GA4...', 'fetching_gsc': 'GSC...', 'fetching_gads': 'Google Ads...', 'fetching_meta': 'Meta...', 'fetching_data': 'Data...', 'processing': 'Aggregating...', 'generating_ai': 'Consulting AI...', 'completed': 'Finalizing...' };

    // Initial check
    const { data: initialStatus } = await supabase.from("report_status").select("status").eq("report_id", report_id).maybeSingle();
    if (initialStatus?.status === "completed") {
      console.log(`[useReportData] Report ${report_id} already completed on first check`);
      await loadCompletedReport(report_id, cat, nd);
      return;
    }

    if (statusChannelRef.current) { statusChannelRef.current.unsubscribe(); statusChannelRef.current = null; }
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (pollingTimeoutRef.current) { clearTimeout(pollingTimeoutRef.current); pollingTimeoutRef.current = null; }

    pollingTimeoutRef.current = setTimeout(() => {
      pollingTimeoutRef.current = null;
      if (!pollIntervalRef.current) {
        console.log(`[useReportData] Realtime fallback triggered for ${report_id}`);
        pollIntervalRef.current = setInterval(async () => {
          try {
            const { data, error } = await supabase.from("report_status").select("status, error_message").eq("report_id", report_id).maybeSingle();
            if (error) {
              console.error("[useReportData] Polling status error:", error);
              return;
            }
            if (data) {
              setPollingStatus(statusMap[data.status] || data.status);
              if (data.status === "completed") {
                if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
                await loadCompletedReport(report_id, cat, nd);
                toast.success('Neural sync complete (fallback)');
              } else if (data.status === "failed") {
                if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
                setIsLoading(false); setErrorMsg(data.error_message || "Failed.");
                toast.error('Neural link failed (fallback)');
              }
            }
          } catch (pollingErr) {
            console.error("[useReportData] Polling interval exception:", pollingErr);
          }
        }, REPORT_POLL_INTERVAL_MS);
      }
    }, POLLING_FALLBACK_DELAY_MS);

    statusChannelRef.current = supabase.channel(`report-status-${report_id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'report_status', filter: `report_id=eq.${report_id}` }, async (payload: { new: { status: string; error_message?: string } }) => {
      const newStatus = payload.new.status;
      console.log(`[useReportData] Realtime status update: ${newStatus}`);
      setPollingStatus(statusMap[newStatus] || newStatus);
      if (newStatus === "completed" || newStatus === "failed") {
        if (statusChannelRef.current) { statusChannelRef.current.unsubscribe(); statusChannelRef.current = null; }
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
        if (pollingTimeoutRef.current) { clearTimeout(pollingTimeoutRef.current); pollingTimeoutRef.current = null; }

        if (newStatus === "completed") {
          await loadCompletedReport(report_id, cat, nd);
          toast.success('Neural sync complete');
        } else {
          setIsLoading(false); setErrorMsg(payload.new.error_message || "Failed.");
          toast.error('Neural link failed');
        }
      }
    }).subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        console.warn(`[useReportData] Subscription status: ${status}`);
      }
    });
  };

  return { reportData, setReportData, isLoading, errorMsg, setErrorMsg, pollingStatus, fetchReportData };
};
