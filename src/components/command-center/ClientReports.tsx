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
  Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { MarketingReport, CategoryType, Slide, SlideType } from '../../types';
import { SlideRenderer } from './SlideRenderer';
import { initialSlides } from './reportData';

const COLORS = ['#00d4ff', '#7c3aed', '#22c55e', '#f43f5e', '#eab308', '#ec4899', '#6366f1'];

interface ClientReportsProps {
  report: MarketingReport | null;
  category: CategoryType;
  setCategory: (cat: CategoryType) => void;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  userAvatarUrl?: string;
  userName?: string;
}

export default function ClientReports({ report, category, setCategory, isFullscreen, setIsFullscreen, userAvatarUrl, userName }: ClientReportsProps) {
  const [slides, setSlides] = useState<Slide[]>(() => {
    return initialSlides;
  });

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [isPresenting, setIsPresenting] = useState<boolean>(false);
  const [transitionStyle, setTransitionStyle] = useState<'cube' | 'flip' | 'zoom' | 'slide'>('slide');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Presentation Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(5000); // ms per slide
  const [timeLeft, setTimeLeft] = useState<number>(100); // percentage of visual progress bar

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const presentationRef = useRef<HTMLDivElement>(null);

  // Load and populate slides from report data
  useEffect(() => {
    if (report?.ai_insights?.ppt_slides) {
      setSlides(report.ai_insights.ppt_slides);
    } else if (report) {
       // Populate initial template with real report values to avoid "copy-paste" placeholder feel
       const populated = initialSlides.map(s => {
         const siteName = report.siteName || 'Client';
         const dateRangeStr = report.dateRange ? `${report.dateRange.start} – ${report.dateRange.end}` : 'Current Period';

         switch (s.type) {
           case 'cover':
             return {
               ...s,
               title: `${siteName} Growth Intelligence`,
               footer: siteName.toUpperCase(),
               descriptionText: report.executiveSummary.substring(0, 150) + '...',
               metadata: {
                 ...s.metadata,
                 reportingPeriod: dateRangeStr,
                 preparedBy: userName || 'AdmarTech Intelligence Engine',
                 version: `REF: ${report.id.substring(0, 8).toUpperCase()}`
               }
             };

           case 'summary':
             return {
               ...s,
               title: 'Executive Performance Briefing',
               footer: siteName.toUpperCase(),
               kpis: (report.kpis || []).slice(0, 3).map(k => ({
                 label: k.label.toUpperCase(),
                 value: k.value,
                 growth: `${k.isPositive ? '+' : ''}${k.change}% vs Prev`,
                 isPositive: k.isPositive
               })),
               descriptionText: report.executiveSummary,
               insightsList: (() => {
                 const list: { icon: 'win' | 'risk' | 'opportunity' | 'neutral'; title: string; text: string }[] = [];

                 // 1. Pull from adviceList
                 (report.adviceList || []).slice(0, 3).forEach((a, i) => {
                   list.push({
                     icon: i === 0 ? 'win' : i === 1 ? 'opportunity' : 'risk',
                     title: typeof a === 'string' ? 'Strategic Insight' : a.title,
                     text: typeof a === 'string' ? a : a.description
                   });
                 });

                 // 2. Pull from roadmap weaknesses if needed (Risk)
                 if (list.length < 4 && report.improvement_roadmap?.weaknesses?.length) {
                   list.push({
                     icon: 'risk',
                     title: 'Growth Inhibitor',
                     text: report.improvement_roadmap.weaknesses[0]
                   });
                 }

                 // 3. Pull from roadmap opportunities if needed (Opportunity)
                 if (list.length < 4 && report.improvement_roadmap?.opportunities?.length) {
                   list.push({
                     icon: 'opportunity',
                     title: 'Expansion Driver',
                     text: report.improvement_roadmap.opportunities[0]
                   });
                 }

                 // 4. Pull from competitor intelligence (Risk)
                 if (list.length < 4 && report.competitor_intelligence?.biggest_threat) {
                   list.push({
                     icon: 'risk',
                     title: 'Competitive Threat',
                     text: report.competitor_intelligence.biggest_threat
                   });
                 }

                 // 5. Fill with robust defaults if still empty
                 if (list.length === 0) {
                    list.push({ icon: 'win', title: 'Operational Efficiency', text: 'Campaign performance remains within optimal target ranges.' });
                    list.push({ icon: 'opportunity', title: 'Market Expansion', text: 'Analyze high-performing segments for further budget allocation.' });
                 }

                 return list;
               })()
             };

           case 'growth':
             return {
               ...s,
               title: 'Overall Growth Performance',
               footer: siteName.toUpperCase(),
               growthTable: (report.tableData1 || []).slice(0, 5).map((row, i) => ({
                 id: `gr-${i}`,
                 name: row.metric,
                 prev: row.previous,
                 current: row.current,
                 variance: row.change,
                 status: (row.change || '').startsWith('-') ? 'negative' : (row.change === '0%' || !row.change) ? 'neutral' : 'positive'
               })),
               growthInsight: (report.executiveSummary || '').substring(0, 300) + '...'
             };

           case 'organic':
             if (!report.seo) return { ...s, footer: siteName.toUpperCase() };
             const topKw = report.seo.topKeywords || [];
             return {
               ...s,
               footer: siteName.toUpperCase(),
               kpis: [
                 { label: 'TOTAL USERS', value: (report.kpis || []).find(k => k.label.toUpperCase().includes('TRAFFIC') || k.label.toUpperCase().includes('USERS'))?.value || '0' },
                 { label: 'TOP KEYWORD CLICKS', value: topKw[0]?.clicks?.toLocaleString() || 'N/A' },
                 { label: 'AVG. POSITION', value: topKw[0]?.position || 'N/A' },
                 { label: 'SEARCH CTR', value: topKw[0]?.ctr || 'N/A' }
               ],
               growthTable: [
                 { id: 'org-1', name: 'ORGANIC CLICKS', prev: '', current: topKw.reduce((acc, k) => acc + (k.clicks || 0), 0).toLocaleString(), variance: '', status: 'neutral' },
                 { id: 'org-2', name: 'AVG. POSITION', prev: '', current: report.seo.averagePosition?.toString() || 'N/A', variance: '', status: 'neutral' },
                 { id: 'org-3', name: 'ORGANIC CTR', prev: '', current: topKw[0]?.ctr || 'N/A', variance: '', status: 'neutral' }
               ],
               chartData: (report.seo.sessionsByChannel || []).map(c => ({
                 label: c.channel,
                 value: c.sessions,
                 color: COLORS[Math.floor(Math.random() * COLORS.length)]
               }))
             };

           case 'scatter':
             if (!report.seo) return { ...s, footer: siteName.toUpperCase() };
             return {
               ...s,
               footer: siteName.toUpperCase(),
               scatterPoints: (report.seo.topKeywords || []).slice(0, 5).map((k, i) => ({
                 id: `scat-${i}`,
                 keyword: k.keyword,
                 ctr: parseFloat((k.ctr || '').replace('%', '')) || 0,
                 position: parseFloat(k.position) || 0,
                 volume: (k.clicks || 0) * 10
               }))
             };

           case 'funnel':
             if (!report.performance) return { ...s, footer: siteName.toUpperCase() };
             const perfKpis = report.performance.googleAdsKpis || [];
             const impr = perfKpis.find(k => k.metric.toLowerCase().includes('impression'))?.currentValue || 0;
             const clks = perfKpis.find(k => k.metric.toLowerCase().includes('click'))?.currentValue || 0;
             const lds = perfKpis.find(k => k.metric.toLowerCase().includes('lead'))?.currentValue || 0;

             return {
               ...s,
               footer: siteName.toUpperCase(),
               kpis: perfKpis.slice(0, 4).map(k => ({
                 label: k.metric.toUpperCase(),
                 value: k.current
               })),
               funnelStages: [
                 { id: 'fn-1', name: 'Impressions', value: impr, conversionText: '' },
                 { id: 'fn-2', name: 'Clicks', value: clks, percentage: `${((clks / (impr || 1)) * 100).toFixed(2)}%`, conversionText: `${((clks / (impr || 1)) * 100).toFixed(2)}% CTR` },
                 { id: 'fn-3', name: 'Leads', value: lds, percentage: `${((lds / (clks || 1)) * 100).toFixed(2)}%`, conversionText: `${((lds / (clks || 1)) * 100).toFixed(2)}% Conv.` }
               ]
             };

           case 'campaign':
             if (!report.performance?.topCampaigns) return { ...s, footer: siteName.toUpperCase() };
             return {
               ...s,
               footer: siteName.toUpperCase(),
               campaigns: report.performance.topCampaigns.slice(0, 2).map((c, i) => ({
                 id: `cp-${i}`,
                 name: c.campaign,
                 status: i === 0 ? 'Top Performer' : 'Core Campaign',
                 spend: c.cost,
                 leads: c.leads,
                 cpl: c.cpa,
                 chartData: [
                   { label: 'Spend', current: c.costValue, relative: 70 },
                   { label: 'Leads', current: c.leads, relative: 100 }
                 ]
               }))
             };

           case 'audience':
             const countries = report.seo?.activeUsersByCountry || report.performance?.websiteTrafficByCountry || [];
             return {
               ...s,
               footer: siteName.toUpperCase(),
               subTag: `PRIMARY MARKET: ${countries[0]?.country || 'GLOBAL'}`,
               cities: countries.slice(0, 5).map((c, i) => ({
                 id: `country-${i}`,
                 city: c.country,
                 users: c.users
               }))
             };

           case 'channels':
             const channelData = report.seo?.sessionsByChannel || report.performance?.sessionsByChannel || [];
             const totalSessions = channelData.reduce((acc, c) => acc + c.sessions, 0);
             return {
               ...s,
               footer: siteName.toUpperCase(),
               chartData: channelData.slice(0, 4).map(c => ({
                 label: c.channel,
                 value: c.sessions,
                 color: COLORS[Math.floor(Math.random() * COLORS.length)]
               })),
               growthTable: channelData.slice(0, 3).map((c, i) => ({
                 id: `chn-${i}`,
                 name: c.channel,
                 prev: c.sessions.toLocaleString(),
                 current: `${((c.sessions / (totalSessions || 1)) * 100).toFixed(1)}%`,
                 variance: 'Share',
                 status: 'neutral'
               }))
             };

           case 'roadmap':
             const advice = report.summarizedAdviceList || [];
             return {
               ...s,
               footer: siteName.toUpperCase(),
               roadmapMonths: (s.roadmapMonths || []).map((m, mi) => ({
                 ...m,
                 items: (m.items || []).map((item, ii) => {
                   const advIndex = mi * 2 + ii;
                   return {
                     ...item,
                     desc: advice[advIndex] || item.desc
                   };
                 })
               }))
             };

           case 'scorecard':
             const radarSelf = report.radar_self || {};

             // 1. Google Ads Efficiency (CPL based)
             // Formula: 100 - (cpl / 50)
             let gAdsScore = 0;
             if (report.performance?.googleAdsKpis) {
               const cplKpi = report.performance.googleAdsKpis.find(k => k.metric.toLowerCase().includes('cost per lead') || k.metric.toLowerCase().includes('cpl'));
               if (cplKpi && cplKpi.currentValue > 0) {
                 gAdsScore = Math.max(0, Math.min(100, Math.round(100 - (cplKpi.currentValue / 50))));
               }
             }

             // 2. Website Conversion (Form Submits)
             // Formula: min(100, (form_submit count / 50) * 100)
             let convScore = 0;
             let formSubmits = 0;
             if (report.seo?.eventCountByEventName) {
               const convEvents = report.seo.eventCountByEventName.filter(e =>
                 e.event.toLowerCase().includes('submit') ||
                 e.event.toLowerCase().includes('lead') ||
                 e.event.toLowerCase().includes('conversion')
               );
               formSubmits = convEvents.reduce((acc, e) => acc + e.count, 0);
               if (formSubmits > 0) {
                 convScore = Math.min(100, Math.round((formSubmits / 50) * 100));
               }
             }

             // 3. Meta Ads Leads
             // Formula: min(100, (meta_leads / 50) * 100)
             let metaAdsScore = 0;
             let metaLeads = 0;
             if (report.performance?.metaAdsKpis) {
               const metaLeadsKpi = report.performance.metaAdsKpis.find(k => k.metric.includes('Leads'));
               if (metaLeadsKpi && metaLeadsKpi.currentValue > 0) {
                 metaLeads = metaLeadsKpi.currentValue;
                 metaAdsScore = Math.min(100, Math.round((metaLeads / 50) * 100));
               }
             }

             // 4. Lead Gen Volume (Total = Google Leads + Meta Leads + Form Submits)
             // Formula: min(100, (total_leads / 100) * 100)
             let gAdsLeads = 0;
             if (report.performance?.googleAdsKpis) {
                // googleAdsKpis leads metric in PerformanceReportData actually holds combined G+M leads
                const adsLeadsKpi = report.performance.googleAdsKpis.find(k => k.metric.toLowerCase() === 'leads');
                if (adsLeadsKpi) gAdsLeads = adsLeadsKpi.currentValue;
             }
             const totalLeads = gAdsLeads + formSubmits;
             let leadGenScore = Math.min(100, Math.round((totalLeads / 100) * 100));

             // 5. SEO Performance (Average position of top 5 keywords)
             // Formula: max(0, min(100, 100 - (avg_pos - 1) * 5))
             let seoScore = 0;
             if (report.seo?.topKeywords && report.seo.topKeywords.length > 0) {
               const validPositions = report.seo.topKeywords
                 .slice(0, 5) // Use only top 5 as requested
                 .map(k => parseFloat(k.position))
                 .filter(p => !isNaN(p) && p > 0);

               if (validPositions.length > 0) {
                 const avgPos = validPositions.reduce((a, b) => a + b, 0) / validPositions.length;
                 seoScore = Math.max(0, Math.min(100, Math.round(100 - (avgPos - 1) * 5)));
               }
             } else if (report.seo?.averagePosition !== undefined && report.seo.averagePosition > 0) {
               seoScore = Math.max(0, Math.min(100, Math.round(100 - (report.seo.averagePosition - 1) * 5)));
             }

             // Prioritize radar_self if values exist there
             gAdsScore = radarSelf['Google Ads'] || gAdsScore;
             leadGenScore = radarSelf['Lead Gen'] || leadGenScore;
             metaAdsScore = radarSelf['Meta Ads'] || metaAdsScore;
             seoScore = radarSelf['SEO'] || seoScore;
             convScore = radarSelf['Conversion'] || convScore;

             const scorecardGauges = [
               { id: 'sc-1', name: 'GOOGLE ADS', score: gAdsScore, color: '#10b981' },
               { id: 'sc-2', name: 'LEAD GENERATION', score: leadGenScore, color: '#10b981' },
               { id: 'sc-3', name: 'META ADS', score: metaAdsScore, color: '#3b82f6' },
               { id: 'sc-4', name: 'SEO PERFORMANCE', score: seoScore, color: '#f59e0b' },
               { id: 'sc-5', name: 'WEBSITE CONVERSION', score: convScore, color: '#f59e0b' }
             ];

             const avgScore = Math.round(scorecardGauges.reduce((acc, g) => acc + g.score, 0) / 5);

             return {
               ...s,
               footer: siteName.toUpperCase(),
               scoreTag: `OVERALL HEALTH: ${avgScore}/100`,
               scorecardGauges,
               scorecardInsight: report.ai_summary || s.scorecardInsight
             };

           case 'outro':
             return {
               ...s,
               footer: siteName.toUpperCase(),
               title: `${siteName} Strategic Wrap-up`,
               kpis: (report.kpis || []).slice(0, 4).map(k => ({ label: k.label.toUpperCase(), value: k.value })),
               descriptionText: report.ai_summary || s.descriptionText
             };

           default:
             return { ...s, footer: siteName.toUpperCase() };
         }
       });
       setSlides(populated);
    }
  }, [report?.id]);

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

    if (isPresenting) {
      if (presentationRef.current && !document.fullscreenElement) {
        presentationRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          // Ignore exit errors
        });
      }
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isPresenting]);

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

  const handleReset = () => {
    if (window.confirm('Are you sure you want to revert all slide contents back to original template parameters?')) {
      setSlides(initialSlides);
      setCurrentIdx(0);
    }
  };

  const addSlide = (type: SlideType) => {
    const defaultTitles: Record<SlideType, string> = {
      cover: 'New Cover Slide',
      summary: 'New Executive Summary',
      scorecard: 'New Scorecard Report',
      growth: 'New Growth Metrics',
      organic: 'New Web Intelligence',
      scatter: 'New Opportunity Index',
      funnel: 'New Conversion Funnel',
      campaign: 'New Campaign Review',
      audience: 'New Regional Reach',
      channels: 'New Lead Attribution',
      roadmap: 'New Execution Roadmap',
      outro: 'New Wrap-Up Outlook'
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

  const exportDeck = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(slides, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `PptInteractiveDeck_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  const importDeck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(parsed);
          setCurrentIdx(0);
          alert('Successfully imported PPT interactive deck data!');
        } else {
          alert('Invalid file structure. Make sure you load a valid backup presentation JSON.');
        }
      } catch (err) {
        alert('Failed to parse uploaded file. Ensure it is a valid JSON presentation.');
      }
    };
    reader.readAsText(file);
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
      case 'cover': return <Layers className="w-4 h-4 text-slate-500" />;
      case 'summary': return <Layout className="w-4 h-4 text-emerald-500" />;
      case 'scorecard': return <Award className="w-4 h-4 text-blue-500" />;
      case 'organic': return <Globe className="w-4 h-4 text-purple-500" />;
      case 'scatter': return <Grid className="w-4 h-4 text-orange-500" />;
      case 'funnel': return <Layers className="w-4 h-4 text-pink-500" />;
      case 'campaign': return <Tv className="w-4 h-4 text-cyan-500" />;
      case 'audience': return <Users className="w-4 h-4 text-violet-500" />;
      case 'roadmap': return <Layout className="w-4 h-4 text-yellow-500" />;
      default: return <Eye className="w-4 h-4 text-slate-400" />;
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
          <Activity size={40} className="text-[#2563EB]" />
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
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans"
    >
      {/* HEADER CONTROLS BAR */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex flex-wrap justify-between items-center gap-4 z-40 select-none shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-wide block uppercase font-mono text-blue-400">{report.siteName || 'Client Ecosystem'}</span>
            <span className="text-xs text-slate-400 block -mt-1">Interactive PPT Shower & 3D Editor</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Slide Transition Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 font-mono">3D TRANSITION:</span>
            {['slide', 'cube', 'flip', 'zoom'].map((style) => (
              <button
                key={style}
                onClick={() => setTransitionStyle(style as any)}
                className={`py-1 px-2.5 rounded font-medium capitalize transition-all ${
                  transitionStyle === style
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPresenting(!isPresenting)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-1.5 px-4 rounded-lg shadow-md transition-all shrink-0 hover:scale-[1.03]"
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

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={handleSaveEdits}
              title="Save Changes to Database"
              className="p-1.5 bg-green-900/40 hover:bg-green-600 text-green-300 rounded hover:text-white transition-colors border border-green-800"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={exportDeck}
              title="Download backup (JSON)"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload backup"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded hover:text-white transition-colors"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={importDeck}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={handleReset}
              title="Reset PPT parameters"
              className="p-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/40 text-rose-300 rounded hover:text-white transition-all ml-1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* DYNAMIC VIEWPORTS CONTAINER */}
      {!isPresenting ? (
        <div id="ppt-editor-workspace" className="flex-1 flex flex-col lg:flex-row overflow-y-auto custom-scrollbar relative">
          {/* CENTRAL WORKSPACE: Slide Preview Canvas */}
          <main className="flex-1 bg-slate-950 p-4 sm:p-6 flex flex-col justify-start items-center relative gap-4 max-w-[1000px] mx-auto w-full min-h-max">
            <div className="flex justify-between w-full max-w-[1000px] text-xs text-slate-400 px-1 select-none">
              <span className="flex items-center gap-1 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" /> DOUBLE CLICK OR USE INPUT BOXES TO DIRECTLY EDIT PREVIEW
              </span>
              <span className="font-mono bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800 self-end">
                Slide {(currentIdx + 1)} / {slides.length}
              </span>
            </div>

            <div className="w-full max-w-[1000px] aspect-video bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-800/20 overflow-hidden relative group/canvas flex flex-col">
              <SlideRenderer
                slide={slides[currentIdx]}
                isEditMode={true}
                onUpdateSlide={updateCurrentSlide}
                siteImageUrl={report?.imageUrl}
                userAvatarUrl={userAvatarUrl}
              />
            </div>

            <div className="w-full max-w-[1000px] flex justify-between items-center select-none pt-2">
              <div className="flex gap-2">
                <button
                  onClick={prevSlide}
                  className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-700 p-2 rounded-lg transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-700 p-2 rounded-lg transition-all"
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
                      i === currentIdx ? 'w-6 bg-blue-500' : 'w-2 bg-slate-800 hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              <span className="text-[10px] font-mono font-semibold tracking-wide bg-slate-900 px-2 py-1 rounded text-slate-400 select-none">
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
          className="flex-1 bg-slate-950 flex flex-col justify-between p-4 sm:p-8 relative select-none h-full w-full"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-slate-800 z-50">
            {isPlaying && (
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-100"
                style={{ width: `${timeLeft}%` }}
              />
            )}
          </div>

          <div className="flex justify-between items-center z-30 select-none bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-full px-6 py-2.5 max-w-[1000px] w-full mx-auto shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
                {slides[currentIdx].type === 'cover' ? 'CLIENT ECOSYSTEM DECK' : slides[currentIdx].title}
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Slide {(currentIdx + 1)} of {slides.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2 py-1 rounded-md text-[10px]">
                <span className="text-slate-500 font-bold uppercase font-mono">INTERVAL:</span>
                {[3, 5, 8].map(s => (
                  <button
                    key={s}
                    onClick={() => setPlaySpeed(s * 1000)}
                    className={`px-1.5 py-0.5 rounded font-bold font-mono transition-colors ${
                      playSpeed === s * 1000 ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-full cursor-pointer flex items-center justify-center transition-colors shadow-md ${
                  isPlaying ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  setIsPresenting(false);
                  setIsPlaying(false);
                }}
                className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-full py-1.5 px-4 cursor-pointer transition-colors"
              >
                Exit Presentation Mode
              </button>
            </div>
          </div>

          <div className="flex-1 flex justify-center items-center py-4 perspective-container h-full w-full">
            <div className="w-full max-w-[1000px] aspect-video bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden relative border border-slate-850/10 h-auto max-h-[90vh]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  variants={getVariants(direction)}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  className="w-full h-full text-slate-900 font-sans"
                >
                  <SlideRenderer
                    slide={slides[currentIdx]}
                    isEditMode={false}
                    onUpdateSlide={updateCurrentSlide}
                    siteImageUrl={report?.imageUrl}
                    userAvatarUrl={userAvatarUrl}
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

          <div className="text-center text-[11px] font-mono tracking-wider text-slate-500 select-none pb-2">
            KEYBOARD SHORTCUTS ACTIVE: <strong className="text-slate-400">[Arrow Right / Space / Enter]</strong> FOR NEXT SLIDE • <strong className="text-slate-400">[Arrow Left / Backspace]</strong> FOR PREVIOUS • <strong className="text-slate-400">[ESC]</strong> TO EXIT
          </div>
        </div>
      )}
    </div>
  );
}
