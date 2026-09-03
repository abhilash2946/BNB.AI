import React, { useState, useEffect } from "react";
import { UserProfile, SiteProfile, UserCredentials } from "../types";
import { Globe, Trash, Edit, Plus, ArrowLeft, ExternalLink, LogOut, Key, CheckCircle2, ShieldCheck, BarChart3, Facebook, Instagram, Settings, X, Building2, Sparkles, Camera } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface SiteManagementProps {
  user: UserProfile;
  sites: SiteProfile[];
  sharedCreds: UserCredentials;
  onRefresh: () => void;
  onClose: () => void;
  onLogout: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "/api";

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

  const [name, setName] = useState(() => getSavedState('name', ""));
  const [url, setUrl] = useState(() => getSavedState('url', ""));
  const [industry, setIndustry] = useState(() => getSavedState('industry', "Travel & Leisure"));
  const [city, setCity] = useState(() => getSavedState('city', ""));
  const [siteImageUrl, setSiteImageUrl] = useState<string | null>(() => getSavedState('siteImageUrl', null));
  const siteFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingSiteImage, setIsUploadingSiteImage] = useState(false);

  const [googleAdsDevToken, setGoogleAdsDevToken] = useState(() => getSavedState('googleAdsDevToken', sharedCreds.googleAdsDeveloperToken || ""));
  const [metaToken, setMetaToken] = useState(() => getSavedState('metaToken', sharedCreds.metaLongLivedToken || ""));
  const [metaTokenExpiry, setMetaTokenExpiry] = useState<string | null>(() => getSavedState('metaTokenExpiry', sharedCreds.metaTokenExpiry || null));

  const [ga4Id, setGa4Id] = useState(() => getSavedState('ga4Id', ""));
  const [gscUrl, setGscUrl] = useState(() => getSavedState('gscUrl', ""));
  const [googleAdsId, setGoogleAdsId] = useState(() => getSavedState('googleAdsId', ""));
  const [metaAdsId, setMetaAdsId] = useState(() => getSavedState('metaAdsId', ""));
  const [fbPageId, setFbPageId] = useState(() => getSavedState('fbPageId', ""));
  const [igBusId, setIgBusId] = useState(() => getSavedState('igBusId', ""));

  // Agency Protocol Credentials
  const [googleClientId, setGoogleClientId] = useState(() => getSavedState('googleClientId', ""));
  const [googleClientSecret, setGoogleClientSecret] = useState(() => getSavedState('googleClientSecret', ""));
  const [metaAppId, setMetaAppId] = useState(() => getSavedState('metaAppId', ""));
  const [metaAppSecret, setMetaAppSecret] = useState(() => getSavedState('metaAppSecret', ""));

  useEffect(() => {
    if (sharedCreds.googleOAuth) {
      if (!googleClientId) setGoogleClientId(sharedCreds.googleOAuth.client_id || "");
      if (!googleClientSecret) setGoogleClientSecret(sharedCreds.googleOAuth.client_secret || "");
    }
    if (sharedCreds.metaAppCreds) {
      if (!metaAppId) setMetaAppId(sharedCreds.metaAppCreds.app_id || "");
      if (!metaAppSecret) setMetaAppSecret(sharedCreds.metaAppCreds.app_secret || "");
    }
    if (sharedCreds.googleAdsDeveloperToken && !googleAdsDevToken) {
      setGoogleAdsDevToken(sharedCreds.googleAdsDeveloperToken);
    }
    if (sharedCreds.metaLongLivedToken && !metaToken) {
      setMetaToken(sharedCreds.metaLongLivedToken);
      setMetaTokenExpiry(sharedCreds.metaTokenExpiry || null);
    }
  }, [sharedCreds]);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileAgencyName, setProfileAgencyName] = useState(user.agencyName);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const state = {
      isAddingNew, editingSiteId, activeSettingsModal, name, url, industry, city,
      googleAdsDevToken, metaToken, metaTokenExpiry, ga4Id, gscUrl, googleAdsId,
      metaAdsId, fbPageId, igBusId,
      googleClientId, googleClientSecret, metaAppId, metaAppSecret
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isAddingNew, editingSiteId, activeSettingsModal, name, url, industry, city, googleAdsDevToken, metaToken, metaTokenExpiry, ga4Id, gscUrl, googleAdsId, metaAdsId, fbPageId, igBusId, googleClientId, googleClientSecret, metaAppId, metaAppSecret, STORAGE_KEY]);

  const [isSaving, setIsSaving] = useState(false);

  // Health Detail Modal State
  const [healthDetail, setHealthDetail] = useState<{
    title: string;
    items: { label: string; status: 'ok' | 'missing'; id: string }[];
  } | null>(null);

  const getAgencyHealth = () => {
    const googleScopes = sharedCreds.googleOAuth?.granted_scopes || "";

    const googleItems = [
      { id: 'g_cid', label: 'Google Client ID', status: sharedCreds.googleOAuth?.client_id ? 'ok' : 'missing' as const },
      { id: 'g_cs', label: 'Google Client Secret', status: sharedCreds.googleOAuth?.client_secret ? 'ok' : 'missing' as const },
      { id: 'g_rt', label: 'Google Sync (Master Key)', status: sharedCreds.googleOAuth?.refresh_token ? 'ok' : 'missing' as const },
    ];

    // If Refresh Token exists, show detailed permissions
    if (sharedCreds.googleOAuth?.refresh_token) {
      googleItems.push(
        { id: 'g_sc_ga4', label: '↳ Permission: GA4 Analytics', status: googleScopes.includes('analytics') ? 'ok' : 'missing' as const },
        { id: 'g_sc_gsc', label: '↳ Permission: Search Console', status: googleScopes.includes('webmasters') ? 'ok' : 'missing' as const },
        { id: 'g_sc_ads', label: '↳ Permission: Google Ads', status: googleScopes.includes('adwords') ? 'ok' : 'missing' as const },
      );
    }

    googleItems.push({ id: 'g_dt', label: 'Google Ads Dev Token', status: sharedCreds.googleAdsDeveloperToken ? 'ok' : 'missing' as const });

    const metaItems = [
      { id: 'm_aid', label: 'Meta App ID', status: sharedCreds.metaAppCreds?.app_id ? 'ok' : 'missing' as const },
      { id: 'm_as', label: 'Meta App Secret', status: sharedCreds.metaAppCreds?.app_secret ? 'ok' : 'missing' as const },
      { id: 'm_lt', label: 'Meta Long-Lived Token', status: sharedCreds.metaLongLivedToken ? 'ok' : 'missing' as const },
    ];

    return {
      google: { items: googleItems, isOk: googleItems.every(i => i.status === 'ok') },
      meta: { items: metaItems, isOk: metaItems.every(i => i.status === 'ok') }
    };
  };

  const getSiteHealth = (site: SiteProfile) => {
    const seo = site.seoSettings || {};
    const items = [
      { id: 'ga4', label: 'GA4 Property ID', status: seo.ga4Id ? 'ok' : 'missing' as const },
      { id: 'gsc', label: 'Search Console URL', status: seo.gscUrl ? 'ok' : 'missing' as const },
      { id: 'gads', label: 'Google Ads ID', status: seo.googleAdsId ? 'ok' : 'missing' as const },
      { id: 'mads', label: 'Meta Ads ID', status: seo.metaAdsId ? 'ok' : 'missing' as const },
      { id: 'fb', label: 'FB Page ID', status: seo.fbPageId ? 'ok' : 'missing' as const },
      { id: 'ig', label: 'IG Business ID', status: seo.igBusId ? 'ok' : 'missing' as const },
    ];
    return { items, isOk: items.every(i => i.status === 'ok') };
  };

  const agencyHealth = getAgencyHealth();

  // New effect to handle success state from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      // Potentially refresh data or show a more prominent success UI
      onRefresh();
    }
  }, []);

  const resetFormState = () => {
    setName(""); setUrl(""); setIndustry("Travel & Leisure"); setCity(""); setSiteImageUrl(null);
    setGa4Id(""); setGscUrl(""); setGoogleAdsId(""); setMetaAdsId(""); setFbPageId(""); setIgBusId("");
  };

  const handleSaveAgencySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSettingsModal(null);
    try {
      const tasks: Promise<any>[] = [];

      // Save Google Protocol
      if (googleClientId || googleClientSecret) {
        tasks.push(supabase.from("user_credentials").upsert({
          user_id: user.id,
          platform: "google_oauth",
          credentials: {
            ...(sharedCreds.googleOAuth || {}),
            client_id: googleClientId.trim(),
            client_secret: googleClientSecret.trim(),
            redirect_uri: `${API_URL}/auth/google/callback`
          }
        }));
      }

      // Save Meta Protocol
      if (metaAppId || metaAppSecret) {
        tasks.push(supabase.from("user_credentials").upsert({
          user_id: user.id,
          platform: "meta_app_creds",
          credentials: {
            ...(sharedCreds.metaAppCreds || {}),
            app_id: metaAppId.trim(),
            app_secret: metaAppSecret.trim()
          }
        }));
      }

      if (googleAdsDevToken) tasks.push(supabase.from("user_credentials").upsert({ user_id: user.id, platform: "google_developer_token", credentials: { developer_token: googleAdsDevToken } }));
      if (metaToken) {
        if (metaToken !== sharedCreds.metaLongLivedToken) {
          tasks.push((async () => {
            const res = await fetch(`${API_URL}/auth/meta/exchange`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ short_token: metaToken, user_id: user.id }) });
            if (!res.ok) throw new Error(await res.text());
            const d = await res.json();
            setMetaTokenExpiry(d.expires_at);
          })());
        } else tasks.push(supabase.from("user_credentials").upsert({ user_id: user.id, platform: "meta_long_lived_token", credentials: { token: metaToken, expires_at: metaTokenExpiry } }));
      }
      await Promise.all(tasks);
      onRefresh();
    } catch (err: any) { alert("Settings Error: " + err.message); }
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
        city: city.trim(),
        image_url: siteImageUrl,
        seo_settings: {
          ga4Id: ga4Id.trim(),
          gscUrl: gscUrl.trim(),
          googleAdsId: googleAdsId.trim(),
          metaAdsId: metaAdsId.trim(),
          fbPageId: fbPageId.trim(),
          igBusId: igBusId.trim()
        }
      };
      const siteQuery = editingSiteId ? supabase.from("sites").update(payload).eq("id", editingSiteId).select() : supabase.from("sites").insert({ user_id: user.id, ...payload }).select();
      const siteResp = await siteQuery;
      if (siteResp.error) throw siteResp.error;
      const siteId = siteResp.data?.[0].id;
      const perSiteCreds = [{ platform: "ga4", data: { property_id: ga4Id.trim() } }, { platform: "google_search_console", data: { site_url: gscUrl.trim() } }, { platform: "google_ads", data: { customer_id: googleAdsId.trim() } }, { platform: "meta_ads", data: { ad_account_id: metaAdsId.trim() } }, { platform: "meta_business_suite", data: { page_id: fbPageId.trim() } }, { platform: "instagram", data: { instagram_business_id: igBusId.trim() } }];
      const credTasks = perSiteCreds.filter(c => Object.values(c.data).some(v => v)).map(c => supabase.from("site_credentials").upsert({ site_id: siteId, platform: c.platform, credentials: c.data }, { onConflict: 'site_id,platform' }));
      await Promise.all(credTasks);
      setIsAddingNew(false); setEditingSiteId(null); resetFormState();
      onRefresh();
    } catch (err: any) { alert("Error saving site: " + err.message); }
    finally { setIsSaving(false); }
  };

  const startEdit = async (site: SiteProfile) => {
    setEditingSiteId(site.id); setName(site.name); setUrl(site.url); setIndustry(site.industry);
    setCity(site.city || "");
    setSiteImageUrl(site.imageUrl || null);
    const seo = site.seoSettings;
    if (seo) { setGa4Id(seo.ga4Id || ""); setGscUrl(seo.gscUrl || ""); setGoogleAdsId(seo.googleAdsId || ""); setMetaAdsId(seo.metaAdsId || ""); setFbPageId(seo.fbPageId || ""); setIgBusId(seo.igBusId || ""); }
  };

  const handleUpdateProfile = async () => {
    if (!profileName.trim() || !profileAgencyName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profileName.trim(),
          agency_name: profileAgencyName.trim()
        })
        .eq("id", user.id);

      if (error) throw error;
      setIsEditingProfile(false);
      onRefresh();
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onRefresh();
    } catch (err: any) {
      alert("Error uploading image: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSiteImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSiteImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('site-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-images')
        .getPublicUrl(filePath);

      setSiteImageUrl(publicUrl);
    } catch (err: any) {
      alert("Error uploading site image: " + err.message);
    } finally {
      setIsUploadingSiteImage(false);
    }
  };

  // Verification loading state
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyGoogleToken = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`${API_URL}/auth/google/verify-token?user_id=${user.id}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const { toast } = await import('react-hot-toast');
      if (data.valid) {
        toast.success("Connection verified successfully!");

        // Update local state immediately so dots turn green without a reload
        if (sharedCreds.googleOAuth) {
          sharedCreds.googleOAuth.granted_scopes = data.scopes;
          localStorage.setItem('bnb_shared_creds', JSON.stringify(sharedCreds));
        }

        onRefresh();
      } else {
        toast.error(`Verification failed: ${data.error || "Token invalid"}`);
      }
    } catch (err: any) {
      alert("Verification Error: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"><ArrowLeft size={20}/></button>
            <h1 className="text-3xl font-bold tracking-tight">System Workspace</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveSettingsModal('all')} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center gap-2"><Settings size={18}/> Agency Settings</button>
            <button onClick={onLogout} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 font-bold">Logout</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative group/avatar">
                    <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden border border-white/10 text-black">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        profileName[0] || user.name[0]
                      )}

                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Sparkles className="animate-spin text-white" size={16} />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-[#0e1321] border border-white/10 rounded-lg text-gray-400 hover:text-white opacity-0 group-hover/avatar:opacity-100 transition-all shadow-xl"
                      title="Upload Photo"
                    >
                      <Camera size={10} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>

                  <div className="min-w-0">
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-white"
                        autoFocus
                      />
                    ) : (
                      <h3 className="font-bold truncate">{user.name}</h3>
                    )}
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                  >
                    <Edit size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-6 pt-6 border-t border-white/5">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Agency</span>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileAgencyName}
                      onChange={e => setProfileAgencyName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-white mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white">{user.agencyName}</p>
                  )}
                </div>

                {isEditingProfile && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={isSaving}
                      className="flex-1 py-2 bg-white text-black hover:bg-gray-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileName(user.name);
                        setProfileAgencyName(user.agencyName);
                      }}
                      className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {!isEditingProfile && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 group/h">
                      <button onClick={() => setActiveSettingsModal('google')} className="flex-1 text-left text-xs p-2 rounded-lg hover:bg-white/5 transition-all flex items-center gap-2 text-gray-400 hover:text-white"><Globe size={14}/> Google Protocol</button>
                      <button
                        onClick={() => setHealthDetail({ title: 'Google Protocol Status', items: agencyHealth.google.items })}
                        className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm cursor-help transition-transform hover:scale-125 ${agencyHealth.google.isOk ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-red-500/50'}`}
                      />
                    </div>
                    <div className="flex items-center gap-2 group/h">
                      <button onClick={() => setActiveSettingsModal('meta')} className="flex-1 text-left text-xs p-2 rounded-lg hover:bg-white/5 transition-all flex items-center gap-2 text-gray-400 hover:text-white"><Facebook size={14}/> Meta Protocol</button>
                      <button
                        onClick={() => setHealthDetail({ title: 'Meta Protocol Status', items: agencyHealth.meta.items })}
                        className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm cursor-help transition-transform hover:scale-125 ${agencyHealth.meta.isOk ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-red-500/50'}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </aside>

          <main className="lg:col-span-3 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white" /> Active Nodes</h2>
              {!isAddingNew && !editingSiteId && (
                <button onClick={() => setIsAddingNew(true)} className="px-6 py-2 bg-white text-black rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-all"><Plus size={18}/> Deploy New Node</button>
              )}
            </div>

            <AnimatePresence>
              {(isAddingNew || editingSiteId) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                  <GlassCard className="p-8 border-white/30">
                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="flex flex-col md:flex-row gap-8 pb-6 border-b border-white/5">
                        <div className="relative group/site-img shrink-0">
                          <div className="w-32 h-32 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover/site-img:border-white/50">
                            {siteImageUrl ? (
                              <img src={siteImageUrl} alt="Site Logo" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center space-y-1">
                                <Building2 className="mx-auto text-gray-600" size={32} />
                                <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">No Logo</p>
                              </div>
                            )}

                            {isUploadingSiteImage && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Sparkles className="animate-spin text-white" size={20} />
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => siteFileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 p-2 bg-white text-black hover:bg-gray-200 rounded-xl shadow-xl transition-all"
                            title="Upload Site Logo"
                          >
                            <Camera size={14} />
                          </button>
                          <input
                            type="file"
                            ref={siteFileInputRef}
                            onChange={handleSiteImageUpload}
                            className="hidden"
                            accept="image/*"
                          />
                        </div>

                        <div className="flex-1 grid md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Site Name</label>
                            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">URL</label>
                            <input type="url" required value={url} onChange={e => setUrl(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Industry</label>
                            <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white appearance-none">
                              <option value="Travel & Leisure" className="bg-[#111827]">Travel & Leisure</option>
                              <option value="E-Commerce" className="bg-[#111827]">E-Commerce</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">City (for competitor search)</label>
                            <input type="text" placeholder="e.g. Hyderabad" value={city} onChange={e => setCity(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white" />
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <span className="text-[10px] font-bold text-white tracking-widest uppercase">SEO IDs</span>
                          <input type="text" placeholder="GA4 ID" value={ga4Id} onChange={e => setGa4Id(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                          <input type="text" placeholder="GSC URL" value={gscUrl} onChange={e => setGscUrl(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                        </div>
                        <div className="space-y-4">
                          <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Performance</span>
                          <input type="text" placeholder="G-Ads ID" value={googleAdsId} onChange={e => setGoogleAdsId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                          <input type="text" placeholder="Meta Ads ID" value={metaAdsId} onChange={e => setMetaAdsId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                        </div>
                        <div className="space-y-4">
                          <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Social</span>
                          <input type="text" placeholder="FB Page ID" value={fbPageId} onChange={e => setFbPageId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                          <input type="text" placeholder="IG Bus ID" value={igBusId} onChange={e => setIgBusId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                        </div>
                      </div>

                      <div className="flex gap-4 justify-end pt-4">
                        <button type="button" onClick={() => { setIsAddingNew(false); setEditingSiteId(null); resetFormState(); }} className="px-6 py-3 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-8 py-3 bg-white text-black rounded-xl font-bold shadow-lg disabled:opacity-50">{isSaving ? "Saving..." : "Commit Changes"}</button>
                      </div>
                    </form>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-4">
              {sites.map(site => {
                const health = getSiteHealth(site);
                return (
                  <GlassCard key={site.id} className="p-6 flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 transition-all group-hover:border-cyan-500/30">
                        {site.imageUrl ? (
                          <img src={site.imageUrl} alt={site.name} className="w-full h-full object-cover" />
                        ) : (
                          <Globe size={20} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-bold">{site.name}</h4>
                          <p className="text-xs text-gray-500">{site.url}</p>
                        </div>
                        <button
                          onClick={() => setHealthDetail({ title: `${site.name} Connection Health`, items: health.items })}
                          className={`w-2 h-2 rounded-full cursor-help shadow-sm transition-transform hover:scale-125 ${health.isOk ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-red-500/50'}`}
                          title="View Connection Health"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(site)} className="p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"><Edit size={18}/></button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {activeSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveSettingsModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl">
              <GlassCard className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold">Agency Credentials</h3>
                  <button onClick={() => setActiveSettingsModal(null)} className="p-2 hover:bg-white/5 rounded-lg"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveAgencySettings} className="space-y-6">
                  {(activeSettingsModal === 'all' || activeSettingsModal === 'google') && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Google Client ID</label>
                        <input type="text" value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none" placeholder="Enter Client ID" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Google Client Secret</label>
                        <input type="password" value={googleClientSecret} onChange={e => setGoogleClientSecret(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none" placeholder="Enter Client Secret" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Google Ads Developer Token</label>
                        <input type="text" value={googleAdsDevToken} onChange={e => setGoogleAdsDevToken(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none" placeholder="Enter Developer Token" />
                      </div>
                      <button type="button" onClick={async () => { const res = await fetch(`${API_URL}/auth/google/url?user_id=${user.id}`); const { url } = await res.json(); window.location.href = url; }} className="w-full py-4 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/40 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"><Globe size={20} /> Sync Google Cloud</button>
                    </div>
                  )}
                  {(activeSettingsModal === 'all' || activeSettingsModal === 'meta') && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Meta App ID</label>
                        <input type="text" value={metaAppId} onChange={e => setMetaAppId(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none" placeholder="Enter App ID" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Meta App Secret</label>
                        <input type="password" value={metaAppSecret} onChange={e => setMetaAppSecret(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none" placeholder="Enter App Secret" />
                      </div>
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Meta Long-Lived Token</label>
                        <input type="password" value={metaToken} onChange={e => setMetaToken(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none" />
                      </div>
                      <button type="button" onClick={async () => {
                        const res = await fetch(`${API_URL}/auth/meta/url?user_id=${user.id}`);
                        if (!res.ok) {
                          alert(await res.text());
                          return;
                        }
                        const { url } = await res.json();
                        window.location.href = url;
                      }} className="w-full py-4 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/40 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"><Facebook size={20} /> Sync Meta Cloud</button>
                    </div>
                  )}
                  {(activeSettingsModal === 'all' || activeSettingsModal === 'dev_token') && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Google Ads Developer Token</label>
                      <input type="text" value={googleAdsDevToken} onChange={e => setGoogleAdsDevToken(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none" />
                    </div>
                  )}
                  <button type="submit" className="w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-200 transition-all mt-4">Update Neural Sync Keys</button>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {healthDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHealthDetail(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm">
              <GlassCard className="p-6 border-white/20 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">{healthDetail.title}</h3>
                    {healthDetail.title.includes('Google') && (
                      <button
                        onClick={handleVerifyGoogleToken}
                        disabled={isVerifying}
                        className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-cyan-400 ${isVerifying ? 'animate-spin' : ''}`}
                        title="Re-verify permissions"
                      >
                        <ExternalLink size={14} className={isVerifying ? 'opacity-50' : ''} />
                      </button>
                    )}
                  </div>
                  <button onClick={() => setHealthDetail(null)} className="p-1 hover:bg-white/5 rounded-lg"><X size={16}/></button>
                </div>
                <div className="space-y-4">
                  {healthDetail.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between group">
                      <span className="text-xs text-gray-300">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${item.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.status === 'ok' ? 'Active' : 'Missing'}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setHealthDetail(null)} className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5">Close Diagnostics</button>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}