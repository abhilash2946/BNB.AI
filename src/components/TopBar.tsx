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
  isSharedMode?: boolean;
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
  isFullscreen = false,
  isSharedMode = false
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

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  // Local state to handle the DD/MM/YYYY text display
  const [startText, setStartText] = useState('');
  const [endText, setEndText] = useState('');

  // Convert YYYY-MM-DD (ISO) to DD/MM/YYYY (Display)
  const toDisplay = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  // Convert DD/MM/YYYY (Display) back to YYYY-MM-DD (ISO)
  const toIso = (display: string) => {
    const parts = display.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (d.length < 1 || m.length < 1 || y.length < 4) return null;
    // Basic validation
    const dd = d.padStart(2, '0');
    const mm = m.padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Keep display text in sync with external dateRange prop
  useEffect(() => {
    setStartText(toDisplay(dateRange.start));
    setEndText(toDisplay(dateRange.end));
  }, [dateRange]);

  const handleStartTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartText(val);
    const iso = toIso(val);
    if (iso && !isNaN(Date.parse(iso))) {
      onChangeDateRange({ ...dateRange, start: iso });
    }
  };

  const handleEndTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndText(val);
    const iso = toIso(val);
    if (iso && !isNaN(Date.parse(iso))) {
      onChangeDateRange({ ...dateRange, end: iso });
    }
  };

  const handleNativeStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeDateRange({ ...dateRange, start: e.target.value });
  };

  const handleNativeEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeDateRange({ ...dateRange, end: e.target.value });
  };

  const openStartPicker = () => {
    try {
      if (startInputRef.current && 'showPicker' in startInputRef.current) {
        (startInputRef.current as any).showPicker();
      } else {
        startInputRef.current?.focus();
      }
    } catch (e) {
      startInputRef.current?.focus();
    }
  };

  const openEndPicker = () => {
    try {
      if (endInputRef.current && 'showPicker' in endInputRef.current) {
        (endInputRef.current as any).showPicker();
      } else {
        endInputRef.current?.focus();
      }
    } catch (e) {
      endInputRef.current?.focus();
    }
  };

  return (
    <header className={`${isFullscreen ? 'hidden' : 'sticky'} top-0 z-50 h-[60px] w-full border-b border-white/10 bg-[#000000] backdrop-blur-md flex items-center justify-between px-4 transition-all`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg border border-white/10 hover:border-white/40 bg-white/5 text-white/80 hover:text-white transition-all group relative"
          title="Open / Close sidebar"
        >
          <Menu size={18} />
          <span className="absolute hidden group-hover:block top-12 left-2 bg-black border border-white/15 text-xs text-white p-1 rounded z-50 whitespace-nowrap">
            Open / Close sidebar
          </span>
        </button>

        <button
          onClick={onNavigateHome}
          className="flex items-center focus:outline-none"
        >
          <span className="font-display font-bold text-lg tracking-wider text-white">
            BNB.AI
          </span>
        </button>

        <div className="h-5 w-[1px] bg-white/20" />

        {!isSharedMode ? (
          <div className="relative" ref={siteRef}>
            <button
              onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-white hover:border-white/30 transition-all cursor-pointer"
            >
              <span className="max-w-[120px] truncate">{selectedSite?.name || "Select Site"}</span>
              <ChevronDown size={14} className={`text-white/40 transition-transform ${siteDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {siteDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#111111] p-1.5 shadow-2xl z-50">
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
                        ? 'bg-white/10 text-white border-l-2 border-white'
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
        ) : (
          <div className="px-3 py-1.5 text-xs font-bold text-white bg-white/10 rounded-lg border border-white/20">
            {selectedSite?.name}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden sm:flex items-center gap-2">
          {/* Start Date Container */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0c0c0c] border border-white/10 rounded-lg group hover:border-white/30 transition-all relative">
            <button
              onClick={openStartPicker}
              className="text-white/40 group-hover:text-white/70 transition-colors cursor-pointer"
            >
              <Calendar size={14} />
            </button>
            <input
              type="text"
              value={startText}
              onChange={handleStartTextChange}
              placeholder="DD/MM/YYYY"
              disabled={isSharedMode}
              className={`bg-transparent border-0 text-white font-mono text-[11px] focus:ring-0 p-0 w-[95px] focus:outline-none ${isSharedMode ? 'opacity-50' : ''}`}
            />
            {/* Hidden native picker triggered by button */}
            <input
              ref={startInputRef}
              type="date"
              value={dateRange.start}
              onChange={handleNativeStartChange}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <span className="text-white/20 text-[10px]">→</span>

          {/* End Date Container */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0c0c0c] border border-white/10 rounded-lg group hover:border-white/30 transition-all relative">
            <input
              type="text"
              value={endText}
              onChange={handleEndTextChange}
              placeholder="DD/MM/YYYY"
              disabled={isSharedMode}
              className={`bg-transparent border-0 text-white font-mono text-[11px] focus:ring-0 p-0 w-[95px] text-right focus:outline-none ${isSharedMode ? 'opacity-50' : ''}`}
            />
            <button
              onClick={openEndPicker}
              className="text-white/40 group-hover:text-white/70 transition-colors cursor-pointer"
            >
              <Calendar size={14} />
            </button>
            {/* Hidden native picker triggered by button */}
            <input
              ref={endInputRef}
              type="date"
              value={dateRange.end}
              onChange={handleNativeEndChange}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* PDF button removed to match reference image 2 */}

        {!isSharedMode && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/25 text-white font-semibold text-xs tracking-wide disabled:opacity-50 transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          >
            <Sparkles size={13} className={isGenerating ? 'animate-spin text-white' : 'text-white'} />
            <span>{isGenerating ? 'Syncing...' : 'Generate AI Report'}</span>
          </button>
        )}

        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg border border-white/10 hover:border-white/30 bg-white/5 text-white/70 hover:text-white transition-all cursor-pointer"
        >
          {darkTheme ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {!isSharedMode && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs font-bold text-black shadow-md border border-white/10 overflow-hidden">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userName ? userName[0] : 'U'
                )}
              </div>
              <ChevronDown size={12} className="text-white/40 hidden md:block" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#111111] p-1.5 shadow-2xl z-50">
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
        )}
      </div>
    </header>
  );
}
