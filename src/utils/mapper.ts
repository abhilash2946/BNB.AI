import { ReportResponse, MarketingReport, KpiItem, AdviceItem, RadarDataPoint } from '../types';

const parseNumeric = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  // Remove currency symbols, commas, and percentage signs
  const cleaned = val.replace(/[₹$,%]/g, '').replace(/,/g, '').trim();
  return parseFloat(cleaned) || 0;
};

export const mapReportResponseToMarketingReport = (
  report: ReportResponse,
  id: string,
  siteName: string,
  category: any,
  dateRange: { start: string; end: string },
  siteImageUrl?: string
): MarketingReport => {

  // Map KPIs
  const kpis: KpiItem[] = report.tableData1.slice(0, 6).map((item, index) => {
    const icons = ["TrendingUp", "Users", "Activity", "Target", "PieChart", "Zap"];
    const changeVal = parseFloat(item.change.replace(/[+%]/g, '')) || 0;

    // Ensure value is localized if it's a number string
    let displayValue = item.current;
    const numericValue = parseFloat(displayValue.replace(/[₹$,%]/g, ''));
    if (!isNaN(numericValue) && !displayValue.includes('%') && !displayValue.includes('₹') && !displayValue.includes('$')) {
      displayValue = numericValue.toLocaleString('en-IN');
    }

    return {
      label: item.metric.toUpperCase(),
      value: displayValue,
      change: Math.abs(changeVal),
      isPositive: changeVal >= 0,
      icon: icons[index % icons.length]
    };
  });

  // Ensure we have exactly 6 KPIs for the dashboard if possible, or fill with defaults
  while (kpis.length < 6) {
    const i = kpis.length;
    const labels = ["TRAFFIC", "LEADS", "REVENUE", "CONVERSIONS", "ROAS", "ENGAGEMENT"];
    const icons = ["TrendingUp", "Users", "Activity", "Target", "PieChart", "Zap"];
    kpis.push({
      label: labels[i],
      value: i === 2 ? "₹0" : "0",
      change: 0,
      isPositive: true,
      icon: icons[i]
    });
  }

  // Map Advice
  const adviceList: AdviceItem[] = report.adviceList.map((adv: any) => {
    if (typeof adv === 'string') {
      return {
        title: "Strategic Advice",
        description: adv,
        priority: "Medium",
        impact: "Medium",
        effort: "Medium"
      };
    }
    return {
      title: adv.title || "Strategic Advice",
      description: adv.description || "",
      priority: (adv.priority || (adv.impact === 'High' ? 'High' : 'Medium')) as any,
      impact: adv.impact || "Medium",
      effort: adv.effort || "Medium",
      target: adv.target
    };
  });

  // Map Radar Data
  const rawRadar = report.radar_data || report.aiCompetitorAnalysis?.radar_data || [];
  const radarData = (rawRadar || []).map((d: any) => {
    const { subject, ...rest } = d;
    return { subject, ...rest };
  });

  const result: MarketingReport = {
    id: id || `report_${Date.now()}`,
    report_id: report.report_id,
    siteName: siteName,
    category: category,
    dateRange: dateRange,
    generatedAt: new Date().toISOString(),
    kpis: kpis,
    executiveSummary: report.narrative1,
    adviceList: adviceList,
    summarizedAdviceList: report.summarizedAdviceList,
    radarData: radarData,
    chartData: report.chartData || [],
    chartLabelA: report.chartLabelA,
    chartLabelB: report.chartLabelB,
    chartLabelC: report.chartLabelC,
    imageUrl: siteImageUrl,
    aiSlideDescriptions: report.ai_slide_descriptions ? {
      meta_titles: report.ai_slide_descriptions.meta_titles,
      heading_structure: report.ai_slide_descriptions.heading_structure,
      internal_linking: report.ai_slide_descriptions.internal_linking,
      content_formatting: report.ai_slide_descriptions.content_formatting,
      gmb_authority: report.ai_slide_descriptions.gmb_authority,
      gmb_support: report.ai_slide_descriptions.gmb_support,
    } : undefined,
    improvement_roadmap: report.improvement_roadmap,
    competitor_intelligence: report.competitor_intelligence,
    radar_self: report.radar_self,
    tableData1: report.tableData1,
    tableData2: report.tableData2,
    topPages: report.topPages,
    topPageTitles: report.topPageTitles,
    sessionsByChannel: report.sessionsByChannel,
    eventsByEventName: report.eventsByEventName,
    topKeywords: report.topKeywords, // Pass through for ClientReports.tsx
  };

  if (category === 'SEO' || category === 'Combined Intelligence') {
    const rawSeoData = report.ga4_details || {};
    const geoData = (report.topCountries && report.topCountries.length > 0) ? report.topCountries :
                   (rawSeoData.top_countries && rawSeoData.top_countries.length > 0) ? rawSeoData.top_countries :
                   (report.users_by_country && report.users_by_country.length > 0) ? report.users_by_country : [];

    const timelineData = (report.userActivityOverTime && report.userActivityOverTime.length > 0) ? report.userActivityOverTime :
                        (rawSeoData.daily_users && rawSeoData.daily_users.length > 0) ? rawSeoData.daily_users :
                        (report.chartData && report.chartData.length > 0) ? report.chartData :
                        (report.chart_datasets && report.chart_datasets.length > 0) ? report.chart_datasets : [];

    result.seo = {
      activeUsersByCountry: geoData.map(c => ({
        country: c.country || c.label || 'Unknown',
        users: parseInt(String(c.users || c.valueA || 0)) || 0
      })),
      totals: report.seo?.totals || report.ga4_details || {},
      activeUsersInsight: report.tableExplanations?.active_users_by_country || report.tableExplanations?.country_overview || "Geographical distribution shows primary engagement nodes.",
      userActivityOverTime: timelineData.map(a => {
        const total = parseInt(String(a.users || a.valueA || 0)) || 0;
        const returning = parseInt(String(a.returning || a.valueB || a.returningUsers || 0)) || 0;
        return {
          date: a.date || a.label || 'Unknown',
          users: total,
          returning: returning,
          newUsers: a.newUsers || Math.max(0, total - returning)
        };
      }),
      userActivityInsight: report.tableExplanations?.user_activity_over_time || report.tableExplanations?.activity_overview || "Engagement flux over the temporal range.",
      topKeywords: (report.tableData2 || []).map(k => ({
        keyword: k.item || 'Unknown',
        clicks: parseInt(String(k.value || 0)) || 0,
        ctr: k.share || '0%',
        position: k.trend || '0',
        previous_position: k.prev || '-'
      })),
      averagePosition: report.averagePosition,
      topKeywordsInsight: report.aiTopKeywordsOverview || report.tableExplanations?.top_keywords_overview || "Search term resonance and bidding efficiency.",
      viewsByPageTitle: (report.topPageTitles || []).map(p => ({ pageTitle: p.title || 'Unknown', views: parseInt(String(p.views || 0)) || 0 })),
      viewsByPageInsight: report.tableExplanations?.views_by_page_title || report.tableExplanations?.page_title_overview || "Content resonance metrics across active page nodes.",
      sessionsByChannel: (report.sessionsByChannel || rawSeoData.sessions_by_channel || []).map(s => ({ channel: s.channel || 'Unknown', sessions: parseInt(String(s.sessions || 0)) || 0 })),
      sessionsInsight: report.tableExplanations?.sessions_by_channel || report.tableExplanations?.channel_overview || "Acquisition protocol efficiency.",
      eventCountByEventName: (report.eventsByEventName || rawSeoData.events_by_event_name || []).map(e => ({ event: e.eventName || e.event || 'Unknown', count: parseInt(String(e.count || 0)) || 0 })),
      eventInsight: report.tableExplanations?.event_count_by_event_name || report.tableExplanations?.event_overview || "Interaction event density parsing.",
      keyEventsByPlatform: (report.keyEventsByPlatform || rawSeoData.key_events_by_platform || []).map(p => ({ platform: p.platform || 'Unknown', events: parseInt(String(p.keyEvents || p.events || 0)) || 0 })),
      platformInsight: report.tableExplanations?.key_events_by_platform || report.tableExplanations?.platform_overview || "Hardware gateway distribution metrics.",
      sectionAdvice: {
        kpi_advice: report.sectionAdvice?.kpi_advice || report.section_advice?.kpi_advice || [],
        demographics: report.sectionAdvice?.country_advice || report.section_advice?.country_advice || report.sectionAdvice?.demographic_advice || report.section_advice?.demographic_advice || [],
        timeline: report.sectionAdvice?.activity_advice || report.section_advice?.activity_advice || report.sectionAdvice?.timeline_advice || report.section_advice?.timeline_advice || [],
        keywords: report.sectionAdvice?.keyword_advice || report.section_advice?.keyword_advice || [],
        pages: report.sectionAdvice?.page_title_advice || report.section_advice?.page_title_advice || [],
        channels: report.sectionAdvice?.channel_advice || report.section_advice?.channel_advice || [],
        events: report.sectionAdvice?.event_advice || report.section_advice?.event_advice || [],
        platforms: report.sectionAdvice?.platform_advice || report.section_advice?.platform_advice || [],
      },
      aiCompetitorAnalysis: {
        inferredActions: report.aiCompetitorAnalysis?.inferred_actions || report.aiCompetitorAnalysis?.inferredActions || [],
        recommendedSteps: report.aiCompetitorAnalysis?.actionable_steps || report.aiCompetitorAnalysis?.recommended_steps || report.aiCompetitorAnalysis?.recommendedSteps || [],
        competitor_breakdown: report.aiCompetitorAnalysis?.competitor_breakdown || report.aiCompetitorAnalysis?.competitorBreakdown || [],
        overall_threat_summary: report.aiCompetitorAnalysis?.overall_threat_summary || report.aiCompetitorAnalysis?.overallThreatSummary || "",
        self_gap_analysis: report.aiCompetitorAnalysis?.self_gap_analysis || report.aiCompetitorAnalysis?.selfGapAnalysis || null,
      }
    };
  }

  if (category === 'Performance Marketing' || category === 'Combined Intelligence') {
    const perfKpis = (category === 'Combined Intelligence' && report.googleAdsKpis)
      ? report.googleAdsKpis
      : report.tableData1;

    result.performance = {
      googleAdsKpis: perfKpis.map(d => ({
        metric: d.metric,
        current: d.current,
        previous: d.previous,
        pctChange: parseFloat(d.change.replace(/[+%]/g, '')) || 0,
        isGood: !d.change.startsWith('-'),
        currentValue: parseNumeric(d.current),
        previousValue: parseNumeric(d.previous)
      })),
      totals: report.performance?.totals || {
        google: report.google_ads_details || {},
        meta: report.metaKpi?.current || report.meta_ads_kpi?.current || {}
      },
      googleAdsInsight: report.tableExplanations?.kpi_overview || report.tableExplanations?.google_ads_overview || "Google Ads campaign efficiency summary.",
      topCampaigns: (report.google_ads_details?.top_campaigns || []).map((c: any) => ({
        campaign: c.campaign || c.name || "Unknown",
        status: c.status,
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        interactions: c.interactions || 0,
        cost: `₹${(c.cost || (c.cost_micros/1000000) || 0).toLocaleString('en-IN')}`,
        leads: c.conversions || c.leads || 0,
        cpa: `₹${(c.cpa || 0).toLocaleString('en-IN')}`,
        costValue: c.cost || (c.cost_micros/1000000) || 0
      })),
      topCampaignsInsight: report.tableExplanations?.top_campaigns || "Primary campaign performance matrices.",
      topKeywords: (report.google_ads_details?.top_keywords || []).map((k: any) => ({
        keyword: k.keyword || "Unknown",
        impressions: k.impressions || 0,
        clicks: k.clicks || 0,
        leads: k.conversions || k.leads || 0,
        cpa: `₹${(k.cpa || 0).toLocaleString('en-IN')}`,
        ctr: `${(k.ctr || 0).toFixed(2)}%`,
        impressionsValue: k.impressions || 0,
        clicksValue: k.clicks || 0
      })),
      topKeywordsInsight: report.tableExplanations?.top_keywords || "Search term resonance and bidding efficiency.",
      googleDeviceBreakdown: (report.google_ads_details?.devices || []).map((d: any) => ({
        device: d.device,
        impressions: d.impressions || 0,
        clicks: d.clicks || 0,
        leads: d.conversions || 0,
        cpa: `₹${(d.conversions > 0 ? (d.cost / d.conversions) : 0).toFixed(2)}`,
        cost: `₹${d.cost?.toLocaleString('en-IN')}`,
        impressionsValue: d.impressions || 0,
        costValue: d.cost || 0
      })),
      googleDeviceInsight: report.tableExplanations?.devices || "Google hardware gateway distribution metrics.",
      metaAdsKpis: (() => {
        if (!report.metaKpi) return [];
        const { current, previous } = report.metaKpi;
        const curL = (current.leads || current.conversions || 0);
        const prevL = (previous.leads || previous.conversions || 0);
        const curS = (current.spend || current.cost || 0);
        const prevS = (previous.spend || previous.cost || 0);
        const curI = (current.impressions || 0);
        const prevI = (previous.impressions || 0);
        const curC = (current.clicks || 0);
        const prevC = (previous.clicks || 0);
        const curR = (current.roas || 0);
        const prevR = (previous.roas || 0);

        const safePct = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100;

        return [
          {
            metric: "Impressions",
            current: curI.toLocaleString('en-IN'),
            previous: prevI.toLocaleString('en-IN'),
            pctChange: safePct(curI, prevI),
            isGood: curI >= prevI,
            currentValue: curI,
            previousValue: prevI
          },
          {
            metric: "Clicks",
            current: curC.toLocaleString('en-IN'),
            previous: prevC.toLocaleString('en-IN'),
            pctChange: safePct(curC, prevC),
            isGood: curC >= prevC,
            currentValue: curC,
            previousValue: prevC
          },
          {
            metric: "Spend",
            current: `₹${curS.toLocaleString('en-IN')}`,
            previous: `₹${prevS.toLocaleString('en-IN')}`,
            pctChange: safePct(curS, prevS),
            isGood: curS <= prevS,
            currentValue: curS,
            previousValue: prevS
          },
          {
            metric: "Leads",
            current: curL.toLocaleString('en-IN'),
            previous: prevL.toLocaleString('en-IN'),
            pctChange: safePct(curL, prevL),
            isGood: curL >= prevL,
            currentValue: curL,
            previousValue: prevL
          },
          {
            metric: "Cost per Lead",
            current: `₹${(curL > 0 ? curS / curL : 0).toFixed(2)}`,
            previous: `₹${(prevL > 0 ? prevS / prevL : 0).toFixed(2)}`,
            pctChange: safePct((curL > 0 ? curS / curL : 0), (prevL > 0 ? prevS / prevL : 0)),
            isGood: (curL > 0 ? curS / curL : 0) <= (prevL > 0 ? prevS / prevL : 0),
            currentValue: curL > 0 ? curS / curL : 0,
            previousValue: prevL > 0 ? prevS / prevL : 0
          },
          {
            metric: "ROAS",
            current: `${curR.toFixed(2)}X`,
            previous: `${prevR.toFixed(2)}X`,
            pctChange: safePct(curR, prevR),
            isGood: curR >= prevR,
            currentValue: curR,
            previousValue: prevR
          }
        ].map(k => ({ ...k, pctChange: parseFloat(k.pctChange.toFixed(1)) }));
      })(),
      metaAdsInsight: report.tableExplanations?.meta_kpi_overview || report.tableExplanations?.meta_ads_overview || "Meta advertising resonance metrics.",
      metaTopCampaigns: (report.metaCampaigns || report.performance?.metaTopCampaigns || []).map((c: any) => ({
        campaign: c.campaign || c.name,
        status: c.status || "N/A",
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        interactions: c.interactions || 0,
        cost: c.cost || `₹${(c.spend || c.costValue || 0).toLocaleString('en-IN')}`,
        leads: c.leads || c.conversions || 0,
        costPerLead: c.costPerLead || `₹${(c.leads > 0 ? ((c.spend || c.costValue) / c.leads) : 0).toFixed(2)}`,
        costValue: c.costValue || c.spend || parseNumeric(c.cost) || 0
      })),
      metaTopCampaignsInsight: report.tableExplanations?.meta_campaigns || "Meta ecosystem campaign distribution.",
      metaAdSets: (report.metaAdsets || []).map((a: any) => ({
        adSet: a.adset || a.name,
        impressions: a.impressions || 0,
        clicks: a.clicks || 0,
        cost: `₹${a.spend?.toLocaleString('en-IN') || "0"}`,
        leads: a.leads || a.conversions || 0,
        costPerLead: `₹${(a.leads > 0 ? (a.spend / a.leads) : 0).toFixed(2)}`,
        costValue: a.spend || 0
      })),
      metaAdSetsInsight: report.tableExplanations?.meta_adsets || "Audience segment performance and ROI.",
      metaDeviceBreakdown: (report.metaDevices || []).map((d: any) => ({
        device: d.device,
        impressions: d.impressions || 0,
        clicks: d.clicks || 0,
        leads: d.leads || 0,
        costPerLead: `₹${(d.leads > 0 ? (d.spend / d.leads) : 0).toFixed(2)}`,
        cost: `₹${d.spend?.toLocaleString('en-IN') || "0"}`,
        impressionsValue: d.impressions || 0,
        costValue: d.spend || 0
      })),
      metaDeviceInsight: report.tableExplanations?.meta_devices || "Hardware-specific engagement metrics.",
      sectionAdvice: {
        kpi_advice: report.sectionAdvice?.kpi_advice || report.section_advice?.kpi_advice || [],
        campaign_advice: report.sectionAdvice?.campaign_advice || report.section_advice?.campaign_advice || [],
        keyword_advice: report.sectionAdvice?.keyword_advice || report.section_advice?.keyword_advice || [],
        device_advice: report.sectionAdvice?.device_advice || report.section_advice?.device_advice || [],
        meta_kpi_advice: report.sectionAdvice?.meta_kpi_advice || report.section_advice?.meta_kpi_advice || [],
        meta_campaign_advice: report.sectionAdvice?.meta_campaign_advice || report.section_advice?.meta_campaign_advice || [],
        meta_adset_advice: report.sectionAdvice?.meta_adset_advice || report.section_advice?.meta_adset_advice || [],
        meta_device_advice: report.sectionAdvice?.meta_device_advice || report.section_advice?.meta_device_advice || [],
      },
      websiteTrafficByCountry: (report.topCountries || report.ga4_details?.top_countries || []).map((c: any) => ({
        country: c.country || 'Unknown',
        users: parseInt(c.users) || 0
      })),
      websiteTrafficInsight: report.tableExplanations?.active_users_by_country || "Distribution of website visitors driven by performance marketing efforts.",
      dailyWebsiteActivity: (report.userActivityOverTime || report.ga4_details?.daily_users || report.chartData || []).map((a: any) => {
        const total = a.users || a.valueA || 0;
        const returning = a.returning || a.valueB || a.returningUsers || 0;
        return {
          date: a.date || a.label,
          users: total,
          returning: returning,
          newUsers: a.newUsers || Math.max(0, total - returning)
        };
      }),
      dailyWebsiteActivityInsight: report.tableExplanations?.user_activity_over_time || "Daily user volume trend on the website during the campaign period.",
      sessionsByChannel: (report.sessionsByChannel || report.ga4_details?.sessions_by_channel || []).map(s => ({ channel: s.channel, sessions: s.sessions })),
      sessionsInsight: report.tableExplanations?.sessions_by_channel || report.tableExplanations?.channel_overview || "Acquisition protocol efficiency across all primary channels.",
      aiCompetitorAnalysis: {
        inferredActions: report.aiCompetitorAnalysis?.inferred_actions || report.aiCompetitorAnalysis?.inferredActions || [],
        recommendedSteps: report.aiCompetitorAnalysis?.actionable_steps || report.aiCompetitorAnalysis?.recommended_steps || report.aiCompetitorAnalysis?.recommendedSteps || [],
        competitor_breakdown: report.aiCompetitorAnalysis?.competitor_breakdown || report.aiCompetitorAnalysis?.competitorBreakdown || [],
        overall_threat_summary: report.aiCompetitorAnalysis?.overall_threat_summary || report.aiCompetitorAnalysis?.overallThreatSummary || "",
        self_gap_analysis: report.aiCompetitorAnalysis?.self_gap_analysis || report.aiCompetitorAnalysis?.selfGapAnalysis || null,
      }
    };
  }

  if (category === 'Social Media Marketing') {
    result.social = {
      socialKpis: report.tableData1.map(d => ({
        metric: d.metric,
        current: d.current,
        previous: d.previous,
        pctChange: parseFloat(d.change.replace(/[+%]/g, '')) || 0,
        isGood: !d.change.startsWith('-')
      })),
      socialInsight: report.narrative1,
      impressionsTimeline: (report.metaDaily || []).map((d: any) => ({
        date: d.date,
        facebook: d.fb_impressions || 0,
        instagram: d.ig_impressions || 0
      })),
      impressionsTimelineInsight: "Temporal engagement resonance across platforms.",
      sectionAdvice: {
        kpi_advice: report.sectionAdvice?.kpi_advice || report.section_advice?.kpi_advice || [],
        timeline_advice: report.sectionAdvice?.timeline_advice || report.section_advice?.timeline_advice || [],
      }
    };
  }

  return result;
};
