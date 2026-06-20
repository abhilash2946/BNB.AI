import { Slide } from '../../types';

export const initialSlides: Slide[] = [
  {
    id: 'slide-1',
    type: 'cover',
    title: 'Growth Intelligence Report',
    subTag: 'EXECUTIVE INTELLIGENCE ENGINE v2.0',
    metadata: {
      reportingPeriod: 'June 2024 – June 2025',
      preparedBy: 'AdmarTech Intelligence Engine',
      classification: 'Executive Confidential',
      version: 'INTELLIGENCE REPORT // 2025'
    },
    footer: 'RL TOURS & TRAVELS',
    descriptionText: 'AI-Powered Marketing Intelligence & Performance Analysis for RL Tours & Travels.'
  },
  {
    id: 'slide-2',
    type: 'summary',
    title: 'Executive Performance Summary',
    scoreTag: 'PERFORMANCE SCORE: 82/100',
    kpis: [
      { label: 'TOTAL USERS', value: '25,875', growth: '+514% vs LY', isPositive: true },
      { label: 'TOTAL LEADS', value: '814', growth: '+40,600% vs LY', isPositive: true },
      { label: 'AVG. CPL', value: '₹19.81', growth: '-99.3% vs LY', isPositive: true }
    ],
    descriptionText: 'RL Tours & Travels has transitioned from a foundational phase to a high-growth stage, achieving a significant increase in lead volume while maintaining a highly efficient CPL.',
    insightsList: [
      { icon: 'win', title: 'Top Win', text: 'Massive scalability in Lead Generation (+40,600% Growth) and highly efficient acquisition cost.' },
      { icon: 'risk', title: 'Top Risk', text: 'High dependency on specific campaigns; Page 2 keyword "stagnation" for high-intent terms.' },
      { icon: 'opportunity', title: 'Top Opportunity', text: 'Improving CTR for top-performing keywords and scaling the "Thailand Website Lead" campaign.' }
    ],
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-3',
    type: 'scorecard',
    title: 'Business Health Scorecard',
    scoreTag: 'OVERALL HEALTH: 82/100',
    scorecardGauges: [
      { id: 'sc-1', name: 'GOOGLE ADS', score: 92, color: '#10b981' },
      { id: 'sc-2', name: 'LEAD GENERATION', score: 89, color: '#10b981' },
      { id: 'sc-3', name: 'META ADS', score: 81, color: '#3b82f6' },
      { id: 'sc-4', name: 'SEO PERFORMANCE', score: 74, color: '#f59e0b' },
      { id: 'sc-5', name: 'WEBSITE CONVERSION', score: 68, color: '#f59e0b' }
    ],
    scorecardInsight: 'The business is currently "Ads-Heavy." While SEO is growing, the immediate focus should be on Website Conversion Optimization (68/100) to maximize the ROI of high-performing paid traffic.',
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-4',
    type: 'growth',
    title: 'Overall Growth Performance Dashboard',
    subTag: 'COMPARISON: JUN 2024 vs JUN 2025',
    growthTable: [
      { id: 'gr-1', name: 'Total Users', prev: '4,214', current: '25,875', variance: '+514%', status: 'positive' },
      { id: 'gr-2', name: 'Total Sessions', prev: '5,639', current: '31,947', variance: '+466%', status: 'positive' },
      { id: 'gr-3', name: 'Lead Generation', prev: '2', current: '814', variance: '+40,600%', status: 'positive' },
      { id: 'gr-4', name: 'Marketing Spend', prev: '₹5,932', current: '₹16,122', variance: '+171.8%', status: 'neutral' },
      { id: 'gr-5', name: 'Cost Per Lead (CPL)', prev: '₹2,966', current: '₹19.81', variance: '-99.3%', status: 'positive' }
    ],
    growthInsight: 'The strategic shift toward AI-powered targeting has resulted in a drastic reduction in CPL, making the marketing engine highly profitable. The +40,600% growth in leads demonstrates a successful transition from brand awareness to high-intent conversion.',
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-5',
    type: 'organic',
    title: 'Organic Search Intelligence',
    subTag: 'GA4 & SEARCH CONSOLE ANALYSIS',
    kpis: [
      { label: 'TOTAL USERS', value: '25,875', subValue: '99.8% New Users' },
      { label: 'AVG. ENGAGEMENT', value: '157.7s', subValue: 'High Intent Signal' },
      { label: 'BOUNCE RATE', value: '4.53%', subValue: 'Optimal Relevance' },
      { label: 'EVENT COUNT', value: '218,664', subValue: 'Active Interactions' }
    ],
    growthTable: [
      { id: 'org-1', name: 'ORGANIC CLICKS', prev: '', current: '11,405', variance: '', status: 'neutral' },
      { id: 'org-2', name: 'AVG. POSITION', prev: '', current: '18.7', variance: '', status: 'neutral' },
      { id: 'org-3', name: 'ORGANIC CTR', prev: '', current: '0.89%', variance: '', status: 'neutral' }
    ],
    chartData: [
      { label: 'Direct', value: 1200, color: '#e5e7eb' },
      { label: 'Organic Search', value: 11405, color: '#2563eb' },
      { label: 'Paid Search', value: 800, color: '#10b981' },
      { label: 'Social', value: 150, color: '#9ca3af' },
      { label: 'Referral', value: 90, color: '#d1d5db' }
    ],
    descriptionText: 'High engagement and an exceptionally low bounce rate (4.53%) indicate that content is perfectly aligned with user intent. The low CTR is a direct result of many high-volume keywords sitting on Page 2. Moving these to Page 1 is the primary growth lever.',
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-6',
    type: 'scatter',
    title: 'Keyword Opportunity Analysis',
    scoreTag: 'OPPORTUNITY SCORE: 91/100',
    scatterPoints: [
      { id: 'scat-1', keyword: 'RL Tours and Travels', ctr: 32.1, position: 1.86, volume: 800 },
      { id: 'scat-2', keyword: 'Thailand Package', ctr: 16.48, position: 12.4, volume: 1500 },
      { id: 'scat-3', keyword: 'Dubai Tour Package', ctr: 0.12, position: 5.3, volume: 600 },
      { id: 'scat-4', keyword: 'Tours and Travels', ctr: 2.7, position: 16.5, volume: 1100 }
    ],
    descriptionText: "Focus on 'Quick Wins'—keywords currently in positions 11-20. Moving these to the first page through content optimization and internal linking will result in a projected 3x-5x traffic increase for high-intent travel terms.",
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-7',
    type: 'funnel',
    title: 'Paid Media Intelligence',
    scoreTag: 'GOOGLE ADS EFFICIENCY: 92%',
    kpis: [
      { label: 'TOTAL SPEND', value: '₹12,732' },
      { label: 'TOTAL LEADS', value: '700' },
      { label: 'AVG. CTR', value: '3.77%' },
      { label: 'AVG. CPL', value: '₹18.19' }
    ],
    funnelStages: [
      { id: 'fn-1', name: 'Impressions', value: 37291, conversionText: '' },
      { id: 'fn-2', name: 'Clicks', value: 1406, percentage: '3.77%', conversionText: '3.77% CTR' },
      { id: 'fn-3', name: 'Leads', value: 700, percentage: '49.78%', conversionText: '49.78% Conv. Rate' }
    ],
    insightsList: [
      { icon: 'neutral', title: 'Efficiency Driver', text: 'Paid search is the primary engine for immediate revenue. The conversion rate from click to lead is exceptionally high (~50%), indicating strong landing page relevance.' },
      { icon: 'win', title: 'Strategic Outlook', text: 'The current CPL of ₹18.19 is significantly below industry benchmarks for travel, allowing for aggressive scaling of high-intent keywords.' }
    ],
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-8',
    type: 'campaign',
    title: 'Campaign Performance Analysis',
    subTag: 'ROI OPTIMIZATION ENGINE ACTIVE',
    campaigns: [
      {
        id: 'cp-1',
        name: 'Thailand Website Lead',
        status: 'Top Performer',
        spend: '₹5,602',
        leads: 700,
        cpl: '₹8.00',
        chartData: [
          { label: 'Spend', current: 5602, relative: 70 },
          { label: 'Leads', current: 700, relative: 100 }
        ]
      },
      {
        id: 'cp-2',
        name: 'Thailand Package',
        status: 'Needs Audit',
        spend: '₹4,694',
        leads: 0,
        cpl: 'N/A',
        chartData: [
          { label: 'Spend', current: 4694, relative: 58 },
          { label: 'Leads', current: 0, relative: 0 }
        ]
      }
    ],
    insightsList: [
      { icon: 'opportunity', title: 'SCALE WINNER', text: 'Shift 40% of underperforming budget to Thailand Website Lead to accelerate volume.' },
      { icon: 'risk', title: 'REBUILD FUNNEL', text: 'Audit Thailand Package landing page for conversion friction and CTA clarity.' }
    ],
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-9',
    type: 'audience',
    title: 'Audience & Geo Intelligence',
    subTag: 'DOMESTIC MARKET SHARE: 96.69%',
    kpis: [
      { label: 'Total Users (India)', value: '25,015' },
      { label: 'New User Ratio', value: '99.8%' }
    ],
    cities: [
      { id: 'ct-1', city: 'Hyderabad', users: 9669 },
      { id: 'ct-2', city: 'Bengaluru', users: 1850 },
      { id: 'ct-3', city: 'Mumbai', users: 1420 },
      { id: 'ct-4', city: 'Chennai', users: 920 },
      { id: 'ct-5', city: 'Delhi', users: 810 }
    ],
    descriptionText: 'High concentration in Hyderabad (9,669 Users) suggests a "Hyper-local" brand authority. Expansion into Bengaluru and Mumbai represents the next growth tier, with significant untapped potential in Tier 1 metropolitan areas.',
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-10',
    type: 'channels',
    title: 'Channel & Lead Intelligence',
    subTag: 'TOTAL LEADS: 814',
    chartData: [
      { label: 'Google Ads', value: 700, color: '#3b82f6' },
      { label: 'Meta Ads', value: 114, color: '#10b981' }
    ],
    growthTable: [
      { id: 'chn-1', name: 'Google Ads', prev: '700', current: '86%', variance: '₹18.19 CPL', status: 'positive' },
      { id: 'chn-2', name: 'Meta Ads', prev: '114', current: '14%', variance: '₹29.75 CPL', status: 'positive' },
      { id: 'chn-3', name: 'Combined Performance', prev: '814', current: '100%', variance: '₹19.81 CPL', status: 'positive' }
    ],
    descriptionText: 'Google Ads serves as the primary "Closer" for high-intent travel queries, contributing 86% of volume. Meta Ads acts as the "Opener," driving brand awareness and retargeting efficiency. The combined CPL of ₹19.81 is exceptionally lean for the travel sector.',
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-11',
    type: 'roadmap',
    title: '90-Day Strategic Growth Roadmap',
    subTag: 'STRATEGIC EXECUTION PLAN v1.0',
    roadmapMonths: [
      {
        title: 'MONTH 01: OPTIMIZATION',
        subtitle: 'Optimization Stage',
        color: '#2563eb', // Blue
        items: [
          { id: 'rm-1', category: 'SEO & TECHNICAL', title: 'CTR & Ranking Boost', desc: 'Optimize meta-titles and internal linking for Page 2 keywords to drive organic volume.' },
          { id: 'rm-2', category: 'CONVERSION', title: 'Funnel Audit', desc: 'A/B test landing page CTAs and form fields to improve conversion rates.' }
        ]
      },
      {
        title: 'MONTH 02: SCALING',
        subtitle: 'Scaling Stage',
        color: '#10b981', // Green
        items: [
          { id: 'rm-3', category: 'PAID MEDIA', title: 'Budget Reallocation', desc: 'Shift budget to high-performing Thailand campaigns and scale winning keywords.' },
          { id: 'rm-4', category: 'AUDIENCE', title: 'Tier 1 Expansion', desc: 'Expand geographic targeting to Bengaluru and Mumbai markets.' }
        ]
      },
      {
        title: 'MONTH 03: EXPANSION',
        subtitle: 'Expansion Stage',
        color: '#eab308', // Yellow
        items: [
          { id: 'rm-5', category: 'CONTENT', title: 'Cluster Expansion', desc: 'Launch new content clusters for international packages (Dubai, Europe).' },
          { id: 'rm-6', category: 'ANALYTICS', title: 'Advanced Tracking', desc: 'Implement full-funnel attribution and lifetime value (LTV) tracking.' }
        ]
      }
    ],
    insightsList: [
      { icon: 'opportunity', title: 'Campaign Scaling', text: 'HIGH IMPACT / LOW EFFORT' },
      { icon: 'neutral', title: 'SEO Optimization', text: 'HIGH IMPACT / MED EFFORT' },
      { icon: 'neutral', title: 'Content Clusters', text: 'MED IMPACT / HIGH EFFORT' }
    ],
    footer: 'RL TOURS & TRAVELS'
  },
  {
    id: 'slide-12',
    type: 'outro',
    title: 'Growth Intelligence Summary',
    kpis: [
      { label: 'TOTAL USERS', value: '25,875' },
      { label: 'ORGANIC CLICKS', value: '11,405' },
      { label: 'QUALIFIED LEADS', value: '814' },
      { label: 'AVERAGE CPL', value: '₹19.81' }
    ],
    descriptionText: 'RL Tours & Travels has established a dominant growth foundation through organic visibility and efficient paid acquisition. The next phase focuses on moving from "Visibility" to "Market Leadership" by optimizing conversion paths, scaling high-ROI channels, and expanding into Tier 1 city markets.',
    footer: 'RL TOURS & TRAVELS'
  }
];
