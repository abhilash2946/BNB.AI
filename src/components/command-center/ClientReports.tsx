import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Search,
  Eye,
  Layout,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Grid,
  Award,
  Globe,
  Users,
  Tv,
  Edit3,
  Save,
  Pencil,
  Activity,
  Share2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { MarketingReport, CategoryType, Slide, SlideType } from '../../types';
import { SlideRenderer } from './SlideRenderer';
import { initialSlides } from './reportData';
import ShareDialog from '../ShareDialog';
import { exportSlidesToPPT } from '../../utils/exportPPT';

const COLORS = ['#FFFFFF', '#9CA3AF', '#D1D5DB', '#4B5563', '#1F2937', '#6B7280', '#374151'];

const parseNumeric = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  let clean = val.replace(/[₹$,%]/g, '').replace(/,/g, '').toUpperCase().trim();
  let multiplier = 1;
  if (clean.endsWith('K')) {
    multiplier = 1000;
    clean = clean.slice(0, -1);
  } else if (clean.endsWith('M')) {
    multiplier = 1000000;
    clean = clean.slice(0, -1);
  }
  return (parseFloat(clean) * multiplier) || 0;
};

interface ClientReportsProps {
  report: MarketingReport | null;
  siteId?: string;
  category: CategoryType;
  setCategory: (cat: CategoryType) => void;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  userAvatarUrl?: string;
  userName?: string;
  resetTrigger?: number; // Force re-sync when generate is clicked
  isSharedMode?: boolean;
}

export default function ClientReports({ report, siteId, category, setCategory, isFullscreen, setIsFullscreen, userAvatarUrl, userName, resetTrigger, isSharedMode }: ClientReportsProps) {
  const [slides, setSlides] = useState<Slide[]>(() => {
    return initialSlides;
  });

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [isPresenting, setIsPresenting] = useState<boolean>(isSharedMode || false);
  const [transitionStyle, setTransitionStyle] = useState<'cube' | 'flip' | 'zoom' | 'slide'>('slide');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Presentation Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(5000); // ms per slide
  const [timeLeft, setTimeLeft] = useState<number>(100); // percentage of visual progress bar

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const presentationRef = useRef<HTMLDivElement>(null);

  // Load and populate slides from report data
  useEffect(() => {
    if (report) {
       console.log('[PPT Sync] Re-mapping slides from fresh report data...');
       // Populate initial template with real report values to avoid "copy-paste" placeholder feel
       const populated = initialSlides.map(s => {
         const siteName = report.siteName || 'Client';
         const dateRangeStr = report.dateRange ? `${report.dateRange.start} – ${report.dateRange.end}` : 'Current Period';

         switch (s.type) {
           case 'digital_cover':
             return {
               ...s,
               title: 'Digital Marketing\nMonthly Performance\nReport',
               metadata: {
                 ...s.metadata,
                 client: siteName.toUpperCase(),
                 reportingPeriod: dateRangeStr,
                 preparedBy: userName || 'Black and Bold',
                 platform: report.siteName || 'RL Tours and Travels'
               },
               images: {
                 ...s.images,
                 logo: report.imageUrl || ''
               }
             };

           case 'table_of_contents':
             return {
               ...s,
               metadata: {
                 ...s.metadata,
                 rightDesc: `Digital Marketing Monthly Performance Report\n${dateRangeStr}`
               }
             };

           case 'exec_summary':
             const kpisForSummary = report.kpis || [];
             const gAdsKpis = (report as any).performance?.googleAdsKpis || [];
             const mAdsKpis = (report as any).performance?.metaAdsKpis || [];

             const gRoas = gAdsKpis.find((k: any) => k.metric === 'ROAS')?.current || '0.00X';
             const mRoas = mAdsKpis.find((k: any) => k.metric === 'ROAS')?.current || '0.00X';

             const trafficKpi = kpisForSummary.find(k => k.label.toUpperCase().includes('TRAFFIC') || k.label.toUpperCase().includes('USER'));
             const trafficChange = trafficKpi?.change ? trafficKpi.change + '%' : '0%';

             const leadsKpi = kpisForSummary.find(k => k.label.toUpperCase().includes('LEAD'));
             const leadsValue = leadsKpi?.value || (report.category === 'Combined Intelligence' ? kpisForSummary[1]?.value : '0');

             const sTotals_exec = (report as any).seo?.totals || (report as any).kpi_summary?.ga4 || {};
             const usersCount = sTotals_exec.totalUsers?.current || '0';

             // Performance detail extraction
             const gTotals_exec = (report as any).performance?.totals?.google || (report as any).kpi_summary?.google_ads?.current || {};
             const gSpend = gTotals_exec.cost ? `₹${Number(gTotals_exec.cost).toLocaleString('en-IN')}` : '₹0';
             const gRev = gTotals_exec.conversions_value ? `₹${Number(gTotals_exec.conversions_value).toLocaleString('en-IN')}` : '₹0';
             const gClicks = gTotals_exec.clicks || '0';
             const gCpl = gTotals_exec.cost_per_lead || (report as any).google_ads_details?.cost_per_lead || '0';

             // Generate 4 highly detailed bullet points
             const bulletPoints = [
               `• Generated ${leadsValue} leads from ${gClicks.toLocaleString()} clicks via Google Ads, achieving an efficient acquisition cost (CPL) of ₹${gCpl}.`,
               `• Total organic reach expanded by ${trafficChange}, with site traffic scaling to ${usersCount.toLocaleString('en-IN')} active users driven by optimized search visibility.`,
               `• Achieved a ${gRoas} Return on Ad Spend (ROAS), generating ${gRev} in conversion value from a strategic investment of ${gSpend} in Google Search.`,
               `• Meta Ads remains a high-potential expansion vector (${mRoas} ROAS) to diversify the lead funnel and scale brand engagement beyond search intent.`
             ].join('\n');

             return {
               ...s,
               kpis: [
                 { label: 'Leads', value: leadsValue },
                 { label: 'Traffic', value: trafficChange },
                 { label: 'Google Ads ROAS', value: gRoas },
                 { label: 'Meta Ads ROAS', value: mRoas }
               ],
               metadata: {
                 ...s.metadata,
                 rightDesc: bulletPoints
               }
             };

           case 'services_delivered':
             return {
               ...s,
               metadata: {
                 ...s.metadata,
                 rightDesc: 'Integrated Activities Executed Across SEO, Social Media, Paid Advertising And Website Management.'
               }
             };

           case 'overall_performance':
             const formatDate = (dateStr: string) => {
               if (!dateStr) return 'N/A';
               const date = new Date(dateStr);
               return date.toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' });
             };

             const currStart = report.dateRange?.start || '';
             const currEnd = report.dateRange?.end || '';

             // Calculate Previous Period (Same as Backend Logic: 31 days back)
             let prevStartStr = 'Previous Month';
             let prevEndStr = 'Previous Month';
             if (currStart) {
                const start = new Date(currStart);
                const pEnd = new Date(start);
                pEnd.setDate(pEnd.getDate() - 1);
                const pStart = new Date(pEnd);
                pStart.setDate(pStart.getDate() - 30);

                prevStartStr = formatDate(pStart.toISOString().split('T')[0]);
                prevEndStr = formatDate(pEnd.toISOString().split('T')[0]);
             }

             const currLabel = 'Current Month';
             const prevLabel = 'Previous Month';

             return {
               ...s,
               tableData: (report.tableData1 || []).slice(0, 8).map((row, i) => ({
                 kpi: row.metric,
                 prev: row.previous,
                 current: row.current,
                 growth: row.change
               })),
               metadata: {
                 ...s.metadata,
                 currDateLabel: currLabel,
                 prevDateLabel: prevLabel,
                 rightDesc: currStart ? `${prevLabel} to ${currLabel} Performance Comparison.` : 'Performance Comparison.'
               }
             };

           case 'seo_performance':
             // Robust Mapping: Mirror Current Logic for Previous Logic
             const sMod = report.seo || report;
             const sTotals = sMod?.kpi_summary?.ga4 || sMod?.totals || (report.module === 'seo' ? report.kpi_summary?.ga4 : {});
             const sKpis = report.kpis || [];

             // Direct lookup with fallbacks (Matches current code behavior)
             const users = sTotals.totalUsers?.current || parseNumeric(sKpis[0]?.value);
             const pUsers = sTotals.totalUsers?.previous || parseNumeric(sKpis[0]?.previous);

             const sessions = sTotals.sessions?.current || parseNumeric(sKpis[1]?.value);
             const pSessions = sTotals.sessions?.previous || parseNumeric(sKpis[1]?.previous);

             const newUsers = sTotals.newUsers?.current || parseNumeric(sKpis[2]?.value);
             const pNewUsers = sTotals.newUsers?.previous || parseNumeric(sKpis[2]?.previous);

             const bounce = sTotals.bounceRate?.current !== undefined
               ? (sTotals.bounceRate.current * 100).toFixed(1) + '%'
               : (sKpis[4]?.value || '0.0%');
             const pBounce = sTotals.bounceRate?.previous !== undefined
               ? (sTotals.bounceRate.previous * 100).toFixed(1) + '%'
               : (sKpis[4]?.previous || '0.0%');

             const duration = sTotals.averageSessionDuration?.current
               ? Math.round(sTotals.averageSessionDuration.current) + 's'
               : (sKpis[5]?.value || 'N/A');
             const pDuration = sTotals.averageSessionDuration?.previous
               ? Math.round(sTotals.averageSessionDuration.previous) + 's'
               : (sKpis[5]?.previous || 'N/A');

             // Helper for change percent (Mirrors how current is handled)
             const getGrowth = (metric: any, fallbackIdx: number) => {
                if (metric?.change_percent !== undefined) return metric.change_percent.toString() + '%';
                if (sKpis[fallbackIdx]?.change) return sKpis[fallbackIdx].change.toString() + '%';
                return undefined;
             };

             return {
               ...s,
               kpis: [
                 {
                    label: 'Organic Users',
                    value: users > 0 ? users.toLocaleString('en-IN') : (sKpis[0]?.value || '0'),
                    prev: pUsers > 0 ? pUsers.toLocaleString('en-IN') : (sKpis[0]?.previous || '0'),
                    growth: getGrowth(sTotals.totalUsers, 0),
                    isPositive: (sTotals.totalUsers?.change_percent || sKpis[0]?.change || 0) >= 0
                 },
                 {
                    label: 'Organic Sessions',
                    value: sessions > 0 ? sessions.toLocaleString('en-IN') : (sKpis[1]?.value || '0'),
                    prev: pSessions > 0 ? pSessions.toLocaleString('en-IN') : (sKpis[1]?.previous || '0'),
                    growth: getGrowth(sTotals.sessions, 1),
                    isPositive: (sTotals.sessions?.change_percent || sKpis[1]?.change || 0) >= 0
                 },
                 {
                    label: 'New Users',
                    value: newUsers > 0 ? newUsers.toLocaleString('en-IN') : (sKpis[2]?.value || '0'),
                    prev: pNewUsers > 0 ? pNewUsers.toLocaleString('en-IN') : (sKpis[2]?.previous || '0'),
                    growth: getGrowth(sTotals.newUsers, 2),
                    isPositive: (sTotals.newUsers?.change_percent || sKpis[2]?.change || 0) >= 0
                 },
                 {
                    label: 'Average Session Duration',
                    value: duration,
                    prev: pDuration,
                    growth: getGrowth(sTotals.averageSessionDuration, 5),
                    isPositive: (sTotals.averageSessionDuration?.change_percent || sKpis[5]?.change || 0) >= 0
                 },
                 {
                    label: 'Bounce Rate',
                    value: bounce,
                    prev: pBounce,
                    growth: getGrowth(sTotals.bounceRate, 4),
                    isPositive: (sTotals.bounceRate?.change_percent || sKpis[4]?.change || 0) <= 0
                 }
               ],
               tableData: (report.topKeywords || report.seo?.topKeywords || []).slice(0, 4).map((kw: any) => ({
                 keyword: kw.keyword || kw.item || 'Unknown',
                 prev: (typeof kw.previous_position === 'number' && kw.previous_position > 0)
                   ? kw.previous_position.toFixed(1)
                   : (typeof kw.previous_position === 'string' && kw.previous_position !== '-')
                     ? kw.previous_position
                     : (kw.prev || '-'),
                 current: typeof kw.position === 'number' ? kw.position.toFixed(1) : (kw.trend || kw.position || 'N/A')
               })),
               metadata: {
                 ...s.metadata,
                 rightDesc: (report.ai_insights as any)?.slides?.seoPerformanceDesc || 'SEO Efforts Improved Search Visibility And Organic Growth.'
               }
             };

           case 'website_analytics':
             const chanData = report.sessionsByChannel || [];
             const getChanVal = (match: string) => {
                const found = chanData.find((c: any) => (c.channel || '').toLowerCase().includes(match.toLowerCase()));
                return found ? Number(found.sessions).toLocaleString('en-IN') : '0';
             };

             const formatUrl = (u: string) => {
                if (u === '/') return 'Homepage';
                if (!u) return 'Unknown';
                // Remove trailing slashes and common prefixes
                return u.replace(/\/$/, '').replace(/^\//, '').split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || u;
             };

             // Determine most visited page
             const topPageFromTitles = report.topPageTitles?.[0];
             const topPageFromPages = report.topPages?.[0];
             const mostVisited = topPageFromTitles?.title || (topPageFromPages ? formatUrl(topPageFromPages.page) : 'Homepage');

             // Prepare top pages table data
             let displayPages = [];
             if (report.topPageTitles && report.topPageTitles.length > 0) {
               displayPages = report.topPageTitles.slice(0, 4).map(p => ({
                 url: p.title || 'Unknown',
                 views: p.views?.toLocaleString() || '0'
               }));
             } else if (report.topPages && report.topPages.length > 0) {
               displayPages = report.topPages.slice(0, 4).map(p => ({
                 url: formatUrl(p.page),
                 views: p.views?.toLocaleString() || '0'
               }));
             }

             // Dynamic Insights Logic
             const topLandingPage = report.topPages?.find(p => p.page !== '/') || report.topPages?.[0];

             // 1. Lowest Bounce Rate Page Calculation
             let lowestBouncePage = 'Homepage';
             if (report.topPages && report.topPages.length > 0) {
                const validPages = report.topPages.filter(p => p.bounceRate !== undefined);
                if (validPages.length > 0) {
                   const minBounce = Math.min(...validPages.map(p => p.bounceRate!));
                   const bestPage = validPages.find(p => p.bounceRate === minBounce);
                   if (bestPage) lowestBouncePage = formatUrl(bestPage.page);
                }
             }

             // 2. Traffic Growth Percentage Mapping
             const organicKpi = report.kpis?.find(k => k.label.toLowerCase().includes('organic'));
             const growthVal = organicKpi ? (organicKpi.change >= 0 ? '+' : '') + organicKpi.change.toFixed(1) + '%' : '0.0%';

             return {
               ...s,
               kpis: [
                 { label: 'Organic Search', value: getChanVal('Organic Search') },
                 { label: 'Social Media', value: getChanVal('Social') },
                 { label: 'Paid Advertising', value: getChanVal('Paid') },
                 { label: 'Direct Traffic', value: getChanVal('Direct') }
               ],
               customData: {
                 ...s.customData,
                 insights: [
                    { label: 'Most Visited Page', value: mostVisited },
                    {
                      label: 'Highest Converting Page',
                      value: topLandingPage ? formatUrl(topLandingPage.page) : 'Thailand Packages'
                    },
                    {
                      label: 'Lowest Bounce Rate Page',
                      value: lowestBouncePage
                    },
                    {
                      label: 'Traffic Growth Percentage',
                      value: growthVal
                    }
                 ],
                 pages: displayPages.length > 0 ? displayPages : s.customData.pages
               },
               metadata: {
                 ...s.metadata,
                 // 3. Description Mapping
                 rightDesc: (report as any).tableExplanations?.sessions_by_channel ||
                            (report.ai_insights as any)?.slides?.trafficEngagementDesc ||
                            'Traffic Improved Through Organic And Paid Acquisition Channels.'
               }
             };

           case 'social_performance':
             const social = report.social;
             const fbKpi = (social?.socialKpis || []).find(k => k.metric.includes('FB'));
             const igKpi = (social?.socialKpis || []).find(k => k.metric.includes('IG'));
             return {
               ...s,
               customData: {
                 ...s.customData,
                 facebook: {
                   reach: fbKpi?.current || '0',
                   impressions: fbKpi?.current || '0',
                   engagement: '-',
                   followerGrowth: fbKpi?.pctChange ? (fbKpi.pctChange > 0 ? '+' : '') + fbKpi.pctChange + '%' : 'N/A'
                 },
                 instagram: {
                   reach: igKpi?.current || '0',
                   impressions: igKpi?.current || '0',
                   engagement: '-',
                   followerGrowth: igKpi?.pctChange ? (igKpi.pctChange > 0 ? '+' : '') + igKpi.pctChange + '%' : 'N/A'
                 },
                 linkedin: {
                   reach: '0',
                   impressions: '0',
                   engagement: '0',
                   followerGrowth: 'N/A'
                 },
                 youtube: {
                   views: '0',
                   watchTime: '0 Hrs',
                   subscribers: '0'
                 }
               },
               metadata: {
                 ...s.metadata,
                 rightDesc: (report.ai_insights as any)?.slides?.socialPerformanceDesc || 'Social Media Performance Metrics.'
               }
             };

           case 'content_performance':
             const cpTimeline = report.social?.impressionsTimeline || [];
             const cpPerf = (report as any).performance;
             const cpMeta = (report as any).metaCampaigns || cpPerf?.metaTopCampaigns || [];
             const cpDevices = cpPerf?.metaDeviceBreakdown || [];

             // Extract top device and theme with detailed stats
             const topDevObj = cpDevices.length > 0
               ? [...cpDevices].sort((a: any, b: any) => (b.costValue || 0) - (a.costValue || 0))[0]
               : null;
             const cpTopDev = topDevObj ? `${topDevObj.device}: ${topDevObj.cost}` : 'Mobile';

             const topCampaignObj = cpMeta.length > 0 ? cpMeta[0] : null;
             const cpTopTheme = topCampaignObj
               ? `${topCampaignObj.campaign || topCampaignObj.name} (${topCampaignObj.leads} Leads)`
               : 'International Destinations';

             // Calculate mobile spend %
             const totalSpend = cpDevices.reduce((acc: number, d: any) => acc + (d.costValue || 0), 0);
             const mobileSpend = cpDevices
               .filter((d: any) => d.device?.toLowerCase().includes('mobile') || d.device?.toLowerCase().includes('phone'))
               .reduce((acc: number, d: any) => acc + (d.costValue || 0), 0);
             const mobilePct = totalSpend > 0 ? ((mobileSpend / totalSpend) * 100).toFixed(0) : '99';

             return {
               ...s,
               // Labels remain identical
               kpis: [
                 { label: 'Social Posts', value: '0' },
                 { label: 'Reels', value: '0' },
                 { label: 'Stories', value: '0' },
                 { label: 'Videos', value: '0' },
                 { label: 'Blogs', value: '0%' }
               ],
               tableData: cpMeta.length > 0
                 ? cpMeta.slice(0, 3).map((c: any) => ({
                     name: c.campaign || c.name,
                     reach: (c.impressions || 0).toLocaleString(),
                     engagement: (c.clicks || 0).toLocaleString()
                   }))
                 : (cpTimeline.length > 0 ? cpTimeline.slice(0, 3).map(t => ({
                     name: t.date,
                     reach: t.facebook?.toLocaleString() || '0',
                     engagement: t.instagram?.toLocaleString() || '0'
                   })) : []),
               customData: {
                 ...s.customData,
                 insights: [
                    { label: 'Highest Engagement Format', value: cpTopDev },
                    { label: 'Best Performing Content Theme', value: cpTopTheme },
                    { label: 'Audience Preference Observations', value: `Mobile Dominance: ${mobilePct}% Spend` }
                 ]
               },
               metadata: {
                 ...s.metadata,
                 rightDesc: report.social?.impressionsTimelineInsight ||
                            (report.ai_insights as any)?.overallPerformanceDesc ||
                            (report.ai_insights as any)?.slides?.overallPerformanceDesc ||
                            'Content performance metrics and engagement analysis.'
               }
             };

           case 'meta_ads':
             const mModule = report.performance;
             const mK = (report as any).metaKpi || mModule?.totals?.meta || {};
             const mDetails = (report as any).metaCampaigns || mModule?.metaTopCampaigns || (report as any).performance?.metaTopCampaigns || (report.ai_insights as any)?.slides?.metaCampaigns || [];
             const mCur = mK.current || mK || {};
             const metaKpis = mModule?.metaAdsKpis || (report as any).performance?.metaAdsKpis || [];

             const getMetaKpi = (metricName: string) => metaKpis.find((k: any) => k.metric.toLowerCase().includes(metricName.toLowerCase()));

             return {
               ...s,
               tableData: mDetails.slice(0, 3).map((c: any) => {
                 const leads = Number(c.leads || c.conversions || 0);
                 const spend = parseNumeric(c.cost || c.spend || 0);
                 const cplVal = c.costPerLead || c.cost_per_lead || c.cpl || c.cpa;

                 return {
                   name: c.campaign || c.name,
                   spend: c.cost || c.spend,
                   leads: leads.toString(),
                   cpl: cplVal || (leads > 0 ? `₹${(spend / leads).toFixed(0)}` : '₹0')
                 };
               }),
               kpis: [
                 {
                    label: 'Reach',
                    value: mCur.reach?.toLocaleString() || getMetaKpi('Impressions')?.current || 'N/A',
                    growth: getMetaKpi('Impressions')?.pctChange?.toString() + '%',
                    isPositive: true
                 },
                 {
                    label: 'Impressions',
                    value: mCur.impressions?.toLocaleString() || getMetaKpi('Impressions')?.current || 'N/A',
                    growth: getMetaKpi('Impressions')?.pctChange?.toString() + '%',
                    isPositive: true
                 },
                 {
                    label: 'Link Clicks',
                    value: mCur.clicks?.toLocaleString() || getMetaKpi('Clicks')?.current || 'N/A',
                    growth: getMetaKpi('Clicks')?.pctChange?.toString() + '%',
                    isPositive: true
                 },
                 {
                    label: 'CTR',
                    value: mCur.ctr || getMetaKpi('CTR')?.current || 'N/A',
                    growth: getMetaKpi('CTR')?.pctChange?.toString() + '%',
                    isPositive: true
                 },
                 {
                    label: 'Leads Generated',
                    value: (mCur.leads || mCur.conversions)?.toString() || getMetaKpi('Leads')?.current || 'N/A',
                    growth: getMetaKpi('Leads')?.pctChange?.toString() + '%',
                    isPositive: true
                 },
                 {
                    label: 'Cost Per Lead',
                    value: (mCur.cost_per_lead || mCur.cpl)?.toString() || getMetaKpi('CPL')?.current || 'N/A',
                    growth: getMetaKpi('CPL')?.pctChange?.toString() + '%',
                    isPositive: (getMetaKpi('CPL')?.pctChange || 0) <= 0
                 }
               ]
             };

           case 'google_ads':
             const gModule = report.performance;
             const gTotals = gModule?.totals?.google || (report as any).kpi_summary?.google_ads?.current || {};
             const gDetails = report.google_ads_details || (report as any).performance?.google_ads_details || {};
             const gCampaigns = gDetails.top_campaigns || gModule?.topCampaigns || (report as any).performance?.topCampaigns || (report.ai_insights as any)?.slides?.googleCampaigns || [];
             const gKpis = gModule?.googleAdsKpis || (report as any).performance?.googleAdsKpis || [];

             const getGoogleKpi = (metricName: string) => gKpis.find((k: any) => k.metric.toLowerCase().includes(metricName.toLowerCase()));

             // Priority 1: Real top keywords from current module
             // Priority 2: Real search terms from current module
             // Priority 3: Fallback from previous manual edits (if not mock)
             const kwData = Array.isArray(gModule?.topKeywords) ? gModule.topKeywords : [];
             const searchTerms = Array.isArray((report as any).google_ads_details?.search_terms) ? (report as any).google_ads_details.search_terms : [];

             // Final list: prioritize keywords, then search terms, then existing slide data
             let finalKeywords: any[] = [];

             if (kwData.length > 0) {
               finalKeywords = kwData;
             } else if (searchTerms.length > 0) {
               finalKeywords = searchTerms;
             }

             // --- SMART GROUPING LOGIC ---
             // Google Ads can return the same keyword multiple times (e.g. for broad vs exact match).
             // We will group them by name and sum their metrics.
             const groupedMap: Record<string, any> = {};
             finalKeywords.forEach((k: any) => {
               const rawName = k.keyword || k.query || k.kw || k.item || '';
               const name = rawName.trim().toLowerCase();
               if (!name) return;

               if (!groupedMap[name]) {
                 groupedMap[name] = {
                   name: rawName, // Keep original casing from first occurrence
                   clicks: 0,
                   conversions: 0,
                   impressions: 0
                 };
               }
               groupedMap[name].clicks += Number(k.clicks || 0);
               groupedMap[name].conversions += Number(k.conversions || k.leads || k.clicks || 0);
               groupedMap[name].impressions += Number(k.impressions || 0);
             });

             const groupedKeywords = Object.values(groupedMap)
               .sort((a: any, b: any) => b.clicks - a.clicks) // Sort by most clicks
               .slice(0, 5);

             const cleanKeywords = groupedKeywords.length > 0 ? groupedKeywords.map((k: any) => {
               return {
                 kw: k.name,
                 clicks: k.clicks.toLocaleString(),
                 conv: k.conversions.toString()
               };
             }) : [];

             return {
               ...s,
               tableData: gCampaigns.slice(0, 3).map((c: any) => {
                 const leads = Number(c.conversions || c.leads || 0);
                 const spend = parseNumeric(c.cost || c.spend || 0);
                 const cplVal = c.costPerLead || c.cost_per_lead || c.cost_per_conversion || c.cpl || c.cpa;

                 let finalCpl = '₹0';
                 if (cplVal && cplVal !== '0' && cplVal !== '₹0') {
                   finalCpl = cplVal.toString().startsWith('₹') ? cplVal.toString() : `₹${cplVal}`;
                 } else if (leads > 0 && spend > 0) {
                   finalCpl = `₹${(spend / leads).toFixed(0)}`;
                 }

                 return {
                   name: c.campaign || c.name,
                   spend: c.cost || c.spend,
                   leads: leads.toString(),
                   cpl: finalCpl
                 };
               }),
               kpis: [
                 {
                    label: 'Impressions',
                    value: gTotals.impressions?.toLocaleString() || getGoogleKpi('Impressions')?.current || '0',
                    growth: getGoogleKpi('Impressions')?.pctChange?.toString() + '%',
                    isPositive: (getGoogleKpi('Impressions')?.pctChange || 0) >= 0
                 },
                 {
                    label: 'Link Clicks',
                    value: gTotals.clicks?.toLocaleString() || getGoogleKpi('Clicks')?.current || '0',
                    growth: getGoogleKpi('Clicks')?.pctChange?.toString() + '%',
                    isPositive: (getGoogleKpi('Clicks')?.pctChange || 0) >= 0
                 },
                 {
                    label: 'CTR',
                    value: gTotals.ctr ? (typeof gTotals.ctr === 'number' ? `${gTotals.ctr.toFixed(2)}%` : gTotals.ctr) : getGoogleKpi('CTR')?.current || '0.00%',
                    growth: getGoogleKpi('CTR')?.pctChange?.toString() + '%',
                    isPositive: (getGoogleKpi('CTR')?.pctChange || 0) >= 0
                 },
                 {
                    label: 'CPC',
                    value: gTotals.cpc ? `₹${Number(gTotals.cpc).toFixed(2)}` : getGoogleKpi('CPC')?.current || '₹0',
                    growth: getGoogleKpi('CPC')?.pctChange?.toString() + '%',
                    isPositive: (getGoogleKpi('CPC')?.pctChange || 0) <= 0
                 },
                 {
                    label: 'Leads Generated',
                    value: (gTotals.conversions || gTotals.leads)?.toString() || getGoogleKpi('Leads')?.current || '0',
                    growth: getGoogleKpi('Leads')?.pctChange?.toString() + '%',
                    isPositive: (getGoogleKpi('Leads')?.pctChange || 0) >= 0
                 },
                 {
                    label: 'Cost Per Lead',
                    value: (gTotals.cpa || gTotals.cost_per_lead)
                      ? `₹${Number(gTotals.cpa || gTotals.cost_per_lead).toFixed(2)}`
                      : getGoogleKpi('CPL')?.current || '₹0',
                    growth: getGoogleKpi('CPL')?.pctChange?.toString() + '%',
                    isPositive: (getGoogleKpi('CPL')?.pctChange || 0) <= 0
                 }
               ],
               customData: {
                 ...(s as any).customData,
                 keywords: cleanKeywords.length > 0 ? cleanKeywords : (s as any).customData?.keywords
               }
             };

           case 'lead_gen':
             const mLeads = (report as any).metaKpi?.current?.leads || (report as any).performance?.totals?.meta?.leads || 0;
             const gLeads = (report as any).google_ads_details?.leads || (report as any).google_ads_details?.conversions || (report as any).performance?.totals?.google?.conversions || 0;
             const oLeads = (report as any).seo?.totals?.totalUsers?.current || (report.kpis || [])[0]?.value || '0';

             const directSessions = report.sessionsByChannel?.find((c: any) => c.channel?.toLowerCase().includes('direct'))?.sessions || 0;
             const referralSessions = report.sessionsByChannel?.find((c: any) => c.channel?.toLowerCase().includes('referral'))?.sessions || 0;

             // --- DYNAMIC OBSERVATIONS CALCULATION ---
             // 1. Best Lead Source (By Traffic/Sessions)
             const chanData_gen = report.sessionsByChannel || [];
             const bestChan = [...chanData_gen].sort((a, b) => (b.sessions || 0) - (a.sessions || 0))[0];
             const bestLeadSource = bestChan ? bestChan.channel : 'Organic Search';

             // 2. Lowest Cost Lead Source (Campaign Level)
             const gDetails_gen = report.google_ads_details || (report as any).performance?.google_ads_details || {};
             const gCamps = gDetails_gen.top_campaigns || (report as any).performance?.topCampaigns || [];
             const mCamps = (report as any).metaCampaigns || (report as any).performance?.metaTopCampaigns || [];

             const allCamps = [
               ...gCamps.map((c: any) => ({ name: c.campaign || c.name, cost: parseNumeric(c.cost || c.spend), leads: Number(c.conversions || c.leads || 0) })),
               ...mCamps.map((c: any) => ({ name: c.campaign || c.name, cost: parseNumeric(c.cost || c.spend), leads: Number(c.conversions || c.leads || 0) }))
             ];

             const campsWithLeads = allCamps.filter(c => c.leads > 0);
             const lowestCplCamp = [...campsWithLeads].sort((a, b) => (a.cost / a.leads) - (b.cost / b.leads))[0];
             const lowestCostSource = lowestCplCamp ? lowestCplCamp.name : (allCamps.length > 0 ? allCamps[0].name : '-');

             // 3. Highest Conversion Source (By Lead Volume)
             const highestConvCamp = [...allCamps].sort((a, b) => b.leads - a.leads)[0];
             const highestConvSource = highestConvCamp && highestConvCamp.leads > 0 ? highestConvCamp.name : bestLeadSource;

             // 4. Lead Quality Proxies
             const totalLeads = Number(mLeads) + Number(gLeads);
             const formStarts = (report as any).events_by_event_name?.find((e: any) => e.eventName === 'form_start')?.count || 0;
             const hotLeads = Math.max(totalLeads, formStarts);
             const warmLeads = Math.round(Number(oLeads) * 0.1); // 10% of Organic Users as high-intent proxy
             const coldLeads = Math.max(0, Number(oLeads) - warmLeads);

             return {
               ...s,
               tableData: [
                 { source: 'Meta Ads', leads: mLeads.toString() },
                 { source: 'Google Ads', leads: Math.round(Number(gLeads)).toString() },
                 { source: 'Organic Search', leads: String(oLeads) },
                 { source: 'Referral', leads: String(referralSessions) },
                 { source: 'Direct', leads: String(directSessions) }
               ],
               kpis: [
                 { label: 'Hot Leads', value: hotLeads.toLocaleString('en-IN') },
                 { label: 'Warm Leads', value: warmLeads.toLocaleString('en-IN') },
                 { label: 'Cold Leads', value: coldLeads.toLocaleString('en-IN') }
               ],
               customData: {
                 ...s.customData,
                 observations: [
                   { label: 'Best Lead Source', value: bestLeadSource },
                   { label: 'Lowest Cost Lead Source', value: lowestCostSource },
                   { label: 'Highest Conversion Source', value: highestConvSource }
                 ]
               },
               metadata: {
                 ...s.metadata,
                 rightDesc: (report as any).tableExplanations?.key_events_by_platform || `${bestLeadSource} Remained The Strongest Lead Source.`
               }
             };

           case 'activities_completed':
             return {
               ...s,
               metadata: {
                 ...s.metadata,
                 rightDesc: (report.ai_insights as any)?.slides?.activitiesDesc || 'Optimization Activities Focused On Improving Campaign Efficiency And User Experience.'
               }
             };

           case 'challenges_solutions':
             const selfGap = (report as any).aiCompetitorAnalysis?.self_gap_analysis || report.ai_competitor_analysis?.self_gap_analysis || {};

             // SMART RESULTS LOGIC: Pick the top 3 metrics with highest growth
             const allMetricsForSorting: {label: string, value: string, prev: string, growth: string, growthNum: number}[] = [];

             // Extract from tableData1 (Overall KPIs)
             (report.tableData1 || []).forEach(m => {
                const growthStr = m.change.replace('%', '').replace('+', '');
                const growthVal = parseFloat(growthStr);
                if (!isNaN(growthVal) && growthVal > 0) {
                   allMetricsForSorting.push({
                      label: m.metric,
                      value: m.current,
                      prev: m.previous,
                      growth: m.change,
                      growthNum: growthVal
                   });
                }
             });

             // Extract from googleAdsKpis (Performance Marketing)
             const gKpis_cs = (report as any).performance?.googleAdsKpis || [];
             gKpis_cs.forEach((k: any) => {
                if (k.pctChange > 0) {
                   allMetricsForSorting.push({
                      label: `Ad ${k.metric}`,
                      value: k.current,
                      prev: k.previous,
                      growth: (k.pctChange > 0 ? '+' : '') + k.pctChange + '%',
                      growthNum: k.pctChange
                   });
                }
             });

             // Sort by growthNum DESC and pick top 3
             let resultsToShow = allMetricsForSorting
                .sort((a, b) => b.growthNum - a.growthNum)
                .slice(0, 3)
                .map(({label, value, prev, growth}) => ({label, value, prev, growth}));

             // Fallback to defaults if not enough data
             if (resultsToShow.length < 3) {
                const defaults = s.customData.results;
                while (resultsToShow.length < 3) {
                   resultsToShow.push(defaults[resultsToShow.length] || { label: 'Performance Gain', value: 'Dynamic' });
                }
             }

             return {
               ...s,
               customData: {
                 ...s.customData,
                 challenges: selfGap.weaknesses?.slice(0, 3) || s.customData.challenges,
                 solutions: selfGap.actionable_gaps?.slice(0, 3).map((g: any) => typeof g === 'string' ? g : g.title) || s.customData.solutions,
                 results: resultsToShow
               }
             };

           case 'competitor_insights':
             const sMod_comp = report.seo || report;
             const pMod_comp = report.performance || report;

             const seoComp = sMod_comp?.aiCompetitorAnalysis?.competitor_breakdown ||
                           sMod_comp?.aiCompetitorAnalysis?.competitors ||
                           (report as any).aiCompetitorAnalysis?.competitor_breakdown ||
                           [];

             const perfComp = pMod_comp?.aiCompetitorAnalysis?.competitor_breakdown ||
                            pMod_comp?.aiCompetitorAnalysis?.competitors ||
                            (report as any).aiCompetitorAnalysis?.competitors ||
                            [];

             // Extract a summary observation if specific summary is missing
             const getObservation = (compList: any[], fallback: string) => {
               if (compList.length && typeof compList[0] === 'object') {
                 const first = compList[0];
                 return (first.inferred_actions || []).join(' ') || (first.strengths || []).join(' ') || fallback;
               }
               return fallback;
             };

             const getOpportunity = (moduleData: any, fallback: string) => {
               const analysis = moduleData?.aiCompetitorAnalysis;
               return analysis?.self_gap_analysis?.missed_opportunities?.[0] ||
                      analysis?.self_gap_analysis?.actionable_gaps?.[0] ||
                      moduleData?.competitor_intelligence?.biggest_threat ||
                      fallback;
             };

             return {
               ...s,
               customData: {
                 ...s.customData,
                 seoCompetitors: seoComp,
                 performanceCompetitors: perfComp,
                 selectedSeoIdx: s.customData?.selectedSeoIdx !== undefined ? s.customData.selectedSeoIdx : (seoComp.length > 0 ? 0 : undefined),
                 selectedPerfIdx: s.customData?.selectedPerfIdx !== undefined ? s.customData.selectedPerfIdx : (perfComp.length > 0 ? 0 : undefined),
                 seoObservation: sMod_comp?.aiCompetitorAnalysis?.overall_threat_summary || getObservation(seoComp, 'SEO competitors are aggressively targeting high-intent keywords.'),
                 performanceObservation: pMod_comp?.aiCompetitorAnalysis?.overall_threat_summary || getObservation(perfComp, 'Performance competitors are scaling video ad spend.'),
                 seoOpportunity: getOpportunity(sMod_comp, 'Focus on long-tail destination keywords.'),
                 performanceOpportunity: getOpportunity(pMod_comp, 'Implement dynamic remarketing for abandoned carts.')
               }
             };

           case 'recommendations':
             return {
               ...s,
               listItems: (report.adviceList || []).map(a => typeof a === 'string' ? a : a.title).slice(0, 7)
             };

           case 'action_plan':
             const roadmap = report.improvement_roadmap || (report as any).performance?.improvement_roadmap || {};
             const actions = roadmap.actions || [];

             // Map actions to the 4 categories
             const seoActions = actions.filter((a: any) => a.title.toUpperCase().includes('SEO')).map((a: any) => a.title);
             const socialActions = actions.filter((a: any) => a.title.toUpperCase().includes('SOCIAL')).map((a: any) => a.title);
             const paidActions = actions.filter((a: any) => a.title.toUpperCase().includes('AD') || a.title.toUpperCase().includes('META') || a.title.toUpperCase().includes('GOOGLE')).map((a: any) => a.title);
             const webActions = actions.filter((a: any) => a.title.toUpperCase().includes('WEB') || a.title.toUpperCase().includes('PAGE')).map((a: any) => a.title);

             return {
               ...s,
               listSections: [
                 { title: 'SEO Activities', items: seoActions.length > 0 ? seoActions : ['Improve Keyword Rankings', 'Publish Optimized Content'] },
                 { title: 'Social Media Activities', items: socialActions.length > 0 ? socialActions : ['Increase Reel Production', 'Launch Engagement Campaigns'] },
                 { title: 'Paid Advertising Activities', items: paidActions.length > 0 ? paidActions : ['Scale Winning Campaigns', 'Optimize Conversion Rates'] },
                 { title: 'Website Activities', items: webActions.length > 0 ? webActions : ['Improve User Experience', 'Optimize Landing Pages'] }
               ],
               metadata: {
                 ...s.metadata,
                 rightDesc: roadmap.summary || 'Focus Will Be On Scaling High-Performing Channels And Improving Conversion Efficiency.'
               },
               customData: {
                 ...s.customData,
                 conclusion: (report.ai_insights as any)?.conclusion || report.executiveSummary || s.customData.conclusion
               }
             };

           case 'thank_you':
             return {
               ...s,
               title: 'Conclusion',
               metadata: {
                 ...s.metadata,
                 platform: report.siteName?.toUpperCase() || 'BLACKNBOLD.IN'
               },
               images: {
                 ...s.images,
                 logo: userAvatarUrl || ''
               }
             };

           default:
             return s;
         }
       });

       // ENHANCED FETCHING: If competitor data is missing, try to fetch it directly from Supabase
       const populateCompetitors = async () => {
          const targetSiteId = siteId || report.site_id || report.report_id?.split('_')[0];
          if (!targetSiteId) return;

          try {
            // Helper to process fetched analysis
            const processCompData = (analysis: any) => {
               if (!analysis) return null;
               const data = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
               return {
                  breakdown: data.competitor_breakdown || data.competitors || [],
                  summary: data.overall_threat_summary || data.biggest_threat || ""
               };
            };

            // Fetch SEO Competitors
            const { data: seoRow } = await supabase
              .from('processed_reports')
              .select('ai_competitor_analysis')
              .eq('site_id', targetSiteId)
              .eq('module', 'seo')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const seoData = processCompData(seoRow?.ai_competitor_analysis);

            // Fetch Performance Competitors
            const { data: perfRow } = await supabase
              .from('processed_reports')
              .select('ai_competitor_analysis')
              .eq('site_id', targetSiteId)
              .eq('module', 'performance')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const perfData = processCompData(perfRow?.ai_competitor_analysis);

            if (seoData || perfData) {
               setSlides(prev => prev.map(s => {
                 if (s.type === 'competitor_insights') {
                    return {
                      ...s,
                      customData: {
                        ...s.customData,
                        seoCompetitors: seoData?.breakdown?.length ? seoData.breakdown : s.customData.seoCompetitors,
                        performanceCompetitors: perfData?.breakdown?.length ? perfData.breakdown : s.customData.performanceCompetitors,
                        seoObservation: seoData?.summary || s.customData.seoObservation,
                        performanceObservation: perfData?.summary || s.customData.performanceObservation
                      }
                    };
                 }
                 return s;
               }));
            }
          } catch (err) {
            console.error("Error direct fetching competitors:", err);
          }
       };

       setSlides(populated);
       populateCompetitors();
    }
  }, [report, userName, resetTrigger]); // Re-sync when resetTrigger changes


  // Handle Autoplay Loop
  useEffect(() => {
    if (!isPlaying || !isPresenting) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(100);
      return;
    }

    const interval = 100; // tick every 100ms
    const totalTicks = playSpeed / interval;
    let ticksElapsed = 0;

    timerRef.current = setInterval(() => {
      ticksElapsed++;
      const pct = 100 - (ticksElapsed / totalTicks) * 100;
      setTimeLeft(Math.max(0, pct));

      if (ticksElapsed >= totalTicks) {
        ticksElapsed = 0;
        setDirection(1);
        setCurrentIdx((prev) => (prev + 1) % slides.length);
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isPresenting, playSpeed, slides.length, currentIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (isPresenting) {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
          e.preventDefault();
          prevSlide();
        } else if (e.key === 'Escape') {
          setIsPresenting(false);
          setIsPlaying(false);
        }
      } else {
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, slides.length, currentIdx]);

  // Fullscreen Management
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPresenting) {
        setIsPresenting(false);
        setIsPlaying(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    if (isPresenting && !isSharedMode) { // Do not auto-fullscreen in shared mode
      if (presentationRef.current && !document.fullscreenElement) {
        presentationRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else if (!isPresenting) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          // Ignore exit errors
        });
      }
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isPresenting, isSharedMode]);

  const updateCurrentSlide = (updated: Slide) => {
    const newSlides = [...slides];
    newSlides[currentIdx] = updated;
    setSlides(newSlides);
  };

  const nextSlide = () => {
    setDirection(1);
    setCurrentIdx((prev) => (prev + 1) % slides.length);
    setTimeLeft(100);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIdx((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeLeft(100);
  };

  const handleSaveEdits = async () => {
    if (!report?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('processed_reports')
        .update({
          ai_insights: {
            ...report.ai_insights,
            ppt_slides: slides
          }
        })
        .eq('report_id', report.id);

      if (error) throw error;
      toast.success('Presentation saved to database');
    } catch (err: any) {
      alert("Error saving edits: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };


  const addSlide = (type: SlideType) => {
    const defaultTitles: Record<SlideType, string> = {
      digital_cover: 'Digital Marketing Monthly Performance Report',
      exec_summary: 'Executive Performance Summary',
      services_delivered: 'Services Delivered',
      overall_performance: 'Overall Performance Overview',
      seo_performance: 'SEO Performance',
      website_analytics: 'Website Analytics',
      social_performance: 'Social Media Performance',
      content_performance: 'Content Performance',
      meta_ads: 'Meta Ads Performance',
      google_ads: 'Google Ads Performance',
      lead_gen: 'Lead Generation Report',
      activities_completed: 'Activities Completed During The Month',
      challenges_solutions: 'Challenges & Solutions',
      competitor_insights: 'Competitor Insights',
      recommendations: 'Recommendations',
      action_plan: 'Next Month Action Plan',
      thank_you: 'Thank You',
      cover: 'Cover Slide',
      summary: 'Executive Summary',
      scorecard: 'Scorecard Report',
      growth: 'Growth Metrics',
      organic: 'Web Intelligence',
      scatter: 'Opportunity Index',
      funnel: 'Conversion Funnel',
      campaign: 'Campaign Review',
      audience: 'Regional Reach',
      channels: 'Lead Attribution',
      roadmap: 'Execution Roadmap',
      outro: 'Wrap-Up Outlook'
    };

    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      type,
      title: defaultTitles[type] || 'Custom Dash Slide',
      subTag: 'NEW ADDITIONAL METRIC v1.0',
      footer: 'RL TOURS & TRAVELS',
      descriptionText: 'Add custom data details or notes regarding performance statistics and targets on this editable block.',
      kpis: [
        { label: 'SAMPLE TARGET', value: '15,000', growth: '+25% vs target', isPositive: true }
      ],
      chartData: [
        { label: 'Baseline', value: 300, color: '#3b82f6' },
        { label: 'Dynamic Target', value: 850, color: '#10b981' }
      ]
    };

    const updated = [...slides];
    updated.splice(currentIdx + 1, 0, newSlide);
    setSlides(updated);
    setDirection(1);
    setCurrentIdx(currentIdx + 1);
  };

  const deleteSlide = () => {
    if (slides.length <= 1) {
      alert('Your PowerPoint deck must contain at least one slide.');
      return;
    }
    if (window.confirm(`Delete current slide "${slides[currentIdx].title}" from deck?`)) {
      const updated = slides.filter((_, i) => i !== currentIdx);
      setSlides(updated);
      setDirection(-1);
      setCurrentIdx(Math.max(0, currentIdx - 1));
    }
  };

  const exportDeck = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    const pptx = new (await import("pptxgenjs")).default();
    pptx.layout = "LAYOUT_16x9";

    toast.loading('Starting PowerPoint generation...', { id: 'ppt-export' });

    try {
      for (let i = 0; i < slides.length; i++) {
        setExportProgress(i + 1);
        toast.loading(`Capturing slide ${i + 1} of ${slides.length}...`, { id: 'ppt-export' });

        // Wait for React to render the slide in the export viewport
        await new Promise(resolve => setTimeout(resolve, 800));

        const element = document.getElementById(`slide-capture-viewport`);
        if (element) {
          const html2canvas = (await import("html2canvas")).default;
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#070708",
            logging: false,
            onclone: (clonedDoc) => {
              // Modern CSS Fix: html2canvas does not support oklch() colors used by Tailwind v4
              // We traverse and replace oklch with hex/rgb fallbacks in the cloned DOM
              const tags = clonedDoc.getElementsByTagName('*');
              for (let j = 0; j < tags.length; j++) {
                const el = tags[j] as HTMLElement;
                const style = window.getComputedStyle(el);

                // Common color properties to sanitize
                ['color', 'background-color', 'border-color', 'fill', 'stroke'].forEach(prop => {
                  const val = el.style.getPropertyValue(prop) || style.getPropertyValue(prop);
                  if (val && (val.includes('oklch') || val.includes('oklab'))) {
                    // Force a standard RGB/Hex fallback for the capture engine
                    // Most BNB elements are blue, gray, or white
                    let fallback = '#3b82f6'; // Default blue
                    if (prop === 'color') fallback = '#ffffff';
                    if (prop === 'background-color') fallback = '#070708';

                    el.style.setProperty(prop, fallback, 'important');
                  }
                });
              }
            }
          });

          const imgData = canvas.toDataURL("image/png");
          const slide = pptx.addSlide();
          slide.background = { color: "070708" };
          slide.addImage({
            data: imgData,
            x: 0, y: 0, w: "100%", h: "100%"
          });
        }
      }

      await pptx.writeFile({ fileName: `Client_Report_${new Date().toISOString().split('T')[0]}.pptx` });
      toast.success('PowerPoint downloaded successfully!', { id: 'ppt-export' });
    } catch (err) {
      console.error('PPT Export Error:', err);
      toast.error('Failed to generate PowerPoint', { id: 'ppt-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const applyAISmartMutation = (actionType: string) => {
    let copy = JSON.parse(JSON.stringify(slides));
    if (actionType === 'scale') {
      copy = copy.map((s: Slide) => {
        if (s.kpis) {
          s.kpis = s.kpis.map(k => {
            if (k.label.includes('USER') || k.label.includes('LEAD') || k.label.includes('VISIT') || k.label.includes('SPEND')) {
              const num = parseFloat(k.value.replace(/[^0-9.]/g, ''));
              if (!isNaN(num)) {
                return { ...k, value: Math.round(num * 1.2).toLocaleString('en-IN') };
              }
            }
            return k;
          });
        }
        return s;
      });
      setSlides(copy);
      alert('AI Booster: Simulated all traffic, users, and core volume metrics up by +20%!');
    } else if (actionType === 'curry') {
      copy = copy.map((s: Slide) => {
        if (s.kpis) {
          s.kpis = s.kpis.map(k => {
            if (k.value.includes('₹')) {
              return { ...k, value: k.value.replace('₹', '$') };
            }
            return k;
          });
        }
        if (s.growthTable) {
          s.growthTable = s.growthTable.map(row => {
            return {
              ...row,
              prev: row.prev.replace('₹', '$'),
              current: row.current.replace('₹', '$'),
              variance: row.variance.replace('₹', '$')
            };
          });
        }
        return s;
      });
      setSlides(copy);
      alert('AI Currency Assistant: Reconfigured financial reports into International USD ($) format!');
    } else if (actionType === 'summarize') {
      copy = copy.map((s: Slide) => {
        return { ...s, title: s.title.toUpperCase() };
      });
      setSlides(copy);
      alert('AI Typography Assistant: Rendered all presentation titles in bold uppercase styles.');
    }
  };

  const getVariants = (dir: number) => {
    switch (transitionStyle) {
      case 'cube':
        return {
          initial: { opacity: 0, rotateY: dir > 0 ? 90 : -90, scale: 0.9, x: dir > 0 ? 200 : -200 },
          animate: { opacity: 1, rotateY: 0, scale: 1, x: 0 },
          exit: { opacity: 0, rotateY: dir > 0 ? -90 : 90, scale: 0.9, x: dir > 0 ? -200 : 200 }
        };
      case 'flip':
        return {
          initial: { opacity: 0, rotateX: dir > 0 ? 70 : -70, scale: 0.9 },
          animate: { opacity: 1, rotateX: 0, scale: 1 },
          exit: { opacity: 0, rotateX: dir > 0 ? -70 : 70, scale: 0.9 }
        };
      case 'zoom':
        return {
          initial: { opacity: 0, scale: dir > 0 ? 0.75 : 1.25, z: dir > 0 ? -100 : 100 },
          animate: { opacity: 1, scale: 1, z: 0 },
          exit: { opacity: 0, scale: dir > 0 ? 1.25 : 0.75, z: dir > 0 ? 100 : -100 }
        };
      default: // slide
        return {
          initial: { opacity: 0, x: dir > 0 ? 300 : -300 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: dir > 0 ? -300 : 300 }
        };
    }
  };

  const getSlideIcon = (type: SlideType) => {
    switch (type) {
      case 'cover': return <Layers className="w-4 h-4 text-white" />;
      case 'summary': return <Layout className="w-4 h-4 text-white" />;
      case 'scorecard': return <Award className="w-4 h-4 text-white" />;
      case 'organic': return <Globe className="w-4 h-4 text-white" />;
      case 'scatter': return <Grid className="w-4 h-4 text-white" />;
      case 'funnel': return <Layers className="w-4 h-4 text-white" />;
      case 'campaign': return <Tv className="w-4 h-4 text-white" />;
      case 'audience': return <Users className="w-4 h-4 text-white" />;
      case 'roadmap': return <Layout className="w-4 h-4 text-white" />;
      default: return <Eye className="w-4 h-4 text-white" />;
    }
  };

  const filteredSlides = slides.map((s, index) => ({ s, index })).filter(({ s }) => {
    if (!searchQuery) return true;
    const sTerm = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(sTerm) ||
      (s.subTag && s.subTag.toLowerCase().includes(sTerm)) ||
      (s.descriptionText && s.descriptionText.toLowerCase().includes(sTerm))
    );
  });

  if (!report) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 animate-pulse">
          <Activity size={40} className="text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-[#111827]">Awaiting Intelligence Feed</h2>
          <p className="text-[#6B7280] max-w-md">Please sync a division to generate the professional client presentation.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="ppt-viewer-workspace-root"
      className="flex-1 flex flex-col font-sans bg-[#000000]"
    >
      {/* HEADER CONTROLS BAR */}
      <header className="bg-[#000000] border-b border-[#1F1F1F] px-4 py-3 flex flex-wrap justify-between items-center gap-4 z-40 select-none shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-black animate-pulse" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-wide block uppercase font-mono text-white">{report.siteName || 'Client Ecosystem'}</span>
            <span className="text-xs text-gray-500 block -mt-1">Interactive PPT Shower & 3D Editor</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Slide Transition Selector */}
          <div className="flex items-center bg-[#111111] border border-[#1F1F1F] rounded-lg p-0.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-gray-500 px-2 font-mono">3D TRANSITION:</span>
            {['slide', 'cube', 'flip', 'zoom'].map((style) => (
              <button
                key={style}
                onClick={() => setTransitionStyle(style as any)}
                className={`py-1 px-2.5 rounded font-medium capitalize transition-all ${
                  transitionStyle === style
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          {!isSharedMode && (
            <button
              onClick={() => setIsPresenting(!isPresenting)}
              className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 text-xs font-bold py-1.5 px-4 rounded-lg shadow-md transition-all shrink-0 hover:scale-[1.03]"
            >
              {isPresenting ? (
                <>
                  <Edit3 className="w-4 h-4 shrink-0" />
                  <span>Edit Workspace</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 shrink-0" />
                  <span>Present Slides Show</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-1 border-l border-[#1F1F1F] pl-2">
            {!isSharedMode && (
              <>
                <button
                  onClick={handleSaveEdits}
                  title="Save Changes to Database"
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors border border-white/10"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsShareDialogOpen(true)}
                  title="Share Report"
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors border border-white/10"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={exportDeck}
              title="Download PPT"
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors border border-white/10"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* EXPORT PROGRESS OVERLAY */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center backdrop-blur-md"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Generating Professional PPT</h2>
              <p className="text-gray-400 font-mono">Processing Slide {exportProgress} / {slides.length}</p>
              <div className="w-64 h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden mx-auto">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(exportProgress / slides.length) * 100}%` }}
                />
              </div>
            </div>

            {/* ACTUAL CAPTURE VIEWPORT - Visible to user so browser renders it perfectly */}
            <div className="w-[960px] h-[540px] bg-[#070708] rounded-xl shadow-2xl border border-white/10 overflow-hidden relative">
              <div id="slide-capture-viewport" className="w-full h-full flex flex-col">
                <SlideRenderer
                  slide={slides[exportProgress - 1] || slides[0]}
                  isEditMode={false}
                  onUpdateSlide={() => {}}
                  siteImageUrl={report?.imageUrl}
                  userAvatarUrl={userAvatarUrl}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC VIEWPORTS CONTAINER */}
      {!isPresenting ? (
        <div id="ppt-editor-workspace" className="flex-1 flex flex-col lg:flex-row overflow-y-auto custom-scrollbar relative bg-[#000000]">
          {/* CENTRAL WORKSPACE: Slide Preview Canvas */}
          <main className="flex-1 bg-[#000000] p-4 sm:p-6 flex flex-col justify-start items-center relative gap-4 max-w-[1000px] mx-auto w-full min-h-max">
            <div className="flex justify-between w-full max-w-[1000px] text-xs text-gray-500 px-1 select-none">
              <span className="flex items-center gap-1 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-white" /> DOUBLE CLICK OR USE INPUT BOXES TO DIRECTLY EDIT PREVIEW
              </span>
              <span className="font-mono bg-[#111111] px-2.5 py-0.5 rounded border border-[#1F1F1F] self-end text-white">
                Slide {(currentIdx + 1)} / {slides.length}
              </span>
            </div>

            <div className="w-full max-w-6xl aspect-[16/9.2] overflow-y-auto custom-scrollbar pr-12 group/scroll">
              <div className="w-full max-w-5xl mx-auto min-h-full bg-[#070708] text-white rounded-2xl shadow-2xl border border-white/5 relative group/canvas flex flex-col overflow-hidden">
                <SlideRenderer
                  slide={slides[currentIdx]}
                  isEditMode={!isSharedMode}
                  onUpdateSlide={updateCurrentSlide}
                  siteImageUrl={report?.imageUrl}
                  userAvatarUrl={userAvatarUrl}
                  onNavigate={(idx) => {
                    setDirection(idx > currentIdx ? 1 : -1);
                    setCurrentIdx(idx);
                  }}
                  onUpdateAllSlides={(newSlides) => setSlides(newSlides)}
                  slides={slides}
                />
              </div>
            </div>

            <div className="w-full max-w-5xl flex justify-between items-center select-none pt-2">
              <div className="flex gap-2">
                <button
                  onClick={prevSlide}
                  className="bg-[#111111] hover:bg-[#1A1A1A] text-white border border-[#1F1F1F] p-2 rounded-lg transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="bg-[#111111] hover:bg-[#1A1A1A] text-white border border-[#1F1F1F] p-2 rounded-lg transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirection(i > currentIdx ? 1 : -1);
                      setCurrentIdx(i);
                    }}
                    className={`h-2 rounded-full transition-all ${
                      i === currentIdx ? 'w-6 bg-white' : 'w-2 bg-[#1F1F1F] hover:bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              <span className="text-[10px] font-mono font-semibold tracking-wide bg-[#111111] px-2 py-1 rounded text-gray-500 select-none">
                Aspect standard format 16:9 responsive layout
              </span>
            </div>
          </main>
        </div>
      ) : (
        /* THEATRE / PRESENTATION MODE */
        <div
          id="ppt-presentation-theatre"
          ref={presentationRef}
          className="flex-1 bg-[#000000] flex flex-col justify-between p-4 sm:p-8 relative select-none h-full w-full"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-[#1F1F1F] z-50">
            {isPlaying && (
              <div
                className="h-full bg-white transition-all duration-100"
                style={{ width: `${timeLeft}%` }}
              />
            )}
          </div>

          <div className="flex justify-between items-center z-30 select-none bg-[#111111]/80 backdrop-blur-md border border-[#1F1F1F] rounded-full px-6 py-2.5 max-w-5xl w-full mx-auto shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold tracking-widest text-white uppercase">
                {slides[currentIdx].type === 'cover' ? 'CLIENT ECOSYSTEM DECK' : slides[currentIdx].title}
              </span>
              <span className="text-[10px] font-mono text-gray-400 bg-[#000000] px-2 py-0.5 rounded border border-[#1F1F1F]">
                Slide {(currentIdx + 1)} of {slides.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#000000] border border-[#1F1F1F] px-2 py-1 rounded-md text-[10px]">
                <span className="text-gray-500 font-bold uppercase font-mono">INTERVAL:</span>
                {[3, 5, 8].map(s => (
                  <button
                    key={s}
                    onClick={() => setPlaySpeed(s * 1000)}
                    className={`px-1.5 py-0.5 rounded font-bold font-mono transition-colors ${
                      playSpeed === s * 1000 ? 'text-white' : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-full cursor-pointer flex items-center justify-center transition-colors shadow-md ${
                  isPlaying ? 'bg-white text-black' : 'bg-white text-black'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              {isSharedMode ? (
                <button
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      presentationRef.current?.requestFullscreen();
                    }
                  }}
                  className="text-xs font-semibold bg-white text-black hover:bg-gray-200 rounded-full py-1.5 px-4 cursor-pointer transition-all flex items-center gap-2"
                >
                  <Maximize2 size={14} />
                  <span>{document.fullscreenElement ? 'Exit Fullscreen' : 'View Fullscreen'}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsPresenting(false);
                    setIsPlaying(false);
                  }}
                  className="text-xs font-semibold bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white border border-[#2A2A2A] rounded-full py-1.5 px-4 cursor-pointer transition-colors"
                >
                  Exit Presentation Mode
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex justify-center items-center py-4 perspective-container h-full">
            <div className="w-full max-w-6xl h-[calc(min(90vw,64rem)*9.2/16)] overflow-y-auto custom-scrollbar pr-12 group/scroll">
              <div className="w-full max-w-5xl mx-auto min-h-full bg-[#070708] text-white rounded-3xl shadow-2xl relative border border-slate-850/10 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIdx}
                    variants={getVariants(direction)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                    className="w-full min-h-full text-slate-900 font-sans"
                  >
                    <SlideRenderer
                      slide={slides[currentIdx]}
                      isEditMode={false}
                      onUpdateSlide={updateCurrentSlide}
                      siteImageUrl={report?.imageUrl}
                      userAvatarUrl={userAvatarUrl}
                      onNavigate={(idx) => {
                        setDirection(idx > currentIdx ? 1 : -1);
                        setCurrentIdx(idx);
                      }}
                      onUpdateAllSlides={(newSlides) => setSlides(newSlides)}
                      slides={slides}
                    />
                  </motion.div>
                </AnimatePresence>

                <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-gradient-to-r from-black/0 to-transparent hover:from-black/10 transition-colors cursor-pointer group" onClick={prevSlide}>
                  <ChevronLeft className="w-8 h-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-gradient-to-l from-black/0 to-transparent hover:from-black/10 transition-colors cursor-pointer group" onClick={nextSlide}>
                  <ChevronRight className="w-8 h-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] font-mono tracking-wider text-slate-500 select-none pb-2">
            KEYBOARD SHORTCUTS ACTIVE: <strong className="text-slate-400">[Arrow Right / Space / Enter]</strong> FOR NEXT SLIDE • <strong className="text-slate-400">[Arrow Left / Backspace]</strong> FOR PREVIOUS • <strong className="text-slate-400">[ESC]</strong> TO EXIT
          </div>
        </div>
      )}

      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        siteId={siteId || ''}
        reportId={report.report_id}
        dateRange={{ start: report.dateRange.start, end: report.dateRange.end }}
      />
    </div>
  );
}
