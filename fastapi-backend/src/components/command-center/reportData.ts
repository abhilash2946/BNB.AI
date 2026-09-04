import { Slide } from '../../types';

export const initialSlides: Slide[] = [
  {
    id: 'slide-01',
    type: 'digital_cover',
    title: 'Digital Marketing Monthly Performance Report',
    metadata: {
      client: 'RL TOURS & TRAVELS',
      reportingPeriod: 'June 2024 – June 2025',
      preparedBy: 'AdmarTech AI Engine V2.0',
      platform: 'Rltoursandtravels.Com'
    },
    images: {
      logo: '',
      img1: '',
      img2: ''
    },
    footer: '01'
  },
  {
    id: 'slide-02',
    type: 'table_of_contents',
    title: 'Contents',
    metadata: {
      rightDesc: 'Digital Marketing Monthly Performance Report\nJune 2024 - June 2025'
    },
    footer: '02'
  },
  {
    id: 'slide-03',
    type: 'exec_summary',
    title: 'Executive Performance Summary',
    metadata: {
      rightDesc: 'Digital Efforts Focused On Improving Visibility, Generating Qualified Leads And Increasing Conversion Efficiency.'
    },
    kpis: [
      { label: 'Leads', value: '0' },
      { label: 'Traffic', value: '0%' },
      { label: 'Conversions And ROAS Overview', value: '0.0X ROAS' }
    ],
    images: {
      img1: '',
      img2: '',
      img3: ''
    },
    footer: '03'
  },
  {
    id: 'slide-04',
    type: 'services_delivered',
    title: 'Services Delivered',
    metadata: {
      rightDesc: 'Integrated Activities Executed Across SEO, Social Media, Paid Advertising And Website Management.'
    },
    listItems: [
      'SEO',
      'Social Media Marketing',
      'Paid Advertising',
      'Website Management'
    ],
    images: {
      img1: '',
      img2: ''
    },
    footer: '04'
  },
  {
    id: 'slide-05',
    type: 'overall_performance',
    title: 'Overall Performance Overview',
    metadata: {
      rightDesc: 'Month-Over-Month Performance Comparison.'
    },
    tableData: [
      { kpi: 'Website Users', prev: '0', current: '0', growth: '0%' },
      { kpi: 'Sessions', prev: '0', current: '0', growth: '0%' },
      { kpi: 'Leads Generated', prev: '0', current: '0', growth: '0%' },
      { kpi: 'Social Reach', prev: '0', current: '0', growth: '0%' },
      { kpi: 'Engagement Rate', prev: '0.0%', current: '0.0%', growth: '0%' },
      { kpi: 'Ad Spend', prev: '₹0', current: '₹0', growth: '0%' },
      { kpi: 'Conversions', prev: '0', current: '0', growth: '0%' },
      { kpi: 'ROAS', prev: '0.0X', current: '0.0X', growth: '0%' }
    ],
    footer: '05'
  },
  {
    id: 'slide-06',
    type: 'seo_performance',
    title: 'SEO Performance',
    metadata: {
      rightDesc: 'SEO Efforts Improved Search Visibility And Organic Growth.'
    },
    subTag: 'Organic Traffic Overview',
    kpis: [
      { label: 'Organic Users', value: '0' },
      { label: 'Organic Sessions', value: '0' },
      { label: 'New Users', value: '0' },
      { label: 'Average Session Duration', value: '0s' },
      { label: 'Bounce Rate', value: '0.0%' }
    ],
    tableData: [
      { keyword: 'Travel Agency', prev: '-', current: '-' },
      { keyword: 'International Tour Packages', prev: '-', current: '-' },
      { keyword: 'Tours and Travels', prev: '-', current: '-' },
      { keyword: 'Visa Assistance', prev: '-', current: '-' }
    ],
    footer: '06'
  },
  {
    id: 'slide-07',
    type: 'website_analytics',
    title: 'Website Analytics',
    metadata: {
      rightDesc: 'Traffic Improved Through Organic And Paid Acquisition Channels.'
    },
    kpis: [
      { label: 'Organic Search', value: '0' },
      { label: 'Social Media', value: '0' },
      { label: 'Paid Advertising', value: '0' },
      { label: 'Direct Traffic', value: '0' }
    ],
    customData: {
      insights: [
        { label: 'Most Visited Page', value: '-' },
        { label: 'Highest Converting Page', value: '-' },
        { label: 'Lowest Bounce Rate Page', value: '-' },
        { label: 'Traffic Growth Percentage', value: '0%' }
      ],
      pages: [
        { url: 'Homepage', views: '0' },
        { url: 'Packages', views: '0' },
        { url: 'Contact Us', views: '0' },
        { url: 'Services', views: '0' }
      ]
    },
    footer: '07'
  },
  {
    id: 'slide-08',
    type: 'social_performance',
    title: 'Social Media Performance',
    metadata: {
      rightDesc: 'Destination-Based Video Content Delivered The Highest Audience Engagement.'
    },
    customData: {
      facebook: { reach: '0', impressions: '0', engagement: '0', followerGrowth: '0' },
      instagram: { reach: '0', impressions: '0', engagement: '0', followerGrowth: '0' },
      linkedin: { reach: '0', impressions: '0', engagement: '0', followerGrowth: '0' },
      youtube: { views: '0', watchTime: '0 Hrs', subscribers: '0' }
    },
    footer: '08'
  },
  {
    id: 'slide-09',
    type: 'content_performance',
    title: 'Content Performance',
    metadata: {
      rightDesc: 'Travel Destination Reels Generated He Highest Engagement.'
    },
    subTag: 'Content Published',
    kpis: [
      { label: 'Social Posts', value: '0' },
      { label: 'Reels', value: '0' },
      { label: 'Stories', value: '0' },
      { label: 'Videos', value: '0' },
      { label: 'Blogs', value: '0' }
    ],
    tableData: [
      { name: 'Post 1', reach: '0', engagement: '0' },
      { name: 'Post 2', reach: '0', engagement: '0' },
      { name: 'Post 3', reach: '0', engagement: '0' }
    ],
    customData: {
      insights: [
        { label: 'Highest Engagement Format', value: '-' },
        { label: 'Best Performing Content Theme', value: '-' },
        { label: 'Audience Preference Observations', value: '-' }
      ]
    },
    footer: '09'
  },
  {
    id: 'slide-10',
    type: 'meta_ads',
    title: 'Meta Ads Performance',
    metadata: {
      rightDesc: 'Remarketing Campaigns Generated The Lowest Cost Per Lead.'
    },
    tableData: [
      { name: 'Lead Generation', spend: '₹0', leads: '0', cpl: '₹0' },
      { name: 'Remarketing', spend: '₹0', leads: '0', cpl: '₹0' },
      { name: 'Awareness', spend: '₹0', leads: '0', cpl: '₹0' }
    ],
    kpis: [
      { label: 'Reach', value: '0' },
      { label: 'Impressions', value: '0' },
      { label: 'Link Clicks', value: '0' },
      { label: 'CTR', value: '0.0%' },
      { label: 'CPC', value: '₹0' },
      { label: 'Leads Generated', value: '0' },
      { label: 'Cost Per Lead', value: '₹0' }
    ],
    customData: {
      findings: [
        { label: 'Best Performing Audience', value: '25-45 Years' },
        { label: 'Best Performing Creative', value: 'Destination Reels' },
        { label: 'Best Placement', value: 'Instagram Feed' },
        { label: 'Highest Converting Campaign', value: 'Remarketing' }
      ]
    },
    footer: '10'
  },
  {
    id: 'slide-11',
    type: 'google_ads',
    title: 'Google Ads Performance',
    metadata: {
      rightDesc: 'Search Campaigns Generated High-Intent Travel Inquiries.'
    },
    tableData: [
      { name: 'Lead Generation', spend: '₹0', leads: '0', cpl: '₹0' },
      { name: 'Remarketing', spend: '₹0', leads: '0', cpl: '₹0' },
      { name: 'Awareness', spend: '₹0', leads: '0', cpl: '₹0' }
    ],
    kpis: [
      { label: 'Reach', value: '0' },
      { label: 'Impressions', value: '0' },
      { label: 'Link Clicks', value: '0' },
      { label: 'CTR', value: '0%' },
      { label: 'CPC', value: '₹0' },
      { label: 'Leads Generated', value: '0' }
    ],
    customData: {
      keywords: [
        { kw: 'Thailand Packages', clicks: '0', conv: '0' },
        { kw: 'International Tour Packages', clicks: '0', conv: '0' },
        { kw: 'Travel Agency Hyderabad', clicks: '0', conv: '0' }
      ]
    },
    footer: '11'
  },
  {
    id: 'slide-12',
    type: 'lead_gen',
    title: 'Lead Generation Report',
    metadata: {
      rightDesc: 'Meta Campaigns Remained The Strongest Lead Source.'
    },
    tableData: [
      { source: 'Meta Ads', leads: '0' },
      { source: 'Google Ads', leads: '0' },
      { source: 'Organic Search', leads: '0' },
      { source: 'Referral', leads: '0' },
      { source: 'Direct', leads: '0' }
    ],
    kpis: [
      { label: 'Hot Leads', value: '0' },
      { label: 'Warm Leads', value: '0' },
      { label: 'Cold Leads', value: '0' }
    ],
    customData: {
      observations: [
        { label: 'Best Lead Source', value: '-' },
        { label: 'Lowest Cost Lead Source', value: '-' },
        { label: 'Highest Conversion Source', value: '-' }
      ]
    },
    footer: '12'
  },
  {
    id: 'slide-13',
    type: 'activities_completed',
    title: 'Activities Completed During The Month',
    metadata: {
      rightDesc: 'Optimization Activities Focused On Improving Campaign Efficiency And User Experience. Keep All Your Original Checklists Exactly.'
    },
    listSections: [
      {
        title: 'SEO Activities',
        items: [
          'Keyword Research',
          'On-Page Optimization',
          'Technical SEO Improvements',
          'Backlink Submission',
          'Content Optimization'
        ]
      },
      {
        title: 'Social Media Activities',
        items: [
          'Content Planning',
          'Creative Design',
          'Reel Creation',
          'Posting & Scheduling',
          'Community Management'
        ]
      },
      {
        title: 'Paid Advertising Activities',
        items: [
          'Campaign Setup',
          'Audience Testing',
          'Creative Testing',
          'Budget Optimization',
          'Conversion Tracking'
        ]
      },
      {
        title: 'Website Activities',
        items: [
          'Website Updates',
          'Landing Page Optimization',
          'Performance Monitoring',
          'Technical Fixes',
          'Content Optimization'
        ]
      }
    ],
    footer: '13'
  },
  {
    id: 'slide-14',
    type: 'challenges_solutions',
    title: 'Challenges & Solutions',
    metadata: {
      rightDesc: 'Month-Over-Month Performance Comparison.'
    },
    images: {
      img1: ''
    },
    customData: {
      challenges: [
        'Rising Travel Competition',
        'Increasing Ad Costs',
        'Audience Fatigue'
      ],
      solutions: [
        'Destination-Focused Campaigns',
        'Budget Optimization',
        'Creative Refresh'
      ],
      results: [
        { label: 'CTR Increased By', value: '18%' },
        { label: 'CTR Increased By', value: '18%' },
        { label: 'CTR Increased By', value: '18%' }
      ]
    },
    footer: '14'
  },
  {
    id: 'slide-15',
    type: 'competitor_insights',
    title: 'Competitor Insights',
    metadata: {
      rightDesc: 'Competitor Analysis Was Conducted To Identify Market Opportunities, Content Trends And Customer Acquisition Strategies.'
    },
    customData: {
      seoCompetitors: [],
      performanceCompetitors: [],
      selectedSeoIdx: null,
      selectedPerfIdx: null,
      seoObservation: 'SEO competitors are aggressively targeting high-intent keywords.',
      performanceObservation: 'Performance competitors are scaling video ad spend.',
      seoOpportunity: 'Focus on long-tail destination keywords.',
      performanceOpportunity: 'Implement dynamic remarketing for abandoned carts.'
    },
    footer: '15'
  },
  {
    id: 'slide-16',
    type: 'recommendations',
    title: 'Recommendations',
    metadata: {
      rightDesc: 'Based On Current Performance, The Following Recommendations Are Suggested'
    },
    listItems: [
      'Increase Budget On High-Performing Campaigns.',
      'Expand Remarketing Efforts.',
      'Focus On Video-First Content Strategy.',
      'Improve Landing Page Conversion Rates.',
      'Enhance Local SEO Visibility.',
      'Implement WhatsApp Lead Nurturing.',
      'Increase Blog Publishing Frequency.'
    ],
    footer: '16'
  },
  {
    id: 'slide-17',
    type: 'action_plan',
    title: 'Next Month Action Plan',
    metadata: {
      rightDesc: 'Focus Will Be On Scaling High-Performing Channels And Improving Conversion Efficiency.'
    },
    listSections: [
      {
        title: 'SEO Activities',
        items: [
          'Improve Keyword Rankings',
          'Publish Optimized Content',
          'Build Quality Backlinks'
        ]
      },
      {
        title: 'Social Media Activities',
        items: [
          'Increase Reel Production',
          'Launch Engagement Campaigns',
          'Improve Audience Interaction'
        ]
      },
      {
        title: 'Paid Advertising Activities',
        items: [
          'Scale Winning Campaigns',
          'Launch Retargeting Campaigns',
          'Optimize Conversion Rates'
        ]
      },
      {
        title: 'Website Activities',
        items: [
          'Improve User Experience',
          'Optimize Landing Pages',
          'Enhance Page Speed'
        ]
      }
    ],
    customData: {
      conclusion: 'The digital marketing initiatives executed during this reporting period have contributed positively toward brand visibility, audience engagement, lead generation and business growth. Continuous optimization and strategic improvements will further strengthen performance and maximize return on investment in the coming months.'
    },
    footer: '17'
  },
  {
    id: 'slide-18',
    type: 'thank_you',
    title: 'Conclusion',
    metadata: {
      platform: 'BLACKNBOLD.IN'
    },
    footer: '18'
  }
];
