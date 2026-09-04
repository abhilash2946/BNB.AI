export interface UserProfile {
  id: string;
  name: string;
  agencyName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  tier: "Standard" | "Enterprise Pro";
}

export interface UserCredentials {
  googleOAuth?: any;
  googleAdsDeveloperToken?: string;
  metaLongLivedToken?: string;
  metaTokenExpiry?: string;  // ISO string
  metaAppCreds?: any;
}

export interface SiteProfile {
  id: string;
  name: string;
  url: string;
  industry: string;
  city?: string;
  imageUrl?: string;
  seoSettings?: {
    ga4Id?: string;
    gscUrl?: string;
    googleAdsId?: string;
    metaAdsId?: string;
    fbPageId?: string;
    igBusId?: string;
  };
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MarketingMetric {
  metric: string;
  current: string;
  previous: string;
  change: string;
}

export interface AcquisitionChannel {
  item: string;
  value: string;
  share: string;
  trend: string;
  prev?: string;
}

export interface ChartPoint {
  label: string;
  valueA: number;
  valueB: number;
  valueC: number;
  returning?: number;
}

export interface StrategicAdvice {
  title: string;
  description: string;
  impact: string;
  effort: string;
  priority?: 'High' | 'Medium' | 'Low';
  target?: string;
}

export interface SectionAdvice {
  kpi_advice?: string[];
  campaign_advice?: string[];
  keyword_advice?: string[];
  device_advice?: string[];
  search_term_advice?: string[];
  demographic_advice?: string[];
  day_hour_advice?: string[];
  network_advice?: string[];
  asset_advice?: string[];
  meta_campaign_advice?: string[];
  meta_adset_advice?: string[];
  meta_device_advice?: string[];
  meta_kpi_advice?: string[];
  meta_campaign_advice_summarized?: string[];
  // SEO specific
  country_advice?: string[];
  activity_advice?: string[];
  page_title_advice?: string[];
  channel_advice?: string[];
  event_advice?: string[];
  platform_advice?: string[];
  timeline_advice?: string[];
}

export interface RawReport {
  report_id?: string;
  kpi_summary?: any;
  ai_table_explanations?: Record<string, string>;
  charts?: Record<string, any[]>;
  ai_competitor_analysis?: any;
  section_advice?: SectionAdvice;
  ai_recommendations?: any[];
  ai_summary?: string | object;
  top_keywords?: any[];
  users_by_country?: any[];
  top_landing_pages?: any[];
  top_page_titles?: any[];
  sessions_by_channel?: any[];
  events_by_event_name?: any[];
  key_events_by_platform?: any[];
  chart_datasets?: any[];
  ga4_details?: any;
  google_ads_details?: any;
  meta_ads_kpi?: any;
  meta_ads_details?: any;
  meta_ads_charts?: any;
  ai_top_keywords_overview?: string;
  ai_recommendations_summarized?: string[];
  ai_comparison?: string;
  radar_data?: any;
  ai_insights?: any;
  ai_slide_descriptions?: Record<string, string>;
  seo_work_details?: {
    new_posts: string[];
    meta_tweaks: Array<{ title: string; type: string }>;
    internal_links_count: number;
  };
  gbp_details?: {
    aggregated: {
      calls: number;
      directions: number;
      bookings: number;
      website_clicks: number;
      total_interactions: number;
    };
    daily: Array<{
      date: string;
      calls: number;
      directions: number;
      bookings: number;
      website_clicks: number;
    }>;
  };
}

export interface ReportResponse {
  report_id?: string;
  siteName?: string;
  title: string;
  narrative1: string;
  tableHeader1: string[];
  tableData1: MarketingMetric[];
  googleAdsKpis?: MarketingMetric[]; // Added specifically for Google Ads metrics in combined reports
  narrative2: string;
  tableHeader2?: string[];
  tableData2?: AcquisitionChannel[];
  chartData: ChartPoint[];
  chartLabelA: string;
  chartLabelB: string;
  chartLabelC: string;
  adviceList: (StrategicAdvice | string)[];
  summarizedAdviceList?: string[];
  isMocked?: boolean;
  errorInfo?: string;
  reportStartDate?: string;
  reportEndDate?: string;
  topCountries?: Array<{ country: string; users: number }>;
  topPages?: Array<{ page: string; views: number; bounceRate?: number }>;
  topPageTitles?: Array<{ title: string; views: number }>;
  sessionsByChannel?: Array<{ channel: string; sessions: number }>;
  users_by_country?: any[];
  eventsByEventName?: Array<{ eventName: string; count: number }>;
  keyEventsByPlatform?: Array<{ platform: string; keyEvents: number }>;
  userActivityOverTime?: Array<{ date: string; users: number }>;
  aiTopKeywordsOverview?: string;
  aiComparison?: string;
  tableExplanations?: Record<string, string>;
  google_ads_details?: any;
  multiCharts?: Record<string, any[]>;
  aiCompetitorAnalysis?: any;
  sectionAdvice?: SectionAdvice;
  metaKpi?: { current: any; previous: any };
  metaCampaigns?: any[];
  metaAdsets?: any[];
  metaDevices?: any[];
  metaDaily?: any[];
  radar_data?: Array<{ subject: string; you: number; competitorA: number; competitorB: number; competitorC: number }>;
  ai_slide_descriptions?: Record<string, string>;
  improvement_roadmap?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    actions: Array<{ title: string; target: string; effort: 'Low' | 'Medium' | 'High' }>;
  };
  competitor_intelligence?: {
    biggest_threat: string;
    what_they_do_better: string;
    differentiation_actions: string[];
  };
  radar_self?: Record<string, number>;
  seo_work_details?: RawReport['seo_work_details'];
  gbp_details?: RawReport['gbp_details'];
  ga4_details?: any;
  generatedAt?: string;
  category?: string;
  dateRange?: { start: string; end: string };
  kpis?: any[];
  executiveSummary?: string;
  radarData?: any[];
  ai_insights?: any;
  performance?: any;
  chart_datasets?: any[];
}

// UI Blueprint types from Downloads/bnb.ai
export type CategoryType = 'SEO' | 'Performance Marketing' | 'Social Media Marketing' | 'Combined Intelligence';
export type SectionType = "Reports" | "Graphs" | "BnB Report" | "Client Report";

export interface KpiItem {
  label: string;
  value: string;
  change: number;  // percentage e.g. 12.5%
  isPositive: boolean;
  icon: string; // lucide icon name
}

export interface AdviceItem {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  impact: string; // e.g. "High Impact"
  effort: string; // e.g. "Low Effort"
  target?: string; // e.g. "Increase leads by 15%"
}

export interface RadarDataPoint {
  subject: string;
  ['Current Site']: number;
  ['Competitor Alpha']: number;
  ['Competitor Beta']: number;
  ['Competitor Gamma']: number;
}

// SEO Details
export interface CountryUsers {
  country: string;
  users: number;
}

export interface ActivityOverTime {
  date: string;
  users: number;
  returning?: number;
}

export interface PageViews {
  pageTitle: string;
  views: number;
}

export interface ChannelSessions {
  channel: string;
  sessions: number;
}

export interface EventCount {
  event: string;
  count: number;
}

export interface PlatformEvents {
  platform: string;
  events: number;
}

export interface CompetitorBreakdown {
  name: string;
  url?: string;
  inferred_actions: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface SelfGapAnalysis {
  strengths: string[];
  weaknesses: string[];
  missed_opportunities: string[];
  actionable_gaps: string[];
}

export interface CompetitorAnalysis {
  inferredActions: string[];
  recommendedSteps: string[];
  competitor_breakdown?: CompetitorBreakdown[];
  overall_threat_summary?: string;
  self_gap_analysis?: SelfGapAnalysis;
}

export interface SeoReportData {
  activeUsersByCountry: CountryUsers[];
  activeUsersInsight: string;
  userActivityOverTime: ActivityOverTime[];
  userActivityInsight: string;
  topKeywords: { keyword: string; clicks: number; ctr: string; position: string; previous_position?: string | number }[];
  averagePosition?: number;
  topKeywordsInsight: string;
  viewsByPageTitle: PageViews[];
  viewsByPageInsight: string;
  sessionsByChannel: ChannelSessions[];
  sessionsInsight: string;
  eventCountByEventName: EventCount[];
  eventInsight: string;
  keyEventsByPlatform: PlatformEvents[];
  platformInsight: string;
  totals?: any;
  sectionAdvice: {
    demographics: string[];
    timeline: string[];
    keywords: string[];
    pages: string[];
    channels: string[];
    events: string[];
    platforms: string[];
  };
  aiCompetitorAnalysis: CompetitorAnalysis;
}

// Performance Details
export interface GoogleAdsKpi {
  metric: string;
  current: string;
  previous: string;
  pctChange: number;
  isGood: boolean;
  currentValue: number;
  previousValue: number;
}

export interface TopCampaign {
  campaign: string;
  status?: string;
  impressions: number;
  clicks: number;
  interactions?: number;
  cost: string;
  leads: number;
  cpa: string;
  costValue: number;
}

export interface TopKeyword {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: string;
  impressionsValue: number;
  clicksValue: number;
}

export interface MetaAdsKpi {
  metric: string;
  current: string;
  previous: string;
  pctChange: number;
  isGood: boolean;
  currentValue: number;
  previousValue: number;
}

export interface MetaCampaign {
  campaign: string;
  status?: string;
  impressions: number;
  clicks: number;
  interactions?: number;
  cost: string;
  leads: number;
  costPerLead: string;
  costValue: number;
}

export interface MetaAdSet {
  adSet: string;
  impressions: number;
  cost: string;
  leads: number;
  costPerLead: string;
  costValue: number;
}

export interface DeviceBreakdown {
  device: string;
  impressions: number;
  clicks: number;
  cost: string;
  impressionsValue: number;
  costValue: number;
}

export interface PerformanceReportData {
  googleAdsKpis: GoogleAdsKpi[];
  googleAdsInsight: string;
  topCampaigns: TopCampaign[];
  topCampaignsInsight: string;
  topKeywords: TopKeyword[];
  topKeywordsInsight: string;
  googleDeviceBreakdown: DeviceBreakdown[];
  googleDeviceInsight: string;
  metaAdsKpis: MetaAdsKpi[];
  metaAdsInsight: string;
  metaTopCampaigns: MetaCampaign[];
  metaTopCampaignsInsight: string;
  metaAdSets: MetaAdSet[];
  metaAdSetsInsight: string;
  metaDeviceBreakdown: DeviceBreakdown[];
  metaDeviceInsight: string;
  websiteTrafficByCountry: CountryUsers[];
  websiteTrafficInsight: string;
  dailyWebsiteActivity: ActivityOverTime[];
  dailyWebsiteActivityInsight: string;
  sessionsByChannel?: ChannelSessions[];
  sessionsInsight?: string;
  totals?: any;
  aiCompetitorAnalysis: CompetitorAnalysis;
}

// Social Details
export interface SocialKpi {
  metric: string;
  current: string;
  previous: string;
  pctChange: number;
  isGood: boolean;
}

export interface SocialImpressionsTimeline {
  date: string;
  facebook: number;
  instagram: number;
}

export interface SocialReportData {
  socialKpis: SocialKpi[];
  socialInsight: string;
  impressionsTimeline: SocialImpressionsTimeline[];
  impressionsTimelineInsight: string;
  sectionAdvice?: {
    kpi_advice: string[];
    timeline_advice: string[];
  };
}

// Full intelligence report model
export interface MarketingReport {
  id: string;
  site_id?: string;
  report_id?: string;
  siteName: string;
  category: CategoryType;
  dateRange: { start: string; end: string };
  generatedAt: string;
  kpis: KpiItem[];
  executiveSummary: string;
  adviceList: AdviceItem[];
  summarizedAdviceList?: string[];
  radarData: RadarDataPoint[];
  chartData: ChartPoint[];
  chartLabelA?: string;
  chartLabelB?: string;
  chartLabelC?: string;
  imageUrl?: string;
  seo?: SeoReportData;
  performance?: PerformanceReportData;
  social?: SocialReportData;
  aiSlideDescriptions?: {
    meta_titles?: string;
    heading_structure?: string;
    internal_linking?: string;
    content_formatting?: string;
    gmb_authority?: string;
    gmb_support?: string;
  };
  ai_insights?: any;
  ai_summary?: any;
  ai_recommendations?: any[];
  seo_work_details?: RawReport['seo_work_details'];
  gbp_details?: RawReport['gbp_details'];
  improvement_roadmap?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    actions: Array<{ title: string; target: string; effort: 'Low' | 'Medium' | 'High' }>;
  };
  competitor_intelligence?: {
    biggest_threat: string;
    what_they_do_better: string;
    differentiation_actions: string[];
  };
  radar_self?: Record<string, number>;
  tableData1?: MarketingMetric[];
  tableData2?: AcquisitionChannel[];
  topPages?: Array<{ page: string; views: number; bounceRate?: number }>;
  topPageTitles?: Array<{ title: string; views: number }>;
  sessionsByChannel?: Array<{ channel: string; sessions: number }>;
  eventsByEventName?: Array<{ eventName: string; count: number }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'analyst';
  text: string;
  timestamp: string;
}

export interface SiteInfo {
  id: string;
  name: string;
  url: string;
}

// Interactive PPT Types
export interface SlideKPI {
  label: string;
  value: string;
  subValue?: string;
  growth?: string;
  isPositive?: boolean;
}

export interface ScorecardMetric {
  id: string;
  name: string;
  score: number;
  color: string;
}

export interface GrowthKPIRow {
  id: string;
  name: string;
  prev: string;
  current: string;
  variance: string;
  status: 'positive' | 'negative' | 'neutral';
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  subValue?: number;
}

export interface ScatterPoint {
  id: string;
  keyword: string;
  ctr: number;      // percentage, e.g. 32.1
  position: number; // e.g. 1.86
  volume?: number;  // optional sized bubble
}

export interface FunnelStage {
  id: string;
  name: string;
  value: number;
  percentage?: string;
  conversionText?: string;
}

export interface CampaignData {
  id: string;
  name: string;
  status: 'Top Performer' | 'Needs Audit' | 'Active';
  spend: string;
  leads: number;
  cpl: string;
  chartData: { label: string; current: number; relative: number }[];
}

export interface StrategicItem {
  id: string;
  category: string;
  title: string;
  desc: string;
}

export interface CityData {
  id: string;
  city: string;
  users: number;
}

export interface RoadmapCard {
  id: string;
  title: string;
  desc: string;
  category: string;
}

export interface RoadmapMonth {
  title: string;
  subtitle: string;
  color: string;
  items: RoadmapCard[];
}

export type SlideType =
  | 'digital_cover'
  | 'table_of_contents'
  | 'exec_summary'
  | 'services_delivered'
  | 'overall_performance'
  | 'seo_performance'
  | 'website_analytics'
  | 'social_performance'
  | 'content_performance'
  | 'meta_ads'
  | 'google_ads'
  | 'lead_gen'
  | 'activities_completed'
  | 'challenges_solutions'
  | 'competitor_insights'
  | 'recommendations'
  | 'action_plan'
  | 'thank_you'
  | 'cover'
  | 'summary'
  | 'scorecard'
  | 'growth'
  | 'organic'
  | 'scatter'
  | 'funnel'
  | 'campaign'
  | 'audience'
  | 'channels'
  | 'roadmap'
  | 'outro';

export interface Slide {
  id: string;
  type: SlideType;
  title: string;
  subTag?: string;
  scoreTag?: string;
  metadata?: {
    reportingPeriod?: string;
    preparedBy?: string;
    classification?: string;
    version?: string;
    client?: string;
    platform?: string;
    rightDesc?: string;
  };
  kpis?: SlideKPI[];
  scorecardGauges?: ScorecardMetric[];
  scorecardInsight?: string;
  growthTable?: GrowthKPIRow[];
  growthInsight?: string;
  chartData?: ChartDataPoint[];
  scatterPoints?: ScatterPoint[];
  funnelStages?: FunnelStage[];
  campaigns?: CampaignData[];
  cities?: CityData[];
  roadmapMonths?: RoadmapMonth[];
  footer?: string;
  descriptionText?: string;
  insightsList?: { icon: 'win' | 'risk' | 'opportunity' | 'neutral'; title: string; text: string }[];

  // High-fidelity image and custom parameters
  images?: Record<string, string>; // slot ID to base64 Data URL
  listItems?: string[];
  listSections?: { title: string; items: string[] }[];
  tableData?: Record<string, any>[];
  customData?: any;
}
