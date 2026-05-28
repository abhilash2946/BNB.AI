import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { UserProfile, SiteProfile } from "../types";
import { Globe, ArrowRight, User, Play, Key, ExternalLink, ShieldCheck, Instagram, Facebook, BarChart3, Lock, Building2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface OnboardingProps {
  userId: string;
  initialEmail: string;
  initialName?: string;
  onComplete: () => void;
  defaultSites: SiteProfile[];
}

export default function Onboarding({ userId, initialEmail, initialName, onComplete }: OnboardingProps) {
  const STORAGE_KEY = `bnb_onboarding_state_${userId}`;

  // Helper to load saved state
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

  const [step, setStep] = useState<1 | 2 | 3>(() => getSavedState('step', 1));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Step 1: Profile ---
  const [profile, setProfile] = useState(() => getSavedState('profile', {
    name: initialName || "",
    agencyName: "",
    role: "",
    tier: "Standard" as const
  }));

  // --- Step 2: Shared Credentials ---
  const [metaToken, setMetaToken] = useState(() => getSavedState('metaToken', ""));
  const [googleAdsDevToken, setGoogleAdsDevToken] = useState(() => getSavedState('googleAdsDevToken', ""));

  // Handle OAuth Callback success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setStep(3);
    }
  }, []);

  // --- Step 3: Site & IDs ---
  const [siteName, setSiteName] = useState(() => getSavedState('siteName', ""));
  const [siteUrl, setSiteUrl] = useState(() => getSavedState('siteUrl', ""));
  const [industry, setIndustry] = useState(() => getSavedState('industry', "Travel & Leisure"));
  const [ga4Id, setGa4Id] = useState(() => getSavedState('ga4Id', ""));
  const [gscUrl, setGscUrl] = useState(() => getSavedState('gscUrl', ""));
  const [googleAdsId, setGoogleAdsId] = useState(() => getSavedState('googleAdsId', ""));
  const [metaAdsId, setMetaAdsId] = useState(() => getSavedState('metaAdsId', ""));
  const [fbPageId, setFbPageId] = useState(() => getSavedState('fbPageId', ""));
  const [igBusId, setIgBusId] = useState(() => getSavedState('igBusId', ""));

  // Persist state to localStorage
  useEffect(() => {
    const stateToSave = {
      step, profile, metaToken, googleAdsDevToken,
      siteName, siteUrl, industry, ga4Id, gscUrl, googleAdsId,
      metaAdsId, fbPageId, igBusId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [step, profile, metaToken, googleAdsDevToken, siteName, siteUrl, industry, ga4Id, gscUrl, googleAdsId, metaAdsId, fbPageId, igBusId, STORAGE_KEY]);

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      console.error("No userId provided to onboarding");
      alert("User ID is missing. Cannot complete onboarding.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    setIsSubmitting(false);
    localStorage.removeItem(STORAGE_KEY);
    void Promise.resolve(onComplete());

    void (async () => {
      try {
        if (profile.name || profile.agencyName || profile.role) {
          await supabase.from("profiles").upsert({
            id: userId,
              email: initialEmail,
            email: initialEmail,
            name: profile.name.trim(),
            agency_name: profile.agencyName.trim(),
            role: profile.role.trim(),
            tier: profile.tier,
          });
        }

        if (googleAdsDevToken) {
          await supabase.from("user_credentials").upsert({
            user_id: userId,
            platform: "google_developer_token",
            credentials: { developer_token: googleAdsDevToken }
          });
        }
        if (metaToken) {
          await supabase.from("user_credentials").upsert({
            user_id: userId,
            platform: "meta_long_lived_token",
            credentials: { token: metaToken }
          });
        }

        if (siteName || siteUrl) {
          const { data: siteObj } = await supabase.from("sites").insert({
            user_id: userId,
            name: siteName.trim(),
            url: siteUrl.trim(),
            industry: industry,
            seo_settings: {
              ga4Id: ga4Id.trim(),
              gscUrl: gscUrl.trim(),
              googleAdsId: googleAdsId.trim(),
              metaAdsId: metaAdsId.trim(),
              fbPageId: fbPageId.trim(),
              igBusId: igBusId.trim(),
            },
          }).select().single();

          if (siteObj) {
            const perSiteCreds = [
              { platform: "ga4", data: { property_id: ga4Id } },
              { platform: "google_search_console", data: { site_url: gscUrl } },
              { platform: "google_ads", data: { customer_id: googleAdsId } },
              { platform: "meta_ads", data: { ad_account_id: metaAdsId } },
              { platform: "meta_business_suite", data: { page_id: fbPageId } },
              { platform: "instagram", data: { instagram_business_id: igBusId } },
            ];

            for (const cred of perSiteCreds) {
              if (Object.values(cred.data).some(v => v)) {
                await supabase.from("site_credentials").upsert({
                  site_id: siteObj.id,
                  platform: cred.platform,
                  credentials: cred.data,
                }, { onConflict: 'site_id, platform' });
              }
            }
          }
        }
      } catch (err) {
        console.error("[Onboarding] Best-effort save failed", err);
      }
    })();
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] flex flex-col justify-center py-12 px-6 font-sans">
      <div className="max-w-3xl mx-auto w-full">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="flex items-center space-x-2 text-[10px] font-mono font-bold uppercase tracking-widest">
            <span className={step === 1 ? "text-amber-800" : "text-neutral-300"}>01 Profile</span>
            <span className="text-neutral-200">/</span>
            <span className={step === 2 ? "text-amber-800" : "text-neutral-300"}>02 Agency Data</span>
            <span className="text-neutral-200">/</span>
            <span className={step === 3 ? "text-amber-800" : "text-neutral-300"}>03 First Site</span>
          </div>
          <span className="text-[10px] text-neutral-400 bg-white border border-stone-200 px-2 py-0.5 rounded font-mono">STEP {step}/3</span>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 border border-[#e8e4db] rounded-3xl shadow-xl max-w-xl mx-auto">
            <div className="mb-8"><div className="h-10 w-10 bg-neutral-900 rounded-xl flex items-center justify-center mb-4"><User className="text-amber-100 h-5 w-5"/></div><h3 className="text-2xl font-bold">Configure Profile</h3></div>
            <form onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
                void (async () => {
                  try {
                    await supabase.from("profiles").upsert({
                      id: userId,
                      name: profile.name.trim(),
                      agency_name: profile.agencyName.trim(),
                      role: profile.role.trim(),
                      tier: profile.tier,
                    });
                  } catch (err) {
                    console.error("Profile save failed", err);
                  }
                })();
              }} className="space-y-6">
              <input type="text" placeholder="Full Name" required value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full px-4 py-3 bg-[#FAF9F5] border border-stone-200 rounded-xl outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Agency Name" required value={profile.agencyName} onChange={e => setProfile({...profile, agencyName: e.target.value})} className="px-4 py-3 bg-[#FAF9F5] border border-stone-200 rounded-xl outline-none" />
                <input type="text" placeholder="Professional Role" required value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})} className="px-4 py-3 bg-[#FAF9F5] border border-stone-200 rounded-xl outline-none" />
              </div>
              <button type="submit" className="w-full py-4 bg-neutral-900 text-amber-50 rounded-xl font-bold flex items-center justify-center gap-2">Next: Agency Data <ArrowRight className="h-4 w-4"/></button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 border border-[#e8e4db] rounded-3xl shadow-xl max-w-xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <div><div className="h-10 w-10 bg-neutral-900 rounded-xl flex items-center justify-center mb-4"><Building2 className="text-amber-100 h-5 w-5"/></div><h3 className="text-2xl font-bold">Agency Credentials</h3></div>
              <div className="flex flex-col gap-1">
                <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noreferrer" className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center gap-1"><ExternalLink className="h-2 w-2"/>Google Setup</a>
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center gap-1"><ExternalLink className="h-2 w-2"/>Meta Setup</a>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">Google Accounts (GA4, GSC, Ads)</label>
                <button
                  type="button"
                  onClick={async () => {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/url?user_id=${userId}`);
                    const { url } = await response.json();
                    window.location.href = url;
                  }}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Globe className="h-4 w-4" /> Connect Google Account
                </button>
                <p className="text-[9px] text-neutral-500 mt-2">Connects to Analytics, Search Console, & Ads via OAuth. Requires popups enabled.</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-stone-100">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">Meta Long-Lived Token</label>
                <input type="password" placeholder="60-day access token" value={metaToken} onChange={e => setMetaToken(e.target.value)} className="w-full px-4 py-3 bg-[#FAF9F5] border border-stone-200 rounded-xl outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">Google Ads Developer Token</label>
                <input
                  type="text"
                  placeholder="22-character token (e.g., ABCDEFGHIJKLMNOPQRSTUV)"
                  value={googleAdsDevToken}
                  onChange={e => setGoogleAdsDevToken(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-stone-200 rounded-xl outline-none"
                />
                <p className="text-[9px] text-neutral-400">Find in your Google Ads MCC → Tools & Settings → API Center.</p>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setStep(1)} className="px-6 py-4 border border-stone-200 rounded-xl font-bold">Back</button>
                <button type="submit" className="flex-1 py-4 bg-neutral-900 text-amber-50 rounded-xl font-bold">Next: Site Setup</button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 border border-[#e8e4db] rounded-3xl shadow-xl">
            <div className="mb-8"><div className="h-10 w-10 bg-neutral-900 rounded-xl flex items-center justify-center mb-4"><Globe className="text-amber-100 h-5 w-5"/></div><h3 className="text-2xl font-bold">Configure First Site</h3></div>
            <form onSubmit={handleFinishOnboarding} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-stone-100">
                <input type="text" placeholder="Site Name (e.g. My Shop)" required value={siteName} onChange={e => setSiteName(e.target.value)} className="w-full px-4 py-3 bg-[#FAF9F5] border border-stone-200 rounded-xl outline-none" />
                <input type="url" placeholder="Website URL" required value={siteUrl} onChange={e => setSiteUrl(e.target.value)} className="w-full px-4 py-3 bg-[#FAF9F5] border border-stone-200 rounded-xl outline-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-1 rounded w-fit">SEO IDs</div>
                  <input type="text" placeholder="GA4 Property ID" value={ga4Id} onChange={e => setGa4Id(e.target.value)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-mono" />
                  <input type="text" placeholder="GSC Site URL" value={gscUrl} onChange={e => setGscUrl(e.target.value)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-mono" />
                </div>
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-1 rounded w-fit">Performance IDs</div>
                  <input type="text" placeholder="G-Ads Customer ID" value={googleAdsId} onChange={e => setGoogleAdsId(e.target.value)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-mono" />
                  <input type="text" placeholder="Meta Ad Account ID" value={metaAdsId} onChange={e => setMetaAdsId(e.target.value)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-mono" />
                </div>
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-purple-700 uppercase bg-purple-50 px-2 py-1 rounded w-fit">Social IDs</div>
                  <input type="text" placeholder="FB Page ID" value={fbPageId} onChange={e => setFbPageId(e.target.value)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-mono" />
                  <input type="text" placeholder="IG Business ID" value={igBusId} onChange={e => setIgBusId(e.target.value)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-mono" />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(2)} className="px-8 py-4 border border-stone-200 rounded-xl font-bold">Back</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-neutral-900 text-amber-50 rounded-xl font-bold shadow-lg disabled:opacity-50">
                  {isSubmitting ? "Initializing..." : "Complete Workspace Setup"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
