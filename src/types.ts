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
}

export interface SiteProfile {
  id: string;
  name: string;
  url: string;
  industry: string;
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
}

export interface ChartPoint {
  label: string;
  valueA: number;
  valueB: number;
  valueC: number;
}

export interface StrategicAdvice {
  title: string;
  description: string;
  impact: string;
  effort: string;
}

export interface ReportResponse {
  title: string;
  narrative1: string;
  tableHeader1: string[];
  tableData1: MarketingMetric[];
  narrative2: string;
  tableHeader2?: string[];
  tableData2?: AcquisitionChannel[];
  chartData: ChartPoint[];
  chartLabelA: string;
  chartLabelB: string;
  chartLabelC: string;
  adviceList: StrategicAdvice[];
  isMocked?: boolean;
  errorInfo?: string;
  reportStartDate?: string;
  reportEndDate?: string;
  topCountries?: Array<{ country: string; users: number }>;
  topPages?: Array<{ page: string; views: number }>;
  topPageTitles?: Array<{ title: string; views: number }>;
  sessionsByChannel?: Array<{ channel: string; sessions: number }>;
  eventsByEventName?: Array<{ eventName: string; count: number }>;
  keyEventsByPlatform?: Array<{ platform: string; keyEvents: number }>;
  userActivityOverTime?: Array<{ date: string; users: number }>;
  aiTopKeywordsOverview?: string;
  tableExplanations?: Record<string, string>;
}
