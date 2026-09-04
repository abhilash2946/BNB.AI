import React, { useState } from 'react';
import {
  Home,
  TrendingUp,
  Target,
  Users,
  Presentation,
  Radar,
  FileText,
  Settings,
  X,
  ChevronRight
} from 'lucide-react';
import { CategoryType, SectionType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  expanded: boolean;
  activeView: string;
  activeCategory: CategoryType;
  activeSection: SectionType;
  onNavigate: (view: string, category?: CategoryType, section?: SectionType) => void;
  onOpenSiteManagement: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isSharedMode?: boolean;
  sharedConfig?: any;
}

export default function Sidebar({
  expanded,
  activeView,
  activeCategory,
  activeSection,
  onNavigate,
  onOpenSiteManagement,
  mobileOpen,
  onMobileClose,
  isSharedMode = false,
  sharedConfig = null,
}: SidebarProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const navItems = [
    {
      id: 'cmd-center',
      label: 'Command Center',
      icon: Home,
      action: () => onNavigate('cmd-center')
    },
    {
      id: 'seo-intel',
      label: 'SEO Intelligence',
      category: 'SEO' as CategoryType,
      icon: TrendingUp,
      action: () => onNavigate('seo-intel', 'SEO', 'Reports')
    },
    {
      id: 'perf-intel',
      label: 'Performance Intel',
      category: 'Performance Marketing' as CategoryType,
      icon: Target,
      action: () => onNavigate('perf-intel', 'Performance Marketing', 'Reports')
    },
    {
      id: 'social-intel',
      label: 'Social Intel',
      category: 'Social Media Marketing' as CategoryType,
      icon: Users,
      action: () => onNavigate('social-intel', 'Social Media Marketing', 'Reports')
    },
    {
      id: 'client-ppt',
      label: 'Client PPT',
      icon: Presentation,
      action: () => onNavigate('client-ppt', 'Combined Intelligence')
    },
    {
      id: 'client-doc',
      label: 'Client Doc',
      icon: FileText,
      action: () => onNavigate('client-doc', activeCategory, 'Client Report'),
      subItems: [
        { name: "SEO Client Report", category: 'SEO' as CategoryType },
        { name: "Performance Client Report", category: 'Performance Marketing' as CategoryType },
        { name: "Social Client Report", category: 'Social Media Marketing' as CategoryType },
      ]
    },
    {
      id: 'competitor',
      label: 'Competitor Radar',
      icon: Radar,
      action: () => onNavigate('competitor')
    },
    {
      id: 'studio',
      label: 'Reports Studio',
      icon: FileText,
      action: () => onNavigate('studio')
    },
  ];

  const subSections: { name: SectionType; label: string }[] = [
    { name: "Reports", label: "AI Analysis" },
    { name: "Graphs", label: "Visual Charts" },
    { name: "BnB Report", label: "Internal Strategy" },
  ];

  const adminItems = [
    {
      id: 'mgmt',
      label: 'Management',
      icon: Settings,
      action: onOpenSiteManagement
    },
  ];

  const isActive = (id: string) => activeView === id;

  const filteredNavItems = navItems.filter(item => {
    if (isSharedMode && sharedConfig?.access_type === 'private') {
      const allowedIds: string[] = [];
      if (sharedConfig.shared_pages?.includes('ppt')) allowedIds.push('client-ppt');
      if (sharedConfig.shared_pages?.includes('doc')) allowedIds.push('client-doc');
      return allowedIds.includes(item.id);
    }
    return true;
  });

  const sidebarWidthClass = expanded ? 'w-[240px]' : 'w-[72px]';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-xs"
          onClick={onMobileClose}
        />
      )}

      {/* Primary Sidebar Drawer refined for Image 2 texture */}
      <aside
        className={`
          fixed md:sticky top-[60px] left-0 h-[calc(100vh-60px)] z-40
          flex flex-col bg-[#020202] border-r border-white/10 transition-all duration-300 ease-in-out
          ${sidebarWidthClass}
          ${mobileOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5 md:hidden">
          <span className="font-display font-medium text-xs tracking-wider text-white/50 uppercase">DIVISIONS</span>
          <button
            onClick={onMobileClose}
            className="p-1 rounded-sm hover:bg-white/10 text-white/70"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            const showSubMenu = (expanded || mobileOpen) && (active || hoveredCategory === item.id) && (item.category || (item as any).subItems);

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredCategory(item.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                className="space-y-1"
              >
                <button
                  onClick={() => {
                    item.action();
                    if (!item.category) onMobileClose();
                  }}
                  className={`
                    w-full flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-2xl text-sm transition-all duration-200 group relative
                    ${active
                      ? 'text-white bg-white/[0.08] border border-white/15 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.4)]'
                      : 'text-white/55 hover:text-white hover:bg-white/5'
                    }
                  `}
                  title={!expanded && !mobileOpen ? item.label : undefined}
                >
                  <div className={`${active ? 'text-white' : 'text-white/50 group-hover:text-white'} transition-colors shrink-0`}>
                    <Icon size={18} />
                  </div>

                  {(expanded || mobileOpen) && (
                    <span className="font-sans truncate text-left flex-1 animate-in fade-in duration-300">{item.label}</span>
                  )}

                  {(expanded || mobileOpen) && item.category && (
                    <ChevronRight size={14} className={`transition-transform ${active ? 'rotate-90 text-white' : 'text-white/20'}`} />
                  )}

                  {!expanded && !mobileOpen && (
                    <div className="absolute left-[70px] bg-[#1A1A1A] border border-white/10 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-lg">
                      {item.label}
                    </div>
                  )}
                </button>

                <AnimatePresence>
                  {showSubMenu && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pl-7 space-y-1"
                    >
                      {(item as any).subItems ? (item as any).subItems.map((sub: any) => (
                        <button
                          key={sub.name}
                          onClick={() => {
                            onNavigate(item.id, sub.category, 'Client Report');
                            onMobileClose();
                          }}
                          className={`
                            w-full text-left px-3 py-1.5 rounded-md text-[11px] flex items-center justify-between transition-colors
                            ${active && activeCategory === sub.category
                              ? 'text-white font-bold bg-white/5'
                              : 'text-white/40 hover:text-white hover:bg-white/5'
                            }
                          `}
                        >
                          <span>{sub.name}</span>
                        </button>
                      )) : subSections.map((sub) => (
                        <button
                          key={sub.name}
                          onClick={() => {
                            onNavigate(item.id, item.category, sub.name);
                            onMobileClose();
                          }}
                          className={`
                            w-full text-left px-3 py-1.5 rounded-md text-[11px] flex items-center justify-between transition-colors
                            ${active && activeSection === sub.name
                              ? 'text-white font-bold bg-white/5'
                              : 'text-white/40 hover:text-white hover:bg-white/5'
                            }
                          `}
                        >
                          <span>{sub.name}</span>
                          <span className="text-[8px] font-mono text-white/20 uppercase scale-90">{sub.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {!isSharedMode && (
            <>
              <div className="my-4 border-t border-white/10" />

              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      onMobileClose();
                    }}
                    className={`
                      w-full flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-2xl text-sm transition-all duration-200 group relative
                      ${active
                        ? 'text-white bg-white/[0.08] border border-white/15 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.4)]'
                        : 'text-white/55 hover:text-white hover:bg-white/5'
                      }
                    `}
                    title={!expanded && !mobileOpen ? item.label : undefined}
                  >
                    <div className={`${active ? 'text-white' : 'text-white/50 group-hover:text-white'} transition-colors shrink-0`}>
                      <Icon size={18} />
                    </div>

                    {(expanded || mobileOpen) && (
                      <span className="font-sans truncate text-left animate-in fade-in duration-300">{item.label}</span>
                    )}

                    {!expanded && !mobileOpen && (
                      <div className="absolute left-[70px] bg-[#111111] border border-white/10 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-lg">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {(expanded || mobileOpen) && (
          <div className="p-4 border-t border-white/5 bg-black/10 text-[10px] font-mono text-white/30 truncate select-none text-center">
            SYSTEM STATE: SYNCED
          </div>
        )}
      </aside>
    </>
  );
}
