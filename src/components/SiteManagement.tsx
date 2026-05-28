import React, { useState, useEffect } from "react";
import { UserProfile, SiteProfile, UserCredentials } from "../types";
import { Globe, Trash, Edit, Plus, ArrowLeft, ExternalLink, LogOut, Key, CheckCircle2, ShieldCheck, BarChart3, Facebook, Instagram, Settings, X, Building2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "motion/react";

interface SiteManagementProps {
  user: UserProfile;
  sites: SiteProfile[];
  sharedCreds: UserCredentials;
  onRefresh: () => void;
  onClose: () => void;
  onLogout: () => void;
}

export default function SiteManagement({
  user,
  sites,
  sharedCreds,
  onRefresh,
  onClose,
  onLogout,
}: SiteManagementProps) {
  const STORAGE_KEY = `bnb_site_mgmt_state_${user.id}`;

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

  const [isAddingNew, setIsAddingNew] = useState(() => getSavedState('isAddingNew', false));
  const [editingSiteId, setEditingSiteId] = useState<string | null>(() => getSavedState('editingSiteId', null));
  const [activeSettingsModal, setActiveSettingsModal] = useState<'google' | 'meta' | 'dev_token' | 'all' | null>(() => getSavedState('activeSettingsModal', null));
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, string[]>>({});

  // Core Site Form states
  const [name, setName] = useState(() => getSavedState('name', ""));
  const [url, setUrl] = useState(() => getSavedState('url', ""));
  const [industry, setIndustry] = useState(() => getSavedState('industry', "Travel & Leisure"));

  // Credentials Form State
  const [googleAdsDevToken, setGoogleAdsDevToken] = useState(() => getSavedState('googleAdsDevToken', sharedCreds.googleAdsDeveloperToken || ""));
  const [metaToken, setMetaToken] = useState(() => getSavedState('metaToken', sharedCreds.metaLongLivedToken || ""));

  const [ga4Id, setGa4Id] = useState(() => getSavedState('ga4Id', ""));
  const [gscUrl, setGscUrl] = useState(() => getSavedState('gscUrl', ""));
  const [googleAdsId, setGoogleAdsId] = useState(() => getSavedState('googleAdsId', ""));
  const [metaAdsId, setMetaAdsId] = useState(() => getSavedState('metaAdsId', ""));
  const [fbPageId, setFbPageId] = useState(() => getSavedState('fbPageId', ""));
  const [igBusId, setIgBusId] = useState(() => getSavedState('igBusId', ""));

  // Persist state
  useEffect(() => {
    const state = {
      isAddingNew, editingSiteId, activeSettingsModal, name, url, industry,
      googleAdsDevToken, metaToken, ga4Id, gscUrl, googleAdsId,
      metaAdsId, fbPageId, igBusId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isAddingNew, editingSiteId, activeSettingsModal, name, url, industry, googleAdsDevToken, metaToken, ga4Id, gscUrl, googleAdsId, metaAdsId, fbPageId, igBusId, STORAGE_KEY]);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase.from("site_credentials").select("site_id, platform");
      const mapping: Record<string, string[]> = {};
      data?.forEach(row => {
        if (!mapping[row.site_id]) mapping[row.site_id] = [];
        mapping[row.site_id].push(row.platform);
      });
      setConnectedPlatforms(mapping);
    };
    fetchStatus();
  }, [sites]);

  const resetFormState = () => {
    setName(""); setUrl(""); setIndustry("Travel & Leisure");
    setGa4Id(""); setGscUrl(""); setGoogleAdsId("");
    setMetaAdsId(""); setFbPageId(""); setIgBusId("");
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAgencySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSettingsModal(null);
    localStorage.removeItem(STORAGE_KEY);
    onRefresh();
    try {
      if (googleAdsDevToken) {
        await supabase.from("user_credentials").upsert({
          user_id: user.id,
          platform: "google_developer_token",
          credentials: { developer_token: googleAdsDevToken }
        });
      }
      if (metaToken) {
        await supabase.from("user_credentials").upsert({
          user_id: user.id,
          platform: "meta_long_lived_token",
          credentials: { token: metaToken }
        });
      }
    } catch (err: any) {
      console.error("[SiteManagement] Agency settings save failed", err);
      alert("Settings Error: " + (err?.message || "Unknown error"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        url: url.trim(),
        industry,
        seo_settings: {
          ga4Id: ga4Id.trim(),
          gscUrl: gscUrl.trim(),
          googleAdsId: googleAdsId.trim(),
          metaAdsId: metaAdsId.trim(),
          fbPageId: fbPageId.trim(),
          igBusId: igBusId.trim(),
        }
      };

      setIsAddingNew(false);
      setEditingSiteId(null);
      resetFormState();
      localStorage.removeItem(STORAGE_KEY);
      onRefresh();

      void (async () => {
        const siteResp = editingSiteId
          ? await supabase.from("sites").update(payload).eq("id", editingSiteId).select().single()
          : await supabase.from("sites").insert({ user_id: user.id, ...payload }).select().single();

        if (siteResp.error) throw siteResp.error;
        const siteId = siteResp.data.id;

        const perSiteCreds = [
          { platform: "ga4", data: { property_id: ga4Id.trim() } },
          { platform: "google_search_console", data: { site_url: gscUrl.trim() } },
          { platform: "google_ads", data: { customer_id: googleAdsId.trim() } },
          { platform: "meta_ads", data: { ad_account_id: metaAdsId.trim() } },
          { platform: "meta_business_suite", data: { page_id: fbPageId.trim() } },
          { platform: "instagram", data: { instagram_business_id: igBusId.trim() } },
        ];

        for (const cred of perSiteCreds) {
          if (Object.values(cred.data).some(v => v)) {
              const upsertRes = await supabase.from("site_credentials").upsert({
                site_id: siteId,
                platform: cred.platform,
                credentials: cred.data,
              }, { onConflict: 'site_platform_unique' });
              if (upsertRes.error) throw upsertRes.error;
          }
        }
      })();
    } catch (err: any) {
      console.error("[SiteManagement] Site save failed", err);
      alert("Error saving site: " + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = async (site: SiteProfile) => {
    setEditingSiteId(site.id);
    setName(site.name);
    setUrl(site.url);
    setIndustry(site.industry);
    const seo = site.seoSettings;
    if (seo) {
      setGa4Id(seo.ga4Id || "");
      setGscUrl(seo.gscUrl || "");
      setGoogleAdsId(seo.googleAdsId || "");
      setMetaAdsId(seo.metaAdsId || "");
      setFbPageId(seo.fbPageId || "");
      setIgBusId(seo.igBusId || "");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 font-sans relative">
      <div className="flex items-center justify-between border-b border-[#e2dec9] pb-6 mb-8">
        <button onClick={onClose} className="inline-flex items-center space-x-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSettingsModal('all')} className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold hover:bg-stone-50 transition-colors">
            <Settings className="h-3.5 w-3.5" />
            <span>Agency Settings</span>
          </button>
          <button onClick={onLogout} className="text-xs font-mono font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200">Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 bg-white border border-[#e8e4db] rounded-3xl p-6 h-fit shadow-sm">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 bg-neutral-900 rounded-xl flex items-center justify-center font-display text-amber-100 font-bold text-lg">{user.name ? user.name.charAt(0) : "U"}</div>
            <div>
              <h4 className="font-display font-bold text-neutral-900 text-sm">{user.name}</h4>
              <p className="text-[10px] text-neutral-500 font-mono truncate">{user.email}</p>
            </div>
          </div>
          <div className="space-y-4 pt-6 border-t border-stone-100 text-xs">
            <div><span className="text-[9px] font-mono font-bold text-stone-400 block uppercase mb-1">Agency</span><p className="font-bold text-neutral-800">{user.agencyName}</p></div>
            <div><span className="text-[9px] font-mono font-bold text-stone-400 block uppercase mb-1">Role</span><p className="font-bold text-neutral-800">{user.role}</p></div>
            <div className="pt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase ${sharedCreds.googleOAuth ? 'text-emerald-600' : 'text-stone-300'}`}>
                  <CheckCircle2 className="h-3 w-3" /> Google Account Linked
                </div>
                <button
                  onClick={async () => {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/url?user_id=${user.id}`);
                    const { url } = await response.json();
                    window.location.href = url;
                  }}
                  className="w-full py-1 border border-stone-200 rounded-lg text-[9px] font-bold text-stone-500 hover:bg-stone-50 hover:text-neutral-900 transition-all flex items-center justify-center gap-1"
                >
                  <Globe className="h-2.5 w-2.5" /> Reconnect Google
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase ${sharedCreds.metaLongLivedToken ? 'text-blue-600' : 'text-stone-300'}`}>
                  <CheckCircle2 className="h-3 w-3" /> Meta Token Linked
                </div>
                <button onClick={() => setActiveSettingsModal('meta')} className="w-full py-1 border border-stone-200 rounded-lg text-[9px] font-bold text-stone-500 hover:bg-stone-50 hover:text-neutral-900 transition-all flex items-center justify-center gap-1"><Edit className="h-2.5 w-2.5" /> Update Meta Token</button>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase ${sharedCreds.googleAdsDeveloperToken ? 'text-amber-600' : 'text-stone-300'}`}>
                  <CheckCircle2 className="h-3 w-3" /> Ads Dev Token Linked
                </div>
                <button onClick={() => setActiveSettingsModal('dev_token')} className="w-full py-1 border border-stone-200 rounded-lg text-[9px] font-bold text-stone-500 hover:bg-stone-50 hover:text-neutral-900 transition-all flex items-center justify-center gap-1"><Edit className="h-2.5 w-2.5" /> Update Dev Token</button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-2xl text-neutral-900">Workspace Sites</h3>
            {!isAddingNew && !editingSiteId && (
              <button onClick={() => setIsAddingNew(true)} className="px-4 py-2 bg-neutral-950 text-amber-50 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-neutral-800 transition-all"><Plus className="h-4 w-4" /><span>Add Site</span></button>
            )}
          </div>

          {(isAddingNew || editingSiteId) && (
            <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border-2 border-amber-100 rounded-3xl p-8 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-stone-100">
                  <div className="sm:col-span-2"><label className="text-[10px] font-mono font-bold text-neutral-500 uppercase block mb-1.5">Site Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none" /></div>
                  <div><label className="text-[10px] font-mono font-bold text-neutral-500 uppercase block mb-1.5">Website URL</label><input type="url" required value={url} onChange={e => setUrl(e.target.value)} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none" /></div>
                  <div><label className="text-[10px] font-mono font-bold text-neutral-500 uppercase block mb-1.5">Industry</label><select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none"><option value="Travel & Leisure">Travel & Leisure</option><option value="E-Commerce">E-Commerce</option></select></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3"><div className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-1 rounded w-fit">SEO IDs</div><input type="text" placeholder="GA4 ID" value={ga4Id} onChange={e => setGa4Id(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono" /><input type="text" placeholder="GSC URL" value={gscUrl} onChange={e => setGscUrl(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono" /></div>
                  <div className="space-y-3"><div className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-1 rounded w-fit">Performance IDs</div><input type="text" placeholder="Ads ID" value={googleAdsId} onChange={e => setGoogleAdsId(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono" /><input type="text" placeholder="Meta ID" value={metaAdsId} onChange={e => setMetaAdsId(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono" /></div>
                  <div className="space-y-3"><div className="text-[10px] font-bold text-purple-700 uppercase bg-purple-50 px-2 py-1 rounded w-fit">Social IDs</div><input type="text" placeholder="FB ID" value={fbPageId} onChange={e => setFbPageId(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono" /><input type="text" placeholder="IG ID" value={igBusId} onChange={e => setIgBusId(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono" /></div>
                </div>
                <div className="flex gap-3 justify-end pt-4"><button type="button" onClick={() => { setIsAddingNew(false); setEditingSiteId(null); }} className="px-6 py-2 border border-stone-300 rounded-xl font-bold text-sm">Cancel</button><button type="submit" disabled={isSaving} className="px-8 py-2 bg-neutral-900 text-amber-50 rounded-xl font-bold text-sm shadow-lg">{isSaving ? "Saving..." : "Save Site"}</button></div>
              </form>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {sites.map((site) => (
              <div key={site.id} className="bg-white border border-[#e8e4db] hover:border-neutral-900 rounded-2xl p-6 shadow-sm flex justify-between items-center group">
                <div>
                  <div className="flex items-center space-x-3"><h5 className="font-display font-bold text-neutral-900">{site.name}</h5><span className="text-[8px] font-mono font-bold text-neutral-500 bg-stone-100 px-2 py-0.5 rounded uppercase">{site.industry}</span></div>
                  <div className="flex flex-wrap gap-1 mt-1">{connectedPlatforms[site.id]?.map(p => <div key={p} className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase border border-emerald-100">{p}</div>)}</div>
                </div>
                <div className="flex items-center space-x-2"><button onClick={() => startEdit(site)} className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50"><Edit className="h-3.5 w-3.5" /></button></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveSettingsModal(null)} className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div><h3 className="text-xl font-bold">Agency Credentials</h3><p className="text-xs text-neutral-500">Shared across workspace.</p></div>
                <button onClick={() => setActiveSettingsModal(null)} className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-stone-200"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSaveAgencySettings} className="p-8 space-y-6">
                {(activeSettingsModal === 'all' || activeSettingsModal === 'google') && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">Google Authentication</label>
                    <button type="button" onClick={async () => {
                      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/url?user_id=${user.id}`);
                      const { url } = await res.json();
                      window.location.href = url;
                    }} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Globe className="h-4 w-4" /> Connect Google Account</button>
                    <p className="text-[9px] text-neutral-500">Links Analytics, Search Console, & Ads via OAuth.</p>
                  </div>
                )}
                {(activeSettingsModal === 'all' || activeSettingsModal === 'meta') && (
                  <div className="space-y-2"><label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">Meta Token</label><input type="password" value={metaToken} onChange={e => setMetaToken(e.target.value)} className="w-full px-4 py-3 bg-[#FAF9F5] border border-stone-200 rounded-xl text-xs outline-none" /></div>
                )}
                {(activeSettingsModal === 'all' || activeSettingsModal === 'dev_token') && (
                  <div className="space-y-2"><label className="text-[10px] font-mono font-bold text-neutral-400 uppercase">Ads Dev Token</label><input type="text" value={googleAdsDevToken} onChange={e => setGoogleAdsDevToken(e.target.value)} className="w-full px-4 py-3 bg-[#FAF9F5] border border-stone-200 rounded-xl text-xs outline-none" /></div>
                )}
                <button type="submit" className="w-full py-4 bg-neutral-900 text-amber-50 rounded-xl font-bold shadow-lg">Update Credentials</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
