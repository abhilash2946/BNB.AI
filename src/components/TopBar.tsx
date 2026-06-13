import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Sparkles,
  ChevronDown,
  Calendar,
  FileText,
  Sun,
  Moon,
  User,
  LogOut,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { DateRange, SiteInfo } from '../types';

interface TopBarProps {
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  sites: SiteInfo[];
  selectedSite: SiteInfo;
  onSelectSite: (site: SiteInfo) => void;
  dateRange: { start: string; end: string };
  onChangeDateRange: (range: { start: string; end: string }) => void;
  reportLoaded: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onExportPdf: () => void;
  darkTheme: boolean;
  onToggleTheme: () => void;
  onNavigateHome: () => void;
  onOpenSiteManagement: () => void;
  userEmail?: string;
  userName?: string;
  userAvatarUrl?: string;
  onLogout: () => void;
  isFullscreen?: boolean;
}

export default function TopBar({
  sidebarExpanded,
  onToggleSidebar,
  sites,
  selectedSite,
  onSelectSite,
  dateRange,
  onChangeDateRange,
  reportLoaded,
  isGenerating,
  onGenerate,
  onExportPdf,
  darkTheme,
  onToggleTheme,
  onNavigateHome,
  onOpenSiteManagement,
  userEmail,
  userName,
  userAvatarUrl,
  onLogout,
  isFullscreen = false
}: TopBarProps) {
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const siteRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (siteRef.current && !siteRef.current.contains(event.target as Node)) {
        setSiteDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeDateRange({ ...dateRange, start: e.target.value });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeDateRange({ ...dateRange, end: e.target.value });
  };

  return (
    <header className={`${isFullscreen ? 'hidden' : 'sticky'} top-0 z-50 h-[60px] w-full border-b border-white/10 bg-[rgba(17,24,39,0.5)] dark:bg-[rgba(17,24,39,0.5)] light:bg-[rgba(255,255,255,0.6)] backdrop-blur-md flex items-center justify-between px-4 transition-all`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg border border-[#00d4ff]/10 hover:border-[#00d4ff]/40 bg-white/5 text-white/80 hover:text-white transition-all group relative"
          title="Open / Close sidebar"
        >
          <Menu size={18} />
          <span className="absolute hidden group-hover:block top-12 left-2 bg-black border border-white/15 text-xs text-white p-1 rounded z-50 whitespace-nowrap">
            Open / Close sidebar
          </span>
        </button>

        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 focus:outline-none"
        >
          <div className="p-1 rounded-md bg-gradient-to-tr from-[#00d4ff] to-[#7c3aed] text-white">
            <Sparkles size={16} />
          </div>
          <span className="font-display font-bold text-lg tracking-wider bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] bg-clip-text text-transparent">
            BNB.AI
          </span>
        </button>

        <div className="h-5 w-[1px] bg-white/20" />

        <div className="relative" ref={siteRef}>
          <button
            onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-white hover:border-[#00d4ff]/30 transition-all cursor-pointer"
          >
            <span className="max-w-[120px] truncate">{selectedSite?.name || "Select Site"}</span>
            <ChevronDown size={14} className={`text-white/40 transition-transform ${siteDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {siteDropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0e1321] p-1.5 shadow-2xl z-50">
              <div className="px-2.5 py-1 text-[10px] font-mono text-white/40 tracking-wider uppercase">ACTIVE PORT VECTOR</div>
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => {
                    onSelectSite(site);
                    setSiteDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between text-left px-2.5 py-2 mt-1 rounded-lg text-xs gap-2 transition-all ${
                    selectedSite?.id === site.id
                      ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-l-2 border-[#00d4ff]'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="truncate">
                    <div className="font-medium font-sans truncate">{site.name}</div>
                    <div className="text-[10px] text-white/40 truncate">{site.url}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 text-xs">
          <div className="text-white/40 px-1">
            <Calendar size={14} />
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={handleStartDateChange}
            className="bg-transparent border-0 text-white font-mono text-[11px] focus:ring-0 max-w-[110px] focus:outline-none"
          />
          <span className="text-white/30 text-[10px]">→</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={handleEndDateChange}
            className="bg-transparent border-0 text-white font-mono text-[11px] focus:ring-0 max-w-[110px] focus:outline-none"
          />
        </div>

        {reportLoaded && (
          <button
            onClick={onExportPdf}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/5 text-xs text-white hover:bg-[#00d4ff]/15 transition-all outline-none"
          >
            <FileText size={14} className="text-[#00d4ff]" />
            <span className="font-medium">PDF</span>
          </button>
        )}

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs text-white bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] disabled:opacity-50 transition-all cursor-pointer"
        >
          <Sparkles size={13} className={isGenerating ? 'animate-spin' : ''} />
          <span>{isGenerating ? 'Syncing...' : 'Generate AI Report'}</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg border border-white/10 hover:border-[#00d4ff]/30 bg-white/5 text-white/70 hover:text-white transition-all cursor-pointer"
        >
          {darkTheme ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#00d4ff] flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/10 overflow-hidden">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName ? userName[0] : 'U'
              )}
            </div>
            <ChevronDown size={12} className="text-white/40 hidden md:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0e1321] p-1.5 shadow-2xl z-50">
              <div className="p-2 border-b border-white/5">
                <div className="text-xs font-semibold text-white truncate">{userName || "User Profile"}</div>
                <div className="text-[10px] text-white/40 truncate font-mono">{userEmail || "email@domain.com"}</div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    onOpenSiteManagement();
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg text-left transition-all"
                >
                  <Sliders size={13} className="text-white/40" />
                  <span>Site Management</span>
                </button>

                <div className="my-1 border-t border-white/5" />

                <button
                  onClick={() => {
                    onLogout();
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#f43f5e] hover:bg-[#f43f5e]/10 rounded-lg text-left transition-all"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
