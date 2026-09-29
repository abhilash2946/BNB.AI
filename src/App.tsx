import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./lib/supabaseClient";
import { auth } from "./lib/auth";
import { UserProfile, SiteProfile, UserCredentials } from "./types";
import LandingPage from "./components/LandingPage";
import SiteManagement from "./components/SiteManagement";
import CommandCenter from "./components/CommandCenter";
import { Toaster, toast } from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import { useTheme } from "./contexts/ThemeContext";

type ViewState = "landing" | "dashboard" | "site_management";

export default function App() {
  const { theme } = useTheme();
  const [view, setView] = useState<ViewState>(() => {
    const path = window.location.pathname;
    if (path === "/site-management") return "site_management";
    if (path === "/dashboard") return "dashboard";
    const saved = localStorage.getItem('bnb_app_view') as ViewState;
    return saved || "landing";
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Synchronizing secure session...");
  const [authError, setAuthError] = useState<string | null>(null);
  const [sharedMode, setSharedMode] = useState(false);
  const [sharedConfig, setSharedConfig] = useState<any>(null);

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('bnb_user_profile');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionUserMetadata, setSessionUserMetadata] = useState<any>(null);

  const [sites, setSites] = useState<SiteProfile[]>(() => {
    const saved = localStorage.getItem('bnb_sites');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const [activeSite, setActiveSite] = useState<SiteProfile | null>(null);

  const [sharedCreds, setSharedCreds] = useState<UserCredentials>(() => {
    const saved = localStorage.getItem('bnb_shared_creds');
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
      if (path === "/site-management") setView("site_management");
      else if (path === "/dashboard") setView("dashboard");
      else setView("landing");
    };
    window.addEventListener("popstate", handlePopState);

    // Check for success/error parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    if (success) {
      toast.success("Authentication successful!");
    }
    if (error) {
      toast.error(`Authentication failed: ${error}`);
    }

    return () => {
      window.removeEventListener("unhandledrejection", handleError);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const urlParams = new URLSearchParams(window.location.search);
      const isComingFromOAuth = urlParams.has('success') || urlParams.has('error');

      // Capture OAuth result in a persistent way so it's not lost when URL is cleaned
      if (isComingFromOAuth) {
        localStorage.setItem('bnb_last_oauth_sync', Date.now().toString());
      }

      const recentlySynced = localStorage.getItem('bnb_last_oauth_sync');
      const isRecentlySynced = recentlySynced && (Date.now() - parseInt(recentlySynced) < 10000); // 10 second window

      if (view !== "landing" && !user && !isComingFromOAuth && !isRecentlySynced) {
        setView("landing");
        return;
      }

      if (isComingFromOAuth || isRecentlySynced) {
        if (user && view !== "site_management") {
          setView("site_management");
        } else if (!user && view !== "landing") {
          setView("landing");
        }
      }

      localStorage.setItem('bnb_app_view', view);
      const currentPath = window.location.pathname;
      let targetPath = "/";
      if (view === "dashboard") targetPath = "/dashboard";
      else if (view === "site_management") targetPath = "/site-management";

      // CRITICAL: Preserve shared report path to prevent breaking refresh/bookmarking
      if (currentPath.startsWith('/shared/')) {
        targetPath = currentPath;
      }

      if (currentPath !== targetPath) {
        window.history.replaceState({}, "", targetPath);
      }
    }
  }, [view, isLoading, user, sharedMode]);

  useEffect(() => {
    if (activeSite?.id) {
      localStorage.setItem('bnb_active_site_id', activeSite.id);
      localStorage.setItem('bnb_active_site', JSON.stringify(activeSite));
    }
  }, [activeSite]);

  useEffect(() => {
    let mounted = true;

    const checkSharedLink = async () => {
      const path = window.location.pathname;
      if (path.startsWith('/shared/')) {
        const shareId = path.split('/')[2];
        if (shareId) {
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/shared-report-info/${shareId}`);

            if (res.ok && mounted) {
              const { share, site } = await res.json();
              if (share && site) {
                const siteId = site.id || share.site_id;
                console.log("[App] Shared Mode: Initializing with site", siteId);

                const mappedSite = {
                  id: siteId,
                  name: site.name,
                  url: site.url || "",
                  industry: site.industry || "",
                  city: site.city || undefined,
                  imageUrl: site.image_url || undefined,
                  phone: site.phone || undefined,
                  email: site.email || undefined,
                  seoSettings: site.seo_settings || undefined,
                  status: site.status || 'active',
                };

                setActiveSite(mappedSite);
                setSites([mappedSite]);
                setSharedMode(true);
                setSharedConfig(share);

                setUser({
                  id: 'guest_' + share.id,
                  name: 'Client Guest',
                  agencyName: 'Black and Bold',
                  email: '',
                  role: 'Guest',
                  tier: 'Standard'
                });

                setView("dashboard");
                setIsLoading(false);
                return true;
              }
            }
          } catch (err) {
            console.error("Shared link check failed:", err);
          }
        }
      }
      return false;
    };

    const checkInitialSession = async () => {
      try {
        const isShared = await checkSharedLink();
        if (isShared) {
          console.log("[App] Shared Report detected, skipping initial session check");
          setIsLoading(false);
          return;
        }

        // Check if returning from App OAuth callback redirect with ?token=...
        const urlParams = new URLSearchParams(window.location.search);
        const tokenParam = urlParams.get('token');
        if (tokenParam) {
          auth.setToken(tokenParam);
          // Clean token parameter from browser URL bar
          urlParams.delete('token');
          const newSearch = urlParams.toString();
          const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
          window.history.replaceState({}, document.title, newUrl);
        }

        const token = auth.getToken();
        if (mounted && token) {
          setIsSyncing(true);
          const currentUser = await auth.fetchCurrentUser();
          if (currentUser) {
            setSessionUserId(currentUser.id);
            const userProfile: UserProfile = {
              id: currentUser.id,
              name: currentUser.name || "User",
              agencyName: currentUser.agency_name || "Enterprise Workspace",
              email: currentUser.email || "",
              role: currentUser.role || "Member",
              tier: currentUser.tier || "Standard",
              avatarUrl: currentUser.avatar_url
            };
            setUser(userProfile);
            void fetchProfileData(currentUser.id);
          } else {
            auth.clearToken();
            setUser(null);
            setIsLoading(false);
          }
        } else if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("checkInitialSession error:", err);
        if (mounted) setIsLoading(false);
      }
    };
    checkInitialSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function fetchProfileData(userId: string, authUserFromSession?: any, force = false) {
    // Prevent overriding Guest session in Shared Mode
    if (window.location.pathname.startsWith('/shared/')) {
       console.log("[App] Blocking profile fetch in Shared Mode");
       return;
    }

    if (!force && lastFetchedUserIdRef.current === userId) return;
    if (isFetchingRef.current) return;

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
    }, 30000);

    try {
      const getProfile = async (): Promise<any> => {
        const token = auth.getToken();
        if (!token) throw new Error("No token available");

        const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Backend profile fetch failed: ${response.status}`);
        }
        return response.json();
      };

      const activeProfile = await getProfile();

      const userData: UserProfile = {
        id: userId,
        name: activeProfile.name || authUserFromSession?.name || "User",
        agencyName: activeProfile.agency_name || "Enterprise Workspace",
        email: activeProfile.email || authUserFromSession?.email || "",
        role: activeProfile.role || "Member",
        avatarUrl: activeProfile.avatar_url || undefined,
        tier: (activeProfile.tier as any) || "Standard"
      };

      setUser(userData);
      localStorage.setItem('bnb_user_profile', JSON.stringify(userData));
      setIsLoading(false);

      setView(current => {
        const protectedViews: ViewState[] = ["dashboard", "site_management"];
        if (protectedViews.includes(current)) return current;
        const savedView = localStorage.getItem('bnb_app_view') as ViewState;
        return (savedView && protectedViews.includes(savedView as ViewState)) ? (savedView as ViewState) : "dashboard";
      });

      // 2. Background fetch sites & credentials
      void (async () => {
        const startTime = Date.now();
        try {
          const token = auth.getToken();
          if (!token) return;

          const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
          const [credsRes, sitesRes] = await Promise.all([
            fetch(`${import.meta.env.VITE_API_URL || "/api"}/user-credentials`, { headers }),
            fetch(`${import.meta.env.VITE_API_URL || "/api"}/sites`, { headers })
          ]);

          const credsData = await credsRes.json().catch(() => ({}));
          const sitesData = await sitesRes.json().catch(() => []);

          if (Array.isArray(credsData)) {
            const creds: UserCredentials = {};
            credsData.forEach((c: any) => {
              if (!c) return;
              if (c.platform === 'google_oauth') creds.googleOAuth = c.credentials;
              if (c.platform === 'google_developer_token') creds.googleAdsDeveloperToken = c.credentials.developer_token;
              if (c.platform === 'meta_long_lived_token') {
                creds.metaLongLivedToken = c.credentials.token;
                creds.metaTokenExpiry = c.credentials.expires_at;
              }
              if (c.platform === 'meta_app_creds') creds.metaAppCreds = c.credentials;
            });
            setSharedCreds(creds);
            localStorage.setItem('bnb_shared_creds', JSON.stringify(creds));
          }

          if (Array.isArray(sitesData)) {
            const mappedSites = sitesData
              .filter((s: any) => s && s.id)
              .map((s: any) => ({
                id: s.id,
                name: s.name,
                url: s.url,
                industry: s.industry,
                city: s.city || undefined,
                imageUrl: s.image_url || undefined,
                phone: s.phone || undefined,
                email: s.email || undefined,
                seoSettings: s.seo_settings || undefined,
                status: s.status || 'active',
              }));
            setSites(mappedSites);
            localStorage.setItem('bnb_sites', JSON.stringify(mappedSites));

            if (!sharedMode) {
              setActiveSite(null);
            }
          }

          const elapsed = Date.now() - startTime;
          if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));
        } catch (bgErr) {
          console.error("[fetchProfileData] Background sync failed:", bgErr);
        } finally {
          setIsSyncing(false);
        }
      })();

    } catch (err: any) {
      console.error("[fetchProfileData] Fatal error:", err);
      const msg = err.message || "Backend fetch failed";
      toast.error(msg);

      setIsLoading(false);
      setIsSyncing(false);

      if (msg.includes("401")) {
        setAuthError("Session expired. Please log in again.");
        setView("landing");
      } else {
        setAuthError(msg);
      }
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
    const token = auth.getToken();
    if (token) {
      const currentUser = await auth.fetchCurrentUser();
      if (currentUser) {
        void fetchProfileData(currentUser.id, currentUser);
        return;
      }
    }
    setAuthError(null);
    try {
      auth.loginWithGoogle();
    } catch (err: any) {
      setAuthError(`OAuth Error: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    auth.logout();
    setUser(null);
    setSites([]);
    setActiveSite(null);
    sessionStorage.clear();
    setView("landing");
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#000000] flex flex-col items-center justify-center gap-6 text-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-white border-transparent rounded-full animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto text-white animate-pulse" size={28} />
        </div>
        <div>
          <p className="text-xs font-mono font-bold text-white uppercase tracking-widest animate-pulse">BNB.AI Neural Boot</p>
          <p className="text-[10px] text-white/70 mt-1 uppercase tracking-tighter">Establishing secure neural link</p>
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
        {view === "dashboard" && user && (
          <motion.div
            key={`dashboard-${activeSite?.id || 'none'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CommandCenter
              user={user}
              sites={sites}
              activeSite={activeSite}
              setActiveSite={setActiveSite}
              onOpenSiteManagement={() => setView("site_management")}
              onLogout={handleLogout}
              initialDates={{
                startDate: "",
                endDate: ""
              }}
              isSharedMode={sharedMode}
              sharedConfig={sharedConfig}
            />
          </motion.div>
        )}
        {view === "dashboard" && user && !activeSite && sites.length === 0 && (
          <motion.div key="dashboard-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex items-center justify-center px-6">
            {isSyncing ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-[#111111] border border-white/10 rounded-[2.5rem] shadow-2xl p-12 text-center flex flex-col items-center gap-8">
                <div className="relative h-20 w-20">
                  <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                  <motion.div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white">Searching for available sites</h3>
                  <p className="text-sm text-gray-400">We're scanning your workspace to connect your properties.</p>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-white" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1, ease: "linear" }} />
                </div>
                <p className="text-[10px] font-mono font-bold text-white uppercase tracking-widest animate-pulse">Live Workspace Scan</p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full bg-[#111111] border border-white/10 rounded-3xl shadow-sm p-10 text-center">
                <h2 className="text-2xl font-bold text-white mb-3">Workspace is ready</h2>
                <p className="text-sm text-gray-400 mb-8">No site has been added yet. Open Site Management to add your first site.</p>
                <button onClick={() => setView("site_management")} className="px-10 py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors">Go to Site Management</button>
              </motion.div>
            )}
          </motion.div>
        )}
        {view === "site_management" && (
          <motion.div key="site_management" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            {user ? (
              <SiteManagement user={user} sites={sites} sharedCreds={sharedCreds} onRefresh={() => fetchProfileData(sessionUserId!, null, true)} onClose={() => setView("dashboard")} onLogout={handleLogout} />
            ) : (
              <div className="min-h-screen flex items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                 <span className="ml-3 text-white/70">Finalizing neural sync...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
