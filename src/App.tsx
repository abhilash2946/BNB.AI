import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./lib/supabaseClient";
import { UserProfile, SiteProfile, UserCredentials } from "./types";
import LandingPage from "./components/LandingPage";
import Onboarding from "./components/Onboarding";
import SiteManagement from "./components/SiteManagement";
import CommandCenter from "./components/CommandCenter";
import { Toaster } from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import { useTheme } from "./contexts/ThemeContext";

type ViewState = "landing" | "onboarding" | "dashboard" | "site_management";

export default function App() {
  const { theme } = useTheme();
  const [view, setView] = useState<ViewState>(() => {
    const path = window.location.pathname;
    if (path === "/onboarding") return "onboarding";
    if (path === "/site-management") return "site_management";
    if (path === "/dashboard") return "dashboard";
    const saved = localStorage.getItem('bnb_app_view') as ViewState;
    return saved || "landing";
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Synchronizing secure session...");
  const [authError, setAuthError] = useState<string | null>(null);

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = sessionStorage.getItem('bnb_user_profile');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionUserMetadata, setSessionUserMetadata] = useState<any>(null);

  const [sites, setSites] = useState<SiteProfile[]>(() => {
    const saved = sessionStorage.getItem('bnb_sites');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const [activeSite, setActiveSite] = useState<SiteProfile | null>(() => {
    const saved = sessionStorage.getItem('bnb_active_site');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [sharedCreds, setSharedCreds] = useState<UserCredentials>(() => {
    const saved = sessionStorage.getItem('bnb_shared_creds');
    try { return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });

  const isFetchingRef = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleError = (e: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", e.reason);
    };
    window.addEventListener("unhandledrejection", handleError);

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/onboarding") setView("onboarding");
      else if (path === "/site-management") setView("site_management");
      else if (path === "/dashboard") setView("dashboard");
      else setView("landing");
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("unhandledrejection", handleError);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (view !== "landing" && view !== "onboarding" && !user) {
        setView("landing");
        return;
      }
      localStorage.setItem('bnb_app_view', view);
      const currentPath = window.location.pathname;
      let targetPath = "/";
      if (view === "onboarding") targetPath = "/onboarding";
      else if (view === "dashboard") targetPath = "/dashboard";
      else if (view === "site_management") targetPath = "/site-management";
      if (currentPath !== targetPath) {
        window.history.replaceState({}, "", targetPath);
      }
    }
  }, [view, isLoading, user]);

  useEffect(() => {
    if (activeSite?.id) {
      localStorage.setItem('bnb_active_site_id', activeSite.id);
      sessionStorage.setItem('bnb_active_site', JSON.stringify(activeSite));
    }
  }, [activeSite]);

  useEffect(() => {
    let mounted = true;

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session) {
          setSessionUserId(session.user.id);
          setSessionUserMetadata(session.user.user_metadata);
          setIsSyncing(true);

          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshed?.user) {
            await supabase.auth.signOut();
            setIsLoading(false);
            setView("landing");
            return;
          }

          setUser(prev => prev || {
            id: refreshed.user.id,
            name: refreshed.user.user_metadata?.full_name || "User",
            agencyName: "Loading...",
            email: refreshed.user.email || "",
            role: "Member",
            tier: "Standard"
          });

          void fetchProfileData(refreshed.user.id, refreshed.user);
        } else if (mounted && !session) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("checkInitialSession error:", err);
        if (mounted) setIsLoading(false);
      }
    };
    checkInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session) {
        const isNewSession = session.user.id !== sessionUserId;
        setSessionUserId(session.user.id);
        setSessionUserMetadata(session.user.user_metadata);
        if (isNewSession || !user) {
          setIsSyncing(true);
          setUser(prev => prev || {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || "User",
            agencyName: "Loading...",
            email: session.user.email || "",
            role: "Member",
            tier: "Standard"
          });
          void fetchProfileData(session.user.id, session.user);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setSessionUserId(null);
        setSites([]);
        setActiveSite(null);
        setSharedCreds({});
        sessionStorage.clear();
        setView("landing");
        localStorage.removeItem('bnb_app_view');
        localStorage.removeItem('bnb_active_site_id');
        setIsLoading(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function fetchProfileData(userId: string, authUserFromSession?: any, retryCount = 0) {
    // retryCount is currently unused – we use a simple loop with fixed delay inside.
    // Kept for potential future exponential backoff.
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 2000; // 2 seconds

    if (lastFetchedUserIdRef.current === userId && retryCount === 0) {
      console.log("Already fetching for this user, skipping");
      return;
    }
    if (isFetchingRef.current && retryCount === 0) return;

    isFetchingRef.current = true;
    lastFetchedUserIdRef.current = userId;
    setIsSyncing(true);

    const safetyTimeout = setTimeout(() => {
      if (isFetchingRef.current) {
        console.warn("fetchProfileData stuck, forcing reset");
        setIsLoading(false);
        setIsSyncing(false);
        isFetchingRef.current = false;
        lastFetchedUserIdRef.current = null;
      }
    }, 30000); // Increased to 30s

    try {
      const sessionEmail = authUserFromSession?.email || sessionUserMetadata?.email || "";

      // 1. Fetch profile with retry
      let profile;
      let profileError;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        profile = result.data;
        profileError = result.error;
        if (!profileError && profile) break;
        if (attempt < MAX_RETRIES) {
          console.log(`Profile fetch attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY}ms...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }
      if (profileError) throw new Error(`Profile fetch failed after ${MAX_RETRIES + 1} attempts: ${profileError.message}`);

      let activeProfile = profile;
      if (!activeProfile) {
        const email = authUserFromSession?.email || sessionUserMetadata?.email || sessionEmail || "";
        const { data: created, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            name: authUserFromSession?.user_metadata?.full_name || "User",
            agency_name: "My Agency",
            email: email,
            role: "Member",
            tier: "Standard"
          })
          .select()
          .single();
        if (createError) throw createError;
        activeProfile = created;
      }

      const userData: UserProfile = {
        id: userId,
        name: activeProfile?.name || authUserFromSession?.user_metadata?.full_name || "User",
        agencyName: activeProfile?.agency_name || "Enterprise Workspace",
        email: activeProfile?.email || authUserFromSession?.email || sessionEmail || "",
        role: activeProfile?.role || "Member",
        avatarUrl: activeProfile?.avatar_url || undefined,
        tier: (activeProfile?.tier as any) || "Standard"
      };

      setUser(userData);
      sessionStorage.setItem('bnb_user_profile', JSON.stringify(userData));
      setIsLoading(false); // Only now we stop the initial loading spinner

      setView(current => {
        const protectedViews: ViewState[] = ["dashboard", "site_management", "onboarding"];
        if (protectedViews.includes(current)) return current;
        const savedView = localStorage.getItem('bnb_app_view') as ViewState;
        return (savedView && protectedViews.includes(savedView as ViewState)) ? (savedView as ViewState) : "dashboard";
      });

      // 2. Background fetch sites & credentials
      void (async () => {
        const startTime = Date.now();
        try {
          const [credsRes, sitesRes] = await Promise.all([
            supabase.from("user_credentials").select("*").eq("user_id", userId),
            supabase.from("sites").select("*").eq("user_id", userId)
          ]);

          if (credsRes.data) {
            const creds: UserCredentials = {};
            credsRes.data.forEach((c: any) => {
              if (c.platform === 'google_oauth') creds.googleOAuth = c.credentials;
              if (c.platform === 'google_developer_token') creds.googleAdsDeveloperToken = c.credentials.developer_token;
              if (c.platform === 'meta_long_lived_token') {
                creds.metaLongLivedToken = c.credentials.token;
                creds.metaTokenExpiry = c.credentials.expires_at;
              }
            });
            setSharedCreds(creds);
            sessionStorage.setItem('bnb_shared_creds', JSON.stringify(creds));
          }

          let mappedSites: SiteProfile[] = [];
          if (sitesRes.data) {
            mappedSites = sitesRes.data.map((s: any) => ({
              id: s.id,
              name: s.name,
              url: s.url,
              industry: s.industry,
              city: s.city || undefined,
              imageUrl: s.image_url || undefined,
              seoSettings: s.seo_settings || undefined,
            }));
            setSites(mappedSites);
            sessionStorage.setItem('bnb_sites', JSON.stringify(mappedSites));

            let finalActive: SiteProfile | null = null;
            if (mappedSites.length > 0) {
              const lastSiteId = localStorage.getItem('bnb_active_site_id');
              const restoredSite = mappedSites.find(s => s.id === lastSiteId);
              finalActive = restoredSite || mappedSites[0];
              setActiveSite(finalActive);
              sessionStorage.setItem('bnb_active_site', JSON.stringify(finalActive));
              localStorage.setItem('bnb_active_site_id', finalActive.id);
            } else {
              // No sites → clear active site completely
              setActiveSite(null);
              sessionStorage.removeItem('bnb_active_site');
              localStorage.removeItem('bnb_active_site_id');
            }
          }

          // Minimum 2-second loading for UX (optional)
          const minLoadTime = 2000;
          const elapsed = Date.now() - startTime;
          if (elapsed < minLoadTime) {
            await new Promise(r => setTimeout(r, minLoadTime - elapsed));
          }

          console.log("[fetchProfileData] Background sync complete.");

        } catch (bgErr) {
          console.error("[fetchProfileData] Background sync failed:", bgErr);
        } finally {
          setIsSyncing(false);
        }
      })();

    } catch (err) {
      console.error("[fetchProfileData] Fatal error:", err);
      // If we are here after retries, show error state instead of empty workspace
      setIsLoading(false);
      setIsSyncing(false);
      setAuthError("Failed to load your profile. Please refresh the page or contact support.");
      setView("landing");
    } finally {
      clearTimeout(safetyTimeout);
      isFetchingRef.current = false;
      lastFetchedUserIdRef.current = null;
    }
  }


  const handleLoginSuccess = async () => {
    if (user) {
      const savedView = localStorage.getItem('bnb_app_view') as ViewState;
      setView(savedView && savedView !== "landing" ? savedView : "dashboard");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      void fetchProfileData(session.user.id, session.user);
      return;
    }
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { queryParams: { access_type: 'offline' }, redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(`OAuth Error: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSites([]);
    setActiveSite(null);
    sessionStorage.clear();
    setView("landing");
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-cyan-900/20 to-violet-900/20 bg-[#080B14] flex flex-col items-center justify-center gap-6 text-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-cyan-500 border-transparent rounded-full animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto text-cyan-400 animate-pulse" size={28} />
        </div>
        <div>
          <p className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest animate-pulse">BNB.AI Neural Boot</p>
          <p className="text-[10px] text-cyan-500/70 mt-1 uppercase tracking-tighter">Establishing secure neural link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }}
      />
      <AnimatePresence mode="wait">
        {view === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LandingPage onStart={handleLoginSuccess} onLogin={handleLoginSuccess} />
          </motion.div>
        )}
        {view === "onboarding" && (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Onboarding userId={sessionUserId || ""} initialEmail={sessionUserMetadata?.email || ""} initialName={sessionUserMetadata?.full_name || ""} onComplete={() => setView("dashboard")} defaultSites={[]} />
          </motion.div>
        )}
        {view === "dashboard" && user && activeSite && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CommandCenter
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
        {view === "dashboard" && user && !activeSite && (
          <motion.div key="dashboard-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex items-center justify-center px-6">
            {isSyncing ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-[#111827] border border-white/10 rounded-[2.5rem] shadow-2xl p-12 text-center flex flex-col items-center gap-8">
                <div className="relative h-20 w-20">
                  <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                  <motion.div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white">Searching for available sites</h3>
                  <p className="text-sm text-gray-400">We're scanning your workspace to connect your properties.</p>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-cyan-500" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1, ease: "linear" }} />
                </div>
                <p className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest animate-pulse">Live Workspace Scan</p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full bg-[#111827] border border-white/10 rounded-3xl shadow-sm p-10 text-center">
                <h2 className="text-2xl font-bold text-white mb-3">Workspace is ready</h2>
                <p className="text-sm text-gray-400 mb-8">No site has been added yet. Open Site Management to add your first site.</p>
                <button onClick={() => setView("site_management")} className="px-10 py-4 bg-cyan-600 text-white rounded-2xl font-bold text-sm hover:bg-cyan-500 transition-colors">Go to Site Management</button>
              </motion.div>
            )}
          </motion.div>
        )}
        {view === "site_management" && user && (
          <motion.div key="site_management" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <SiteManagement user={user} sites={sites} sharedCreds={sharedCreds} onRefresh={() => fetchProfileData(sessionUserId!)} onClose={() => setView("dashboard")} onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
