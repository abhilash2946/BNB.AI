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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileAgencyName, setProfileAgencyName] = useState(user.agencyName);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const state = { isAddingNew, editingSiteId, activeSettingsModal, name, url, industry, city, googleAdsDevToken, metaToken, metaTokenExpiry, ga4Id, gscUrl, googleAdsId, metaAdsId, fbPageId, igBusId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isAddingNew, editingSiteId, activeSettingsModal, name, url, industry, city, googleAdsDevToken, metaToken, metaTokenExpiry, ga4Id, gscUrl, googleAdsId, metaAdsId, fbPageId, igBusId, STORAGE_KEY]);

  const [isSaving, setIsSaving] = useState(false);

  const resetFormState = () => {
    setName(""); setUrl(""); setIndustry("Travel & Leisure"); setCity(""); setSiteImageUrl(null);
    setGa4Id(""); setGscUrl(""); setGoogleAdsId(""); setMetaAdsId(""); setFbPageId(""); setIgBusId("");
  };

  const handleSaveAgencySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSettingsModal(null);
    try {
      const tasks: Promise<any>[] = [];
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

  return (
    <div className="min-h-screen bg-[#080B14] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"><ArrowLeft size={20}/></button>
            <h1 className="text-3xl font-bold tracking-tight">System Workspace</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveSettingsModal('all')} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center gap-2"><Settings size={18}/> Agency Settings</button>
            <button onClick={onLogout} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 font-bold">Logout</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative group/avatar">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden border border-white/10">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        profileName[0] || user.name[0]
                      )}

                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Sparkles className="animate-spin text-cyan-400" size={16} />
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
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
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
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-cyan-500 mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-cyan-400">{user.agencyName}</p>
                  )}
                </div>

                {isEditingProfile && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={isSaving}
                      className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
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
                    <button onClick={() => setActiveSettingsModal('google')} className="w-full text-left text-xs p-2 rounded-lg hover:bg-white/5 transition-all flex items-center gap-2 text-gray-400 hover:text-white"><Globe size={14}/> Google Protocol</button>
                    <button onClick={() => setActiveSettingsModal('meta')} className="w-full text-left text-xs p-2 rounded-lg hover:bg-white/5 transition-all flex items-center gap-2 text-gray-400 hover:text-white"><Facebook size={14}/> Meta Protocol</button>
                  </div>
                )}
              </div>
            </GlassCard>
          </aside>

          <main className="lg:col-span-3 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500" /> Active Nodes</h2>
              {!isAddingNew && !editingSiteId && (
                <button onClick={() => setIsAddingNew(true)} className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-xl font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all"><Plus size={18}/> Deploy New Node</button>
              )}
            </div>

            <AnimatePresence>
              {(isAddingNew || editingSiteId) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                  <GlassCard className="p-8 border-cyan-500/30">
                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="flex flex-col md:flex-row gap-8 pb-6 border-b border-white/5">
                        <div className="relative group/site-img shrink-0">
                          <div className="w-32 h-32 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover/site-img:border-cyan-500/50">
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
                                <Sparkles className="animate-spin text-cyan-400" size={20} />
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => siteFileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-xl transition-all"
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
                            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">URL</label>
                            <input type="url" required value={url} onChange={e => setUrl(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Industry</label>
                            <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500 appearance-none">
                              <option value="Travel & Leisure" className="bg-[#111827]">Travel & Leisure</option>
                              <option value="E-Commerce" className="bg-[#111827]">E-Commerce</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">City (for competitor search)</label>
                            <input type="text" placeholder="e.g. Hyderabad" value={city} onChange={e => setCity(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500" />
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase">SEO IDs</span>
                          <input type="text" placeholder="GA4 ID" value={ga4Id} onChange={e => setGa4Id(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                          <input type="text" placeholder="GSC URL" value={gscUrl} onChange={e => setGscUrl(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                        </div>
                        <div className="space-y-4">
                          <span className="text-[10px] font-bold text-violet-400 tracking-widest uppercase">Performance</span>
                          <input type="text" placeholder="G-Ads ID" value={googleAdsId} onChange={e => setGoogleAdsId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                          <input type="text" placeholder="Meta Ads ID" value={metaAdsId} onChange={e => setMetaAdsId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                        </div>
                        <div className="space-y-4">
                          <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">Social</span>
                          <input type="text" placeholder="FB Page ID" value={fbPageId} onChange={e => setFbPageId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                          <input type="text" placeholder="IG Bus ID" value={igBusId} onChange={e => setIgBusId(e.target.value)} className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-lg text-xs" />
                        </div>
                      </div>

                      <div className="flex gap-4 justify-end pt-4">
                        <button type="button" onClick={() => { setIsAddingNew(false); setEditingSiteId(null); resetFormState(); }} className="px-6 py-3 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-xl font-bold shadow-lg disabled:opacity-50">{isSaving ? "Saving..." : "Commit Changes"}</button>
                      </div>
                    </form>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-4">
              {sites.map(site => (
                <GlassCard key={site.id} className="p-6 flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 transition-all group-hover:border-cyan-500/30">
                      {site.imageUrl ? (
                        <img src={site.imageUrl} alt={site.name} className="w-full h-full object-cover" />
                      ) : (
                        <Globe size={20} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                    <div><h4 className="font-bold">{site.name}</h4><p className="text-xs text-gray-500">{site.url}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(site)} className="p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"><Edit size={18}/></button>
                  </div>
                </GlassCard>
              ))}
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
                    <button type="button" onClick={async () => { const res = await fetch(`${API_URL}/auth/google/url?user_id=${user.id}`); const { url } = await res.json(); window.location.href = url; }} className="w-full py-4 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/40 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"><Globe size={20} /> Sync Google Cloud</button>
                  )}
                  {(activeSettingsModal === 'all' || activeSettingsModal === 'meta') && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Meta Long-Lived Token</label>
                      <input type="password" value={metaToken} onChange={e => setMetaToken(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none" />
                    </div>
                  )}
                  {(activeSettingsModal === 'all' || activeSettingsModal === 'dev_token') && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Google Ads Developer Token</label>
                      <input type="text" value={googleAdsDevToken} onChange={e => setGoogleAdsDevToken(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none" />
                    </div>
                  )}
                  <button type="submit" className="w-full py-4 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-2xl font-bold hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all mt-4">Update Neural Sync Keys</button>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}