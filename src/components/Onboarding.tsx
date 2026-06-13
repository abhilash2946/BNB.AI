import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserProfile, SiteProfile } from "../types";
import { Globe, ArrowRight, User, Play, Key, ExternalLink, ShieldCheck, Instagram, Facebook, BarChart3, Lock, Building2, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { GlassCard } from "./GlassCard";
import toast from 'react-hot-toast';

interface OnboardingProps {
  userId: string;
  initialEmail: string;
  initialName?: string;
  onComplete: () => void;
  defaultSites: SiteProfile[];
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Onboarding({ userId, initialEmail, initialName, onComplete }: OnboardingProps) {
  const STORAGE_KEY = `bnb_onboarding_state_${userId}`;

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

  const [profile, setProfile] = useState(() => getSavedState('profile', {
    name: initialName || "",
    agencyName: "",
    role: "",
    tier: "Standard" as const
  }));

  const [metaToken, setMetaToken] = useState(() => getSavedState('metaToken', ""));
  const [googleAdsDevToken, setGoogleAdsDevToken] = useState(() => getSavedState('googleAdsDevToken', ""));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") setStep(3);
  }, []);

  const [siteName, setSiteName] = useState(() => getSavedState('siteName', ""));
  const [siteUrl, setSiteUrl] = useState(() => getSavedState('siteUrl', ""));
  const [industry, setIndustry] = useState(() => getSavedState('industry', "Travel & Leisure"));
  const [ga4Id, setGa4Id] = useState(() => getSavedState('ga4Id', ""));
  const [gscUrl, setGscUrl] = useState(() => getSavedState('gscUrl', ""));
  const [googleAdsId, setGoogleAdsId] = useState(() => getSavedState('googleAdsId', ""));
  const [metaAdsId, setMetaAdsId] = useState(() => getSavedState('metaAdsId', ""));
  const [fbPageId, setFbPageId] = useState(() => getSavedState('fbPageId', ""));
  const [igBusId, setIgBusId] = useState(() => getSavedState('igBusId', ""));

  useEffect(() => {
    const stateToSave = { step, profile, metaToken, googleAdsDevToken, siteName, siteUrl, industry, ga4Id, gscUrl, googleAdsId, metaAdsId, fbPageId, igBusId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [step, profile, metaToken, googleAdsDevToken, siteName, siteUrl, industry, ga4Id, gscUrl, googleAdsId, metaAdsId, fbPageId, igBusId, STORAGE_KEY]);

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSubmitting(true);
    try {
      if (profile.name || profile.agencyName || profile.role) {
        await supabase.from("profiles").upsert({ id: userId, email: initialEmail, name: profile.name.trim(), agency_name: profile.agencyName.trim(), role: profile.role.trim(), tier: profile.tier });
      }
      const userCredsTasks: Promise<any>[] = [];
      if (googleAdsDevToken) userCredsTasks.push(supabase.from("user_credentials").upsert({ user_id: userId, platform: "google_developer_token", credentials: { developer_token: googleAdsDevToken } }));
      if (metaToken) userCredsTasks.push(supabase.from("user_credentials").upsert({ user_id: userId, platform: "meta_long_lived_token", credentials: { token: metaToken } }));

      let siteTask: Promise<any> = Promise.resolve(null);
      if (siteName || siteUrl) siteTask = supabase.from("sites").insert({ user_id: userId, name: siteName.trim(), url: siteUrl.trim(), industry, seo_settings: { ga4Id: ga4Id.trim(), gscUrl: gscUrl.trim(), googleAdsId: googleAdsId.trim(), metaAdsId: metaAdsId.trim(), fbPageId: fbPageId.trim(), igBusId: igBusId.trim() } }).select().single();

      const [ , siteResp] = await Promise.all([Promise.all(userCredsTasks), siteTask]);
      const siteObj = siteResp?.data;
      if (siteObj) {
        const perSiteCreds = [
          { platform: "ga4", data: { property_id: ga4Id } },
          { platform: "google_search_console", data: { site_url: gscUrl } },
          { platform: "google_ads", data: { customer_id: googleAdsId } },
          { platform: "meta_ads", data: { ad_account_id: metaAdsId } },
          { platform: "meta_business_suite", data: { page_id: fbPageId } },
          { platform: "instagram", data: { instagram_business_id: igBusId } },
        ];
        const siteCredTasks = perSiteCreds.filter(cred => Object.values(cred.data).some(v => v)).map(cred => supabase.from("site_credentials").upsert({ site_id: siteObj.id, platform: cred.platform, credentials: cred.data }, { onConflict: 'site_id, platform' }));
        await Promise.all(siteCredTasks);
      }
      localStorage.removeItem(STORAGE_KEY);
      onComplete();
    } catch (err: any) {
      toast.error(`Setup failed: ${err.message}`);
    }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-white flex flex-col justify-center py-12 px-6 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
      <div className="max-w-3xl mx-auto w-full relative z-10">
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="flex items-center space-x-2 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
            <span className={step === 1 ? "text-cyan-400" : ""}>01 Profile</span>
            <span>/</span>
            <span className={step === 2 ? "text-cyan-400" : ""}>02 Agency</span>
            <span>/</span>
            <span className={step === 3 ? "text-cyan-400" : ""}>03 First Site</span>
          </div>
          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded font-mono">NODE {step}/3</span>
        </div>

        {step === 1 && (
          <GlassCard className="p-10 max-w-xl mx-auto">
            <div className="mb-8 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg"><User size={24} /></div>
              <h3 className="text-2xl font-bold">Configure Profile</h3>
            </div>
            <form onSubmit={e => { e.preventDefault(); setStep(2); }} className="space-y-6">
              <input type="text" placeholder="Full Name" required value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Agency Name" required value={profile.agencyName} onChange={e => setProfile({...profile, agencyName: e.target.value})} className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none" />
                <input type="text" placeholder="Role" required value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})} className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none" />
              </div>
              <button type="submit" className="w-full py-4 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all">Next Protocol <ArrowRight size={18}/></button>
            </form>
          </GlassCard>
        )}

        {step === 2 && (
          <GlassCard className="p-10 max-w-xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg"><Building2 size={24} /></div>
                <h3 className="text-2xl font-bold">Agency Data</h3>
              </div>
            </div>
            <form onSubmit={e => { e.preventDefault(); setStep(3); }} className="space-y-6">
              <button type="button" onClick={async () => { const res = await fetch(`${API_URL}/auth/google/url?user_id=${userId}`); const { url } = await res.json(); window.location.href = url; }} className="w-full py-4 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"><Globe size={18} /> Connect Google Cloud</button>
              <div className="space-y-4 pt-4 border-t border-white/5">
                <input type="password" placeholder="Meta Long-Lived Token" value={metaToken} onChange={e => setMetaToken(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none" />
                <input type="text" placeholder="Google Ads Developer Token" value={googleAdsDevToken} onChange={e => setGoogleAdsDevToken(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setStep(1)} className="px-6 py-4 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all">Back</button>
                <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-xl font-bold">Next Phase</button>
              </div>
            </form>
          </GlassCard>
        )}

        {step === 3 && (
          <GlassCard className="p-10">
            <div className="mb-8 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg"><Globe size={24} /></div>
              <h3 className="text-2xl font-bold">First Business Profile</h3>
            </div>
            <form onSubmit={handleFinishOnboarding} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <input type="text" placeholder="Business Name" required value={siteName} onChange={e => setSiteName(e.target.value)} className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500" />
                <input type="url" placeholder="Website URL" required value={siteUrl} onChange={e => setSiteUrl(e.target.value)} className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500" />
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">SEO IDs</span>
                  <input type="text" placeholder="GA4 ID" value={ga4Id} onChange={e => setGa4Id(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                  <input type="text" placeholder="GSC URL" value={gscUrl} onChange={e => setGscUrl(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Performance</span>
                  <input type="text" placeholder="G-Ads ID" value={googleAdsId} onChange={e => setGoogleAdsId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                  <input type="text" placeholder="Meta Ads ID" value={metaAdsId} onChange={e => setMetaAdsId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Social</span>
                  <input type="text" placeholder="FB Page ID" value={fbPageId} onChange={e => setFbPageId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                  <input type="text" placeholder="IG Bus ID" value={igBusId} onChange={e => setIgBusId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(2)} className="px-8 py-4 border border-white/10 rounded-xl font-bold hover:bg-white/5">Back</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-xl font-bold shadow-lg disabled:opacity-50">{isSubmitting ? "Initializing Neural Link..." : "Deploy Workspace"}</button>
              </div>
            </form>
          </GlassCard>
        )}
      </div>
    </div>
  );
}