import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "./lib/supabaseClient";
import { UserProfile, SiteProfile, UserCredentials } from "./types";
import LandingPage from "./components/LandingPage";
import Onboarding from "./components/Onboarding";
import SiteManagement from "./components/SiteManagement";
import MainDashboard from "./components/MainDashboard";

type ViewState = "landing" | "onboarding" | "dashboard" | "site_management";

export default function App() {
  const [view, setView] = useState<ViewState>(() => (localStorage.getItem('bnb_app_view') as ViewState) || "landing");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionUserMetadata, setSessionUserMetadata] = useState<any>(null);
  const [sites, setSites] = useState<SiteProfile[]>([]);
  const [activeSite, setActiveSite] = useState<SiteProfile | null>(null);
  const [sharedCreds, setSharedCreds] = useState<UserCredentials>({});
  const isFetchingRef = React.useRef(false);

  // Safety Timeout: If loading takes more than 8 seconds, force it to false
  // to avoid getting stuck on a blank screen if a network call hangs.
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(current => {
        if (current) {
          console.warn("Auth sync timed out after 8s. Forcing UI release.");
          return false;
        }
        return false;
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Persist View Changes
  useEffect(() => {
    if (view) localStorage.setItem('bnb_app_view', view);
  }, [view]);

  // Persist Active Site
  useEffect(() => {
    if (activeSite?.id) localStorage.setItem('bnb_active_site_id', activeSite.id);
  }, [activeSite]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session) {
          setSessionUserId(session.user.id);
          setSessionUserMetadata(session.user.user_metadata);
          await fetchProfileData(session.user.id, session.user);
        } else {
          setUser(null);
          setView("landing");
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) {
          setView("landing");
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        setSessionUserId(session.user.id);
        setSessionUserMetadata(session.user.user_metadata);
        await fetchProfileData(session.user.id, session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setSessionUserId(null);
        setSites([]);
        setActiveSite(null);
        setSharedCreds({});
        setView("landing");
        localStorage.removeItem('bnb_app_view');
        localStorage.removeItem('bnb_active_site_id');
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function fetchProfileData(userId: string, authUserFromSession?: any) {
    if (!userId || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const sessionEmail = authUserFromSession?.email || sessionUserMetadata?.email || "";

      let profileRes = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

      if (!profileRes.data && sessionEmail) {
        profileRes = await supabase.from("profiles").select("*").eq("email", sessionEmail).maybeSingle();
      }

      if (profileRes.error) console.error("Profile fetch error:", profileRes.error);

      const profile = profileRes.data;

      if (!profile) {
        setView("onboarding");
        setIsLoading(false);
        return;
      }

      const ownerId = profile.id || userId;

      // Run the remaining queries in parallel once the owning profile has been resolved.
      const [credsRes, sitesRes] = await Promise.all([
        supabase.from("user_credentials").select("*").eq("user_id", ownerId),
        supabase.from("sites").select("*").eq("user_id", ownerId)
      ]);

      const email = authUserFromSession?.email || sessionUserMetadata?.email || profile.email || sessionEmail || "";

      setUser({
        id: ownerId,
        name: profile.name || "",
        agencyName: profile.agency_name || "",
        email: email,
        role: profile.role || "",
        tier: profile.tier || "Standard"
      });

      const creds: UserCredentials = {};
      credsRes.data?.forEach(c => {
        if (c.platform === 'google_oauth') creds.googleOAuth = c.credentials;
        if (c.platform === 'google_developer_token') creds.googleAdsDeveloperToken = c.credentials.developer_token;
        if (c.platform === 'meta_long_lived_token') creds.metaLongLivedToken = c.credentials.token;
      });
      setSharedCreds(creds);

      const mappedSites: SiteProfile[] = (sitesRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        url: s.url,
        industry: s.industry,
        seoSettings: s.seo_settings || undefined,
      }));
      setSites(mappedSites);

      const lastSiteId = localStorage.getItem('bnb_active_site_id');
      const restoredSite = mappedSites.find(s => s.id === lastSiteId);
      setActiveSite(restoredSite || (mappedSites.length > 0 ? mappedSites[0] : null));

      const savedView = localStorage.getItem('bnb_app_view') as ViewState;
      const validViews: ViewState[] = ["landing", "onboarding", "dashboard", "site_management"];

      if (savedView && validViews.includes(savedView) && savedView !== "landing" && savedView !== "onboarding") {
        setView(savedView);
      } else {
        setView("dashboard");
      }
    } catch (err) {
      console.error("fetchProfileData error:", err);
      setView("dashboard");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }

  const handleLoginSuccess = () => supabase.auth.signInWithOAuth({ provider: "google" });
  const handleLogout = async () => { await supabase.auth.signOut(); setView("landing"); };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center gap-6">
        <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest animate-pulse">BNB.AI Enterprise Intelligence</p>
          <p className="text-[10px] text-neutral-300 mt-1 uppercase tracking-tighter">Synchronizing secure session...</p>
        </div>
      </div>
    );
  }

  // Fail-safe: if no user is loaded but we aren't loading, show landing page
  const activeView = (view === "landing" || (!user && view !== "onboarding")) ? "landing" : view;

  return (
    <div className="w-full min-h-screen bg-[#fcfbf9]">
      <AnimatePresence mode="wait">
        {activeView === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <LandingPage onStart={handleLoginSuccess} onLogin={handleLoginSuccess} />
          </motion.div>
        )}
        {activeView === "onboarding" && (
          <motion.div key="onboarding" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }}>
            <Onboarding
              userId={sessionUserId || ""}
              initialEmail={sessionUserMetadata?.email || ""}
              initialName={sessionUserMetadata?.full_name || ""}
              onComplete={() => {
                if (!sessionUserId) return;
                setUser({
                  id: sessionUserId,
                  name: sessionUserMetadata?.full_name || "",
                  agencyName: "",
                  email: sessionUserMetadata?.email || "",
                  role: "",
                  tier: "Standard",
                });
                setActiveSite(null);
                setSites([]);
                setSharedCreds({});
                setView("dashboard");
                setIsLoading(false);
                void fetchProfileData(sessionUserId);
              }}
              defaultSites={[]}
            />
          </motion.div>
        )}
        {activeView === "dashboard" && user && activeSite && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <MainDashboard
              user={user}
              sites={sites}
              activeSite={activeSite}
              setActiveSite={setActiveSite}
              onOpenSiteManagement={() => setView("site_management")}
              onLogout={handleLogout}
              initialDates={{
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              }}
            />
          </motion.div>
        )}
        {activeView === "dashboard" && user && !activeSite && (
          <motion.div key="dashboard-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="min-h-screen flex items-center justify-center px-6">
            <div className="max-w-lg w-full bg-white border border-stone-200 rounded-3xl shadow-sm p-8 text-center">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Workspace is ready</h2>
              <p className="text-sm text-neutral-600 mb-6">No site has been added yet. Open Site Management to add your first site and connect IDs.</p>
              <button onClick={() => setView("site_management")} className="px-6 py-3 bg-neutral-900 text-amber-50 rounded-xl font-bold text-sm">
                Go to Site Management
              </button>
            </div>
          </motion.div>
        )}
        {activeView === "site_management" && user && (
          <motion.div key="site_management" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
            <SiteManagement
              user={user}
              sites={sites}
              sharedCreds={sharedCreds}
              onRefresh={() => fetchProfileData(sessionUserId!)}
              onClose={() => setView("dashboard")}
              onLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
