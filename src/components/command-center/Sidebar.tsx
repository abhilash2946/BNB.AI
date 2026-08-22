import React from 'react';
import {
  Home, TrendingUp, Target, Users, Radar, FileText, Settings, X
} from 'lucide-react';
import { SiteProfile, DateRange } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  setCategory: (cat: any) => void;
  fetchReportData: (site: SiteProfile, dates: DateRange, cat: any) => void;
  activeSite: SiteProfile;
  dates: DateRange;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  shouldHideLabels: boolean;
  onOpenSiteManagement: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView, setActiveView, setCategory, fetchReportData, activeSite, dates,
  sidebarOpen, setSidebarOpen, isMobile, shouldHideLabels, onOpenSiteManagement
}) => {
  return (
    <>
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`transition-all duration-300 ease-in-out glass border-r border-white/10 shrink-0 ${
          sidebarOpen ? 'w-[240px]' : isMobile ? 'w-0' : 'w-[64px]'
        } flex flex-col p-2 h-full z-[70] ${
          isMobile ? 'fixed left-0 top-0 bottom-0 shadow-2xl' : 'relative'
        }`}
      >
        {isMobile && sidebarOpen && (
          <div className="flex justify-end p-2 mb-4">
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="space-y-1.5 py-4">
          <SidebarItem
            icon={Home}
            label="Command Center"
            active={activeView === "home"}
            collapsed={shouldHideLabels}
            onClick={() => setActiveView("home")}
          />
          <SidebarItem
            icon={TrendingUp}
            label="SEO Intelligence"
            active={activeView === "seo"}
            collapsed={shouldHideLabels}
            onClick={() => { setCategory("SEO"); setActiveView("seo"); fetchReportData(activeSite, dates, "SEO"); }}
          />
          <SidebarItem
            icon={Target}
            label="Performance Intel"
            active={activeView === "performance"}
            collapsed={shouldHideLabels}
            onClick={() => { setCategory("Performance Marketing"); setActiveView("performance"); fetchReportData(activeSite, dates, "Performance Marketing"); }}
          />
          <SidebarItem
            icon={Users}
            label="Social Intel"
            active={activeView === "social"}
            collapsed={shouldHideLabels}
            onClick={() => { setCategory("Social Media Marketing"); setActiveView("social"); fetchReportData(activeSite, dates, "Social Media Marketing"); }}
          />
          <SidebarItem
            icon={Radar}
            label="Competitor Radar"
            active={activeView === "competitors"}
            collapsed={shouldHideLabels}
            onClick={() => setActiveView("competitors")}
          />
          <SidebarItem
            icon={FileText}
            label="Reports Studio"
            active={activeView === "reports"}
            collapsed={shouldHideLabels}
            onClick={() => setActiveView("reports")}
          />
        </div>

        <div className="mt-auto pt-4 border-t border-white/5 pb-4">
          <SidebarItem
            icon={Settings}
            label="Management"
            collapsed={shouldHideLabels}
            onClick={onOpenSiteManagement}
          />
        </div>
      </aside>
    </>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: { icon: any, label: string, active?: boolean, onClick: () => void, collapsed: boolean }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : ""}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative group ${
      active
        ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
        : 'hover:bg-white/5 text-gray-400 hover:text-white'
    }`}
  >
    <Icon size={20} className={`shrink-0 ${active ? "text-white" : "group-hover:text-white transition-colors"}`} />
    {!collapsed && (
      <span className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300">
        {label}
      </span>
    )}
    {active && (
      <motion.div
        layoutId="active-pill"
        className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
      />
    )}
  </button>
);
