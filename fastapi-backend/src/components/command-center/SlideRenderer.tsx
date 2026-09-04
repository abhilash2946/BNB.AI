import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slide } from '../../types';
import { Edit2, ArrowUpRight, Check, Linkedin, Instagram, Facebook, Twitter, Youtube, MessageSquare, Search, Zap, Activity, ChevronLeft, ExternalLink } from 'lucide-react';

// Highly detailed vector SVG representation of the actual RL Tours and Travels logo
const RLLogoSVG: React.FC = () => (
  <div className="flex flex-col items-center justify-center text-center select-none p-4">
    <svg width="220" height="90" viewBox="0 0 220 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-20">
      {/* R styling with sweeping curls */}
      <path
        d="M60,65 C60,54 62,32 70,28 C75,25 90,23 93,34 C95,43 90,52 78,53 M76,32 L76,65"
        stroke="#8e9092"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M76,51 C82,57 89,61 97,65"
        stroke="#8e9092"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* L styling */}
      <path
        d="M110,28 L110,65 L132,65"
        stroke="#8e9092"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Flight Path swoosh across letters */}
      <path
        d="M40,66 C60,57 88,41 148,30"
        stroke="#8e9092"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Transverse cross hatches on flight path */}
      <line x1="140" y1="31" x2="142" y2="35" stroke="#8e9092" strokeWidth="1" />
      <line x1="128" y1="33" x2="130" y2="37" stroke="#8e9092" strokeWidth="1" />
      <line x1="116" y1="35" x2="118" y2="39" stroke="#8e9092" strokeWidth="1" />

      {/* Airplane Silhouette pointing top-right */}
      <g transform="translate(148, 29) rotate(-10) scale(0.65)">
        <path
          d="M0,-2 L14,-6 L17,-3 L10,1 L13,6 L9,7 L6,3 L3,4 L2,8 L0,8 Z"
          fill="#8e9092"
        />
      </g>
    </svg>
    <div className="mt-1">
      <h3 className="text-lg font-bold font-sans tracking-[0.06em] text-[#8e9092] leading-tight">Tours and Travels</h3>
      <p className="text-[8px] text-[#5a5d61] font-sans tracking-[0.2em] uppercase font-bold mt-0.5">A Passport to Create Memories</p>
    </div>
  </div>
);

interface SlideRendererProps {
  slide: Slide;
  onUpdateSlide: (updatedSlide: Slide) => void;
  isEditMode: boolean; // Updated prop name to match project convention
  siteImageUrl?: string;
  userAvatarUrl?: string;
  onNavigate?: (index: number) => void;
  onUpdateAllSlides?: (slides: Slide[]) => void;
  slides?: Slide[];
}

// Updated Card component for single item swipe
const CompetitorDetailCard = ({ comp, type, isSelected, onClick }: { comp: any; type: 'seo' | 'perf'; isSelected: boolean; onClick: () => void }) => {
  const name = typeof comp === 'string' ? comp : comp.name || 'Unknown';

  return (
    <motion.div
      layout
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`group cursor-pointer transition-all duration-300 rounded-[2.5rem] border w-full h-44 ${
        isSelected
          ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.2)]'
          : 'bg-[#080808] border-neutral-900 text-neutral-400 hover:border-neutral-800 hover:bg-neutral-900/50'
      } p-8 flex flex-col justify-between`}
    >
      <div className="flex justify-between items-start">
        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full ${isSelected ? 'bg-black/20 text-white' : 'bg-neutral-900 text-neutral-500'}`}>
          {type === 'perf' ? 'PERP' : 'SEO'}
        </span>
        <div className={`p-2.5 rounded-full ${isSelected ? 'bg-black/10' : 'bg-neutral-800'}`}>
          <ArrowUpRight size={20} className={isSelected ? 'text-white' : 'text-neutral-600'} />
        </div>
      </div>

      <div className="flex flex-col">
        <h4 className={`font-bold font-display text-2xl transition-colors line-clamp-1 ${isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'}`}>
          {name}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] font-mono uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-neutral-600 group-hover:text-neutral-500'}`}>
            {isSelected ? 'Active Scan Active' : 'Expand Intelligence'}
          </span>
          {!isSelected && <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-neutral-600"> → </motion.div>}
        </div>
      </div>
    </motion.div>
  );
};

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  onUpdateSlide,
  isEditMode,
  siteImageUrl,
  userAvatarUrl,
  onNavigate,
  onUpdateAllSlides,
  slides = []
}) => {
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  // Helper to handle simple text changes
  const handleTextChange = (key: keyof Slide, value: string) => {
    onUpdateSlide({
      ...slide,
      [key]: value
    });
  };

  // Helper to handle metadata nested text changes
  const handleMetaChange = (key: string, value: string) => {
    onUpdateSlide({
      ...slide,
      metadata: {
        ...slide.metadata,
        [key]: value
      }
    });
  };

  // Helper for image uploads
  const handleImageUpload = (slotId: string, base64: string) => {
    onUpdateSlide({
      ...slide,
      images: {
        ...(slide.images || {}),
        [slotId]: base64
      }
    });
  };

  // Inline Editable Text Wrapper with styling suited for dark presentation slides
  const EditableText: React.FC<{
    text: string;
    onSave: (val: string) => void;
    label?: string;
    className?: string;
    textarea?: boolean;
    placeholder?: string;
  }> = ({ text, onSave, label = '', className = '', textarea = false, placeholder = 'Double click to edit...' }) => {
    const [editing, setEditing] = useState(false);
    const [tempText, setTempText] = useState(text);

    if (!isEditMode) {
      return <span className={className}>{text || placeholder}</span>;
    }

    if (editing) {
      return (
        <span className="inline-block w-full min-w-[80px]" onClick={e => e.stopPropagation()}>
          {textarea ? (
            <textarea
              value={tempText}
              onChange={e => setTempText(e.target.value)}
              onBlur={() => {
                setEditing(false);
                onSave(tempText);
              }}
              className="w-full text-white p-2 border border-neutral-700 rounded bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={tempText}
              onChange={e => setTempText(e.target.value)}
              onBlur={() => {
                setEditing(false);
                onSave(tempText);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setEditing(false);
                  onSave(tempText);
                }
              }}
              className="text-white px-2 py-0.5 border border-neutral-700 rounded bg-neutral-900 focus:outline-none focus:ring-1 font-sans w-full"
              autoFocus
            />
          )}
          <span className="text-[8px] text-blue-400 block mt-1">Press Enter / click outside to save</span>
        </span>
      );
    }

    return (
      <span
        className={`relative group inline-block cursor-pointer border border-dashed border-transparent hover:border-neutral-700 rounded hover:bg-neutral-900/60 px-1 transition-all ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        onMouseEnter={() => setHoveredField(label)}
        onMouseLeave={() => setHoveredField(null)}
        title="Double click to edit text"
      >
        <span>{text || placeholder}</span>
        <span className="absolute -top-5 right-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-neutral-800 text-neutral-300 text-[8px] py-0.5 px-1 rounded border border-neutral-700 pointer-events-none transition-opacity z-10">
          <Edit2 className="w-2 h-2 text-blue-400" /> Edit
        </span>
      </span>
    );
  };

  // Reusable Image Box with Local Storage / Base64 upload support
  const ImageBox: React.FC<{
    slotId: string;
    className?: string;
    label?: string;
  }> = ({ slotId, className = '', label = 'Image' }) => {
    const currentImage = slide.images?.[slotId];
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            handleImageUpload(slotId, reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div
        onClick={() => isEditMode && fileInputRef.current?.click()}
        className={`relative group ${isEditMode ? 'cursor-pointer' : ''} border border-white/[0.02] hover:border-neutral-800 bg-[#121316] rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${className}`}
      >
        {isEditMode && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        )}
        {currentImage ? (
          <>
            <img
              src={currentImage}
              alt={label}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {isEditMode && (
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                <span className="text-white text-xs font-mono bg-neutral-900/90 px-3 py-1 rounded-full border border-neutral-700 shadow-xl">Change Image</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-4 text-center select-none">
            <span className="text-[#2b2d31] font-sans text-4xl font-extrabold tracking-tight">{label}</span>
          </div>
        )}
      </div>
    );
  };

  // Reusable Custom Checkmark list
  const BulletItem: React.FC<{
    text: string;
    onSave: (val: string) => void;
  }> = ({ text, onSave }) => (
    <div className="flex items-start gap-2.5 py-1">
      <div className="w-4 h-4 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mt-0.5 shrink-0">
        <Check className="w-2.5 h-2.5 text-neutral-400" />
      </div>
      <span className="text-xs text-neutral-400 leading-snug font-sans">
        <EditableText text={text} onSave={onSave} />
      </span>
    </div>
  );

  return (
    <div className="w-full min-h-full bg-[#070708] text-white select-none flex flex-col justify-between p-4 sm:p-8 select-text relative font-sans">

      {/* ELEGANT RADIAL SPOTLIGHT GLOW AT THE BOTTOM RIGHT (Matches reference image perfectly) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_85%_90%,rgba(255,255,255,0.065),transparent_55%)] z-0" />

      <div className="z-10 flex-1 flex flex-col justify-between">

        {/* ==================== SLIDE 01: DIGITAL COVER ==================== */}
        {slide.type === 'digital_cover' && (
          <div className="flex-1 flex flex-col justify-between py-1 min-h-0">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-display text-white max-w-2xl leading-tight">
                  <EditableText
                    text={slide.title}
                    onSave={(val) => handleTextChange('title', val)}
                    label="Slide Title"
                    textarea={true}
                  />
                </h1>
              </div>
              <div className="grid grid-cols-2 gap-8 text-right">
                <div>
                  <span className="text-[10px] font-mono tracking-wider text-neutral-500 block uppercase mb-1">CLIENT</span>
                  <span className="text-xs font-bold font-display text-white">
                    <EditableText
                      text={slide.metadata?.client || ''}
                      onSave={(val) => handleMetaChange('client', val)}
                    />
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-wider text-neutral-500 block uppercase mb-1">REPORTING PERIOD</span>
                  <span className="text-xs font-bold font-display text-white">
                    <EditableText
                      text={slide.metadata?.reportingPeriod || ''}
                      onSave={(val) => handleMetaChange('reportingPeriod', val)}
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Center Grid (Logo on left, Stacked placeholders on right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-4 items-center">
              {/* Left Logo Side */}
              <div className="md:col-span-7 border border-white/[0.02] bg-[#121316]/40 rounded-3xl p-6 flex flex-col items-center justify-center relative h-[320px]">
                {slide.images?.logo ? (
                  <div className="relative group flex items-center justify-center h-full w-full">
                    <img
                      src={slide.images.logo}
                      alt="Brand Logo"
                      className="h-full w-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                    {isEditMode && (
                      <div
                        onClick={() => handleImageUpload('logo', '')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer rounded-xl"
                      >
                        <span className="text-white text-xs bg-red-950 px-3 py-1 rounded-full border border-red-900">Remove Image</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      if (!isEditMode) return;
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              handleImageUpload('logo', reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className={`flex flex-col items-center ${isEditMode ? 'cursor-pointer' : ''} text-center group`}
                  >
                    <RLLogoSVG />
                  </div>
                )}
              </div>

              {/* Right Stacked Image Placeholders */}
              <div className="md:col-span-5 flex flex-col gap-3 h-[320px]">
                <ImageBox slotId="img1" className="flex-[2] min-h-0 h-full" label="Image" />
                <ImageBox slotId="img2" className="flex-[1] min-h-0 h-full" label="Image" />
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 02: TABLE OF CONTENTS ==================== */}
        {slide.type === 'table_of_contents' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch flex-1">
              {/* Left Title Panel */}
              <div className="md:col-span-4 flex flex-col justify-center border-r border-neutral-900 pr-8">
                 <span className="text-[10px] font-mono tracking-[0.3em] text-neutral-500 uppercase mb-2">TABLE OF CONTENTS</span>
                 <h1 className="text-6xl font-black font-display text-white tracking-tighter mb-8">
                   <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
                 </h1>
                 <div className="h-0.5 bg-white w-24 mb-10" />
                 <p className="text-[11px] text-neutral-500 font-sans leading-relaxed uppercase tracking-widest">
                   <EditableText
                     text={slide.metadata?.rightDesc || ''}
                     onSave={(val) => handleMetaChange('rightDesc', val)}
                     textarea={true}
                   />
                 </p>
              </div>

              {/* Right Contents Grid */}
              <div className="md:col-span-8 grid grid-cols-2 gap-x-12 gap-y-1 py-4">
                 {slides.filter(s => s.type !== 'digital_cover' && s.type !== 'table_of_contents').map((s, idx) => {
                   const realIdx = slides.findIndex(orig => orig.id === s.id);
                   return (
                     <motion.div
                       key={s.id}
                       whileHover={!isEditMode ? { x: 5 } : {}}
                       onClick={() => !isEditMode && onNavigate?.(realIdx)}
                       className={`group flex items-center gap-4 py-3 border-b border-neutral-900/50 ${!isEditMode ? 'cursor-pointer hover:border-blue-500/30' : ''} transition-all`}
                     >
                       <div className={`w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center ${!isEditMode ? 'group-hover:bg-blue-600 group-hover:border-blue-500' : ''} transition-all`}>
                         <span className={`text-[10px] font-mono font-bold text-neutral-500 ${!isEditMode ? 'group-hover:text-white' : ''}`}>
                           {(idx + 1).toString().padStart(2, '0')}
                         </span>
                       </div>
                       <span className={`text-sm font-bold font-display ${!isEditMode ? 'text-neutral-400 group-hover:text-white' : 'text-white'} transition-colors`}>
                         <EditableText
                           text={s.title}
                           onSave={(val) => {
                             const newSlides = [...slides];
                             newSlides[realIdx] = { ...newSlides[realIdx], title: val };
                             onUpdateAllSlides?.(newSlides);
                           }}
                         />
                       </span>
                     </motion.div>
                   );
                 })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 03: EXECUTIVE SUMMARY ==================== */}
        {slide.type === 'exec_summary' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <div className="text-[11px] text-neutral-400 font-sans max-w-md text-left leading-relaxed">
                {slide.metadata?.rightDesc && slide.metadata.rightDesc.includes('•') ? (
                  <div className="flex flex-col gap-1 items-start whitespace-pre-line">
                    {slide.metadata.rightDesc.split('\n').filter(line => line.trim()).map((line, i) => (
                      <div key={i} className="text-left">{line.trim()}</div>
                    ))}
                  </div>
                ) : (
                  <EditableText
                    text={slide.metadata?.rightDesc || ''}
                    onSave={(val) => handleMetaChange('rightDesc', val)}
                    textarea={true}
                  />
                )}
              </div>
            </div>

            {/* Image Placeholder row */}
            <div className="flex justify-between items-center mb-6">
              <div className="bg-[#0a0a0a] border border-neutral-900 text-neutral-300 text-xs font-sans font-medium px-4 py-2.5 rounded-full select-none">
                Key Achievements
              </div>
              <div className="flex gap-4">
                <ImageBox slotId="img1" className="w-28 h-28" label="Image" />
                <ImageBox slotId="img2" className="w-28 h-28" label="Image" />
                <ImageBox slotId="img3" className="w-28 h-28" label="Image" />
              </div>
            </div>

            {/* Metrics cards row */}
            {slide.kpis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {slide.kpis.map((kpi, idx) => (
                  <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-3xl p-6 flex flex-col justify-between min-h-[180px] relative group hover:border-neutral-800 transition-all">
                    <div>
                      <span className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                        <EditableText
                          text={kpi.label}
                          onSave={(val) => {
                            const updated = [...(slide.kpis || [])];
                            updated[idx].label = val;
                            onUpdateSlide({ ...slide, kpis: updated });
                          }}
                        />
                      </span>
                    </div>
                    <div className="mt-4 flex justify-between items-baseline">
                      <span className="text-4xl font-extrabold font-display text-white tracking-tight">
                        <EditableText
                          text={kpi.value}
                          onSave={(val) => {
                            const updated = [...(slide.kpis || [])];
                            updated[idx].value = val;
                            onUpdateSlide({ ...slide, kpis: updated });
                          }}
                        />
                      </span>
                      <ArrowUpRight className="w-5 h-5 text-neutral-700 group-hover:text-neutral-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== SLIDE 03: SERVICES DELIVERED ==================== */}
        {slide.type === 'services_delivered' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-5">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Split layout: left services, right stacked placeholders */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch flex-1 my-2">
              <div className="md:col-span-6 flex flex-col gap-3.5 justify-center">
                {slide.listItems && slide.listItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0a0a0a] border border-neutral-900 rounded-2xl p-5 flex justify-between items-center hover:border-neutral-800 transition-colors cursor-pointer group"
                  >
                    <span className="text-sm font-semibold font-display text-white">
                      <EditableText
                        text={item}
                        onSave={(val) => {
                          const updated = [...(slide.listItems || [])];
                          updated[idx] = val;
                          onUpdateSlide({ ...slide, listItems: updated });
                        }}
                      />
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                  </div>
                ))}
              </div>

              <div className="md:col-span-6 flex flex-col gap-3">
                <ImageBox slotId="img1" className="flex-1 min-h-0" label="Image" />
                <ImageBox slotId="img2" className="flex-1 min-h-0" label="Image" />
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 04: OVERALL PERFORMANCE ==================== */}
        {slide.type === 'overall_performance' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-5">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* KPI comparative list table */}
            <div className="bg-[#080808] border border-neutral-900 rounded-3xl overflow-hidden my-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-900 text-[10px] font-mono tracking-wider text-neutral-500 bg-neutral-950/40">
                    <th className="py-3.5 px-6 font-bold">KPI</th>
                    <th className="py-3.5 px-6 text-right font-bold">
                      <EditableText
                        text={slide.metadata?.prevDateLabel || 'Previous Month'}
                        onSave={(val) => handleMetaChange('prevDateLabel', val)}
                      />
                    </th>
                    <th className="py-3.5 px-6 text-right font-bold">
                      <EditableText
                        text={slide.metadata?.currDateLabel || 'Current Month'}
                        onSave={(val) => handleMetaChange('currDateLabel', val)}
                      />
                    </th>
                    <th className="py-3.5 px-6 text-right font-bold">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-xs">
                  {slide.tableData && slide.tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/10 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-neutral-300">
                        <EditableText
                          text={row.kpi}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].kpi = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-neutral-400">
                        <EditableText
                          text={row.prev}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].prev = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold text-white">
                        <EditableText
                          text={row.current}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].current = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-500">
                        <EditableText
                          text={row.growth}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].growth = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 05: SEO PERFORMANCE ==================== */}
        {slide.type === 'seo_performance' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Sub header button */}
            <div className="mb-4">
              <div className="inline-block bg-[#0a0a0a] border border-neutral-900 text-neutral-300 text-xs font-sans px-4 py-2.5 rounded-full select-none">
                <EditableText text={slide.subTag || ''} onSave={(val) => handleTextChange('subTag', val)} />
              </div>
            </div>

            {/* 5 metrics cards */}
            {slide.kpis && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {slide.kpis.map((kpi, idx) => (
                  <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between min-h-[100px] relative">
                    <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase leading-tight">
                      <EditableText
                        text={kpi.label}
                        onSave={(val) => {
                          const updated = [...(slide.kpis || [])];
                          updated[idx].label = val;
                          onUpdateSlide({ ...slide, kpis: updated });
                        }}
                      />
                    </span>
                    <span className="text-xl font-bold font-display text-white tracking-tight mt-2 block">
                      <EditableText
                        text={kpi.value}
                        onSave={(val) => {
                          const updated = [...(slide.kpis || [])];
                          updated[idx].value = val;
                          onUpdateSlide({ ...slide, kpis: updated });
                        }}
                      />
                    </span>
                    {kpi.growth && (
                      <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold ${kpi.isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <span>{kpi.isPositive ? '↑' : '↓'} {kpi.growth.replace(/[+%]/g, '')}%</span>
                        <span className="text-neutral-600 font-mono text-[9px]">
                          vs prev({kpi.prev || '0'})
                        </span>
                      </div>
                    )}
                    <ArrowUpRight className="w-3.5 h-3.5 text-neutral-800 absolute bottom-3 right-3" />
                  </div>
                ))}
              </div>
            )}

            {/* Keyword Rankings List section */}
            <div>
              <h3 className="text-lg font-bold font-display text-white mb-3">Keyword Rankings</h3>
              <div className="bg-[#080808] border border-neutral-900 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-900 text-[10px] font-mono tracking-wider text-neutral-500 bg-neutral-950/40">
                      <th className="py-2.5 px-5">Keyword</th>
                      <th className="py-2.5 px-5 text-right">Previous Rank</th>
                      <th className="py-2.5 px-5 text-right">Current Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {slide.tableData && slide.tableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/10">
                        <td className="py-2.5 px-5 text-neutral-300 font-medium">
                          <EditableText
                            text={row.keyword}
                            onSave={(val) => {
                              const updated = [...(slide.tableData || [])];
                              updated[idx].keyword = val;
                              onUpdateSlide({ ...slide, tableData: updated });
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-5 text-right font-mono text-neutral-400">
                          <EditableText
                            text={row.prev}
                            onSave={(val) => {
                              const updated = [...(slide.tableData || [])];
                              updated[idx].prev = val;
                              onUpdateSlide({ ...slide, tableData: updated });
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-5 text-right font-mono font-bold text-white">
                          <EditableText
                            text={row.current}
                            onSave={(val) => {
                              const updated = [...(slide.tableData || [])];
                              updated[idx].current = val;
                              onUpdateSlide({ ...slide, tableData: updated });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 06: WEBSITE ANALYTICS ==================== */}
        {slide.type === 'website_analytics' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Labels and 4 source cards */}
            <div className="mb-4">
              <div className="flex justify-between text-[10px] font-mono tracking-wider text-neutral-500 uppercase px-1 mb-1.5">
                <span>Source</span>
                <span>Users</span>
              </div>
              {slide.kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {slide.kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
                      <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase">
                        <EditableText
                          text={kpi.label}
                          onSave={(val) => {
                            const updated = [...(slide.kpis || [])];
                            updated[idx].label = val;
                            onUpdateSlide({ ...slide, kpis: updated });
                          }}
                        />
                      </span>
                      <span className="text-2xl font-black font-display text-white tracking-tight mt-1">
                        <EditableText
                          text={kpi.value}
                          onSave={(val) => {
                            const updated = [...(slide.kpis || [])];
                            updated[idx].value = val;
                            onUpdateSlide({ ...slide, kpis: updated });
                          }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Split row: Left insights, Right top performing pages */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1">
              <div className="md:col-span-5 flex flex-col gap-2">
                <h3 className="text-base font-bold font-display text-white mb-1.5">Key Website Insights</h3>
                {slide.customData?.insights && (slide.customData.insights as any[]).map((ins, idx) => (
                  <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-xl px-4 py-3 flex flex-col justify-center">
                    <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase leading-none">
                      <EditableText
                        text={ins.label}
                        onSave={(val) => {
                          const updated = { ...slide.customData };
                          updated.insights[idx].label = val;
                          onUpdateSlide({ ...slide, customData: updated });
                        }}
                      />
                    </span>
                    <span className="text-xs font-semibold text-white font-sans mt-1.5">
                      <EditableText
                        text={ins.value}
                        onSave={(val) => {
                          const updated = { ...slide.customData };
                          updated.insights[idx].value = val;
                          onUpdateSlide({ ...slide, customData: updated });
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>

              <div className="md:col-span-7 flex flex-col">
                <h3 className="text-base font-bold font-display text-white mb-2">Top Performing Pages</h3>
                <div className="bg-[#080808] border border-neutral-900 rounded-2xl overflow-hidden flex-1 flex flex-col justify-center">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-900 text-[10px] font-mono tracking-wider text-neutral-500 bg-neutral-950/40">
                        <th className="py-2 px-4">Page URL</th>
                        <th className="py-2 px-4 text-right">Page Views</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {slide.customData?.pages && (slide.customData.pages as any[]).map((row, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/10">
                          <td className="py-2.5 px-4 text-neutral-300 font-medium">
                            <EditableText
                              text={row.url}
                              onSave={(val) => {
                                const updated = { ...slide.customData };
                                updated.pages[idx].url = val;
                                onUpdateSlide({ ...slide, customData: updated });
                              }}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                            <EditableText
                              text={row.views}
                              onSave={(val) => {
                                const updated = { ...slide.customData };
                                updated.pages[idx].views = val;
                                onUpdateSlide({ ...slide, customData: updated });
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 07: SOCIAL MEDIA PERFORMANCE ==================== */}
        {slide.type === 'social_performance' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* 4 social columns */}
            {slide.customData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 my-auto">
                {/* Facebook */}
                <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-blue-500">
                      <Facebook className="w-5 h-5 fill-blue-500" />
                      <span className="text-xs font-bold tracking-wider uppercase font-mono text-white">FACEBOOK</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Reach</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.facebook.reach} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.facebook.reach = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Impressions</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.facebook.impressions} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.facebook.impressions = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Engagement</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.facebook.engagement} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.facebook.engagement = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t border-neutral-900 pt-3">
                    <span className="text-[10px] font-mono text-neutral-500">Follower Growth</span>
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      <EditableText text={slide.customData.facebook.followerGrowth} onSave={(val) => {
                        const updated = { ...slide.customData };
                        updated.facebook.followerGrowth = val;
                        onUpdateSlide({ ...slide, customData: updated });
                      }} />
                    </span>
                  </div>
                </div>

                {/* Instagram */}
                <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-pink-500">
                      <Instagram className="w-5 h-5" />
                      <span className="text-xs font-bold tracking-wider uppercase font-mono text-white">INSTAGRAM</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Reach</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.instagram.reach} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.instagram.reach = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Impressions</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.instagram.impressions} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.instagram.impressions = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Engagement</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.instagram.engagement} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.instagram.engagement = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t border-neutral-900 pt-3">
                    <span className="text-[10px] font-mono text-neutral-500">Follower Growth</span>
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      <EditableText text={slide.customData.instagram.followerGrowth} onSave={(val) => {
                        const updated = { ...slide.customData };
                        updated.instagram.followerGrowth = val;
                        onUpdateSlide({ ...slide, customData: updated });
                      }} />
                    </span>
                  </div>
                </div>

                {/* LinkedIn */}
                <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-sky-600">
                      <Linkedin className="w-5 h-5 fill-sky-600" />
                      <span className="text-xs font-bold tracking-wider uppercase font-mono text-white">LINKEDIN</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Reach</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.linkedin.reach} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.linkedin.reach = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Impressions</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.linkedin.impressions} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.linkedin.impressions = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Engagement</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.linkedin.engagement} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.linkedin.engagement = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t border-neutral-900 pt-3">
                    <span className="text-[10px] font-mono text-neutral-500">Follower Growth</span>
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      <EditableText text={slide.customData.linkedin.followerGrowth} onSave={(val) => {
                        const updated = { ...slide.customData };
                        updated.linkedin.followerGrowth = val;
                        onUpdateSlide({ ...slide, customData: updated });
                      }} />
                    </span>
                  </div>
                </div>

                {/* YouTube */}
                <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-red-600">
                      <Youtube className="w-5 h-5" />
                      <span className="text-xs font-bold tracking-wider uppercase font-mono text-white">YOUTUBE</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Views</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.youtube.views} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.youtube.views = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-900/50 pb-2">
                        <span className="text-[10px] font-mono text-neutral-500">Watch Time</span>
                        <span className="text-xs font-mono font-semibold text-white">
                          <EditableText text={slide.customData.youtube.watchTime} onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.youtube.watchTime = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }} />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t border-neutral-900 pt-3">
                    <span className="text-[10px] font-mono text-neutral-500">Subscribers</span>
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      <EditableText text={slide.customData.youtube.subscribers} onSave={(val) => {
                        const updated = { ...slide.customData };
                        updated.youtube.subscribers = val;
                        onUpdateSlide({ ...slide, customData: updated });
                      }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== SLIDE 08: CONTENT PERFORMANCE ==================== */}
        {slide.type === 'content_performance' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Content Published tag */}
            <div className="mb-4">
              <div className="inline-block bg-[#0a0a0a] border border-neutral-900 text-neutral-300 text-xs font-sans px-4 py-2.5 rounded-full select-none">
                <EditableText text={slide.subTag || ''} onSave={(val) => handleTextChange('subTag', val)} />
              </div>
            </div>

            {/* 5 metrics cards */}
            {slide.kpis && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {slide.kpis.map((kpi, idx) => (
                  <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between min-h-[90px]">
                    <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase">
                      <EditableText
                        text={kpi.label}
                        onSave={(val) => {
                          const updated = [...(slide.kpis || [])];
                          updated[idx].label = val;
                          onUpdateSlide({ ...slide, kpis: updated });
                        }}
                      />
                    </span>
                    <span className="text-2xl font-black font-display text-white tracking-tight mt-1.5 block">
                      <EditableText
                        text={kpi.value}
                        onSave={(val) => {
                          const updated = [...(slide.kpis || [])];
                          updated[idx].value = val;
                          onUpdateSlide({ ...slide, kpis: updated });
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Split row: Top performing content vs Insights */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1">
              <div className="md:col-span-7 flex flex-col justify-center">
                <h3 className="text-base font-bold font-display text-white mb-2.5">Top Performing Content</h3>
                <div className="bg-[#080808] border border-neutral-900 rounded-2xl overflow-hidden flex-1 flex flex-col justify-center">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-900 text-[10px] font-mono tracking-wider text-neutral-500 bg-neutral-950/40">
                        <th className="py-2.5 px-4">Campaign Name</th>
                        <th className="py-2.5 px-4 text-right">Reach</th>
                        <th className="py-2.5 px-4 text-right">Engagement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {slide.tableData && slide.tableData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/10">
                          <td className="py-2.5 px-4 text-neutral-300 font-medium">
                            <EditableText
                              text={row.name}
                              onSave={(val) => {
                                const updated = [...(slide.tableData || [])];
                                updated[idx].name = val;
                                onUpdateSlide({ ...slide, tableData: updated });
                              }}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                            <EditableText
                              text={row.reach}
                              onSave={(val) => {
                                const updated = [...(slide.tableData || [])];
                                updated[idx].reach = val;
                                onUpdateSlide({ ...slide, tableData: updated });
                              }}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                            <EditableText
                              text={row.engagement}
                              onSave={(val) => {
                                const updated = [...(slide.tableData || [])];
                                updated[idx].engagement = val;
                                onUpdateSlide({ ...slide, tableData: updated });
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col justify-center gap-2">
                <h3 className="text-base font-bold font-display text-white mb-1.5">Content Insights</h3>
                {slide.customData?.insights && (slide.customData.insights as any[]).map((ins, idx) => (
                  <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-xl px-4 py-3.5 flex flex-col justify-center">
                    <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase leading-none">
                      <EditableText
                        text={ins.label}
                        onSave={(val) => {
                          const updated = { ...slide.customData };
                          updated.insights[idx].label = val;
                          onUpdateSlide({ ...slide, customData: updated });
                        }}
                      />
                    </span>
                    <span className="text-xs font-semibold text-white font-sans mt-2">
                      <EditableText
                        text={ins.value}
                        onSave={(val) => {
                          const updated = { ...slide.customData };
                          updated.insights[idx].value = val;
                          onUpdateSlide({ ...slide, customData: updated });
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 09: META ADS PERFORMANCE ==================== */}
        {slide.type === 'meta_ads' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Core comparative campaigns list table */}
            <div className="bg-[#080808] border border-neutral-900 rounded-2xl overflow-hidden mb-5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-900 text-[10px] font-mono tracking-wider text-neutral-500 bg-neutral-950/40">
                    <th className="py-2.5 px-5">Campaign Name</th>
                    <th className="py-2.5 px-5 text-right">Spend</th>
                    <th className="py-2.5 px-5 text-right">Leads</th>
                    <th className="py-2.5 px-5 text-right">CPL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {slide.tableData && slide.tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/10">
                      <td className="py-2.5 px-5 text-neutral-300 font-medium">
                        <EditableText
                          text={row.name}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].name = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono text-neutral-400">
                        <EditableText
                          text={row.spend}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].spend = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono font-bold text-white">
                        <EditableText
                          text={row.leads}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].leads = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono font-bold text-white">
                        <EditableText
                          text={row.cpl}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].cpl = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Performance metrics grid */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold tracking-wider text-neutral-400 font-mono uppercase mb-2.5">Performance Metrics</h3>
              {slide.kpis && (
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  {slide.kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-xl p-3 flex flex-col justify-between min-h-[75px]">
                      <span className="text-[8px] font-mono tracking-wider text-neutral-500 uppercase leading-none">
                        <EditableText
                          text={kpi.label}
                          onSave={(val) => {
                            const updated = [...(slide.kpis || [])];
                            updated[idx].label = val;
                            onUpdateSlide({ ...slide, kpis: updated });
                          }}
                        />
                      </span>
                      <span className="text-sm font-black font-display text-white tracking-tight mt-1.5 block">
                        <EditableText
                          text={kpi.value}
                          onSave={(val) => {
                            const updated = [...(slide.kpis || [])];
                            updated[idx].value = val;
                            onUpdateSlide({ ...slide, kpis: updated });
                          }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Key findings section */}
            <div>
              <h3 className="text-lg font-bold font-display text-white mb-2">Key Findings</h3>
              {slide.customData?.findings && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {(slide.customData.findings as any[]).map((item, idx) => (
                    <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-xl p-4">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">
                        <EditableText
                          text={item.label}
                          onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.findings[idx].label = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }}
                        />
                      </span>
                      <span className="text-xs font-bold font-display text-white mt-1.5 block">
                        <EditableText
                          text={item.value}
                          onSave={(val) => {
                            const updated = { ...slide.customData };
                            updated.findings[idx].value = val;
                            onUpdateSlide({ ...slide, customData: updated });
                          }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SLIDE 10: GOOGLE ADS PERFORMANCE ==================== */}
        {slide.type === 'google_ads' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Campaigns table */}
            <div className="bg-[#080808] border border-neutral-900 rounded-2xl overflow-hidden mb-5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-900 text-[10px] font-mono tracking-wider text-neutral-500 bg-neutral-950/40">
                    <th className="py-2.5 px-5">Campaign Name</th>
                    <th className="py-2.5 px-5 text-right">Spend</th>
                    <th className="py-2.5 px-5 text-right">Leads</th>
                    <th className="py-2.5 px-5 text-right">CPL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {slide.tableData && slide.tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/10">
                      <td className="py-2.5 px-5 text-neutral-300 font-medium">
                        <EditableText
                          text={row.name}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].name = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono text-neutral-400">
                        <EditableText
                          text={row.spend}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].spend = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono font-bold text-white">
                        <EditableText
                          text={row.leads}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].leads = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono font-bold text-white">
                        <EditableText
                          text={row.cpl}
                          onSave={(val) => {
                            const updated = [...(slide.tableData || [])];
                            updated[idx].cpl = val;
                            onUpdateSlide({ ...slide, tableData: updated });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Split row: Campaign overview metrics vs Top Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1">
              {/* Campaign overview metrics left */}
              <div className="md:col-span-5 flex flex-col justify-center">
                <h3 className="text-base font-bold font-display text-white mb-2">Campaign Overview Metrics</h3>
                {slide.kpis && (
                  <div className="grid grid-cols-2 gap-3.5">
                    {slide.kpis.map((kpi, idx) => (
                      <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-xl p-4 flex flex-col justify-between min-h-[75px]">
                        <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase leading-none">
                          <EditableText
                            text={kpi.label}
                            onSave={(val) => {
                              const updated = [...(slide.kpis || [])];
                              updated[idx].label = val;
                              onUpdateSlide({ ...slide, kpis: updated });
                            }}
                          />
                        </span>
                        <span className="text-lg font-black font-display text-white mt-1.5 block">
                          <EditableText
                            text={kpi.value}
                            onSave={(val) => {
                              const updated = [...(slide.kpis || [])];
                              updated[idx].value = val;
                              onUpdateSlide({ ...slide, kpis: updated });
                            }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Keywords right */}
              <div className="md:col-span-7 flex flex-col justify-center">
                <h3 className="text-base font-bold font-display text-white mb-2">Top Keywords</h3>
                <div className="bg-[#080808] border border-neutral-900 rounded-2xl overflow-hidden flex-1 flex flex-col justify-center">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-900 text-[10px] font-mono tracking-wider text-neutral-500 bg-neutral-950/40">
                        <th className="py-2.5 px-4">Keyword</th>
                        <th className="py-2.5 px-4 text-right">Clicks</th>
                        <th className="py-2.5 px-4 text-right">Conversions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {slide.customData?.keywords && (slide.customData.keywords as any[]).map((row, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/10">
                          <td className="py-2.5 px-4 text-neutral-300 font-medium">
                            <EditableText
                              text={row.kw}
                              onSave={(val) => {
                                const updated = { ...slide.customData };
                                updated.keywords[idx].kw = val;
                                onUpdateSlide({ ...slide, customData: updated });
                              }}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                            <EditableText
                              text={row.clicks}
                              onSave={(val) => {
                                const updated = { ...slide.customData };
                                updated.keywords[idx].clicks = val;
                                onUpdateSlide({ ...slide, customData: updated });
                              }}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                            <EditableText
                              text={row.conv}
                              onSave={(val) => {
                                const updated = { ...slide.customData };
                                updated.keywords[idx].conv = val;
                                onUpdateSlide({ ...slide, customData: updated });
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 11: LEAD GENERATION REPORT ==================== */}
        {slide.type === 'lead_gen' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Split layout: left column, right Observations */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch flex-1">
              {/* Left Column: Campaigns table & Lead Quality analysis */}
              <div className="md:col-span-7 flex flex-col justify-between gap-4">
                <div className="bg-[#080808] border border-neutral-900 rounded-2xl overflow-hidden flex-1 flex flex-col justify-center">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-900 text-[10px] font-mono tracking-wider text-neutral-500 bg-neutral-950/40">
                        <th className="py-2.5 px-5">Campaign Name</th>
                        <th className="py-2.5 px-5 text-right">Leads Generated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {slide.tableData && slide.tableData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/10">
                          <td className="py-2.5 px-5 text-neutral-300 font-medium">
                            <EditableText
                              text={row.source}
                              onSave={(val) => {
                                const updated = [...(slide.tableData || [])];
                                updated[idx].source = val;
                                onUpdateSlide({ ...slide, tableData: updated });
                              }}
                            />
                          </td>
                          <td className="py-2.5 px-5 text-right font-mono font-bold text-white">
                            <EditableText
                              text={row.leads}
                              onSave={(val) => {
                                const updated = [...(slide.tableData || [])];
                                updated[idx].leads = val;
                                onUpdateSlide({ ...slide, tableData: updated });
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="text-sm font-bold font-display text-white mb-2">Lead Quality Analysis</h3>
                  {slide.kpis && (
                    <div className="grid grid-cols-3 gap-4">
                      {slide.kpis.map((kpi, idx) => (
                        <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-2xl p-4">
                          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">
                            <EditableText
                              text={kpi.label}
                              onSave={(val) => {
                                const updated = [...(slide.kpis || [])];
                                updated[idx].label = val;
                                onUpdateSlide({ ...slide, kpis: updated });
                              }}
                            />
                          </span>
                          <span className="text-xl font-bold font-display text-white mt-1.5 block">
                            <EditableText
                              text={kpi.value}
                              onSave={(val) => {
                                const updated = [...(slide.kpis || [])];
                                updated[idx].value = val;
                                onUpdateSlide({ ...slide, kpis: updated });
                              }}
                            />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Observations stack */}
              <div className="md:col-span-5 flex flex-col justify-center">
                <h3 className="text-lg font-bold font-display text-white mb-3">Observations</h3>
                {slide.customData?.observations && (
                  <div className="space-y-4">
                    {(slide.customData.observations as any[]).map((item, idx) => (
                      <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-xl p-4">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">
                          <EditableText
                            text={item.label}
                            onSave={(val) => {
                              const updated = { ...slide.customData };
                              updated.observations[idx].label = val;
                              onUpdateSlide({ ...slide, customData: updated });
                            }}
                          />
                        </span>
                        <span className="text-sm font-bold font-display text-white mt-1.5 block">
                          <EditableText
                            text={item.value}
                            onSave={(val) => {
                              const updated = { ...slide.customData };
                              updated.observations[idx].value = val;
                              onUpdateSlide({ ...slide, customData: updated });
                            }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 12: ACTIVITIES COMPLETED ==================== */}
        {slide.type === 'activities_completed' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-5">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* 4 checklist columns */}
            {slide.listSections && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch my-auto">
                {slide.listSections.map((section, sIdx) => (
                  <div key={sIdx} className="bg-[#080808] border border-neutral-900 rounded-2xl p-6 flex flex-col">
                    <h3 className="text-sm font-bold font-display text-white tracking-tight border-b border-neutral-900 pb-2.5 mb-3">
                      <EditableText
                        text={section.title}
                        onSave={(val) => {
                          const updated = [...(slide.listSections || [])];
                          updated[sIdx].title = val;
                          onUpdateSlide({ ...slide, listSections: updated });
                        }}
                      />
                    </h3>
                    <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                      {section.items.map((item, iIdx) => (
                        <BulletItem
                          key={iIdx}
                          text={item}
                          onSave={(val) => {
                            const updated = [...(slide.listSections || [])];
                            updated[sIdx].items[iIdx] = val;
                            onUpdateSlide({ ...slide, listSections: updated });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== SLIDE 13: CHALLENGES & SOLUTIONS ==================== */}
        {slide.type === 'challenges_solutions' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-5">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Left Image vs Right challenges lists */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch flex-1 my-2">
              <div className="md:col-span-5 flex flex-col">
                <ImageBox slotId="img1" className="flex-1 min-h-0" label="Image" />
              </div>

              <div className="md:col-span-7 flex flex-col justify-between gap-6">
                {slide.customData && (
                  <>
                    <div className="space-y-4">
                      {/* Challenges faced */}
                      <div>
                        <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-2">Challenges Faced</h3>
                        <div className="space-y-1.5">
                          {(slide.customData.challenges as string[]).map((chal, idx) => (
                            <div key={idx} className="text-xs text-neutral-400 font-sans leading-relaxed flex items-baseline gap-2">
                              <span className="font-mono text-neutral-600 text-[10px]">{idx + 1}.</span>
                              <EditableText text={chal} onSave={(val) => {
                                const updated = { ...slide.customData };
                                updated.challenges[idx] = val;
                                onUpdateSlide({ ...slide, customData: updated });
                              }} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Solutions Implemented */}
                      <div>
                        <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-2">Solutions Implemented</h3>
                        <div className="space-y-1.5">
                          {(slide.customData.solutions as string[]).map((sol, idx) => (
                            <div key={idx} className="text-xs text-neutral-400 font-sans leading-relaxed flex items-baseline gap-2">
                              <span className="font-mono text-neutral-600 text-[10px]">{idx + 1}.</span>
                              <EditableText text={sol} onSave={(val) => {
                                const updated = { ...slide.customData };
                                updated.solutions[idx] = val;
                                onUpdateSlide({ ...slide, customData: updated });
                              }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Results Achieved */}
                    <div>
                      <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-2.5">Results Achieved</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {(slide.customData.results as any[]).map((res, idx) => (
                          <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-2xl p-4">
                            <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">
                              <EditableText text={res.label} onSave={(val) => {
                                const updated = { ...slide.customData };
                                updated.results[idx].label = val;
                                onUpdateSlide({ ...slide, customData: updated });
                              }} />
                            </span>
                            <span className="text-lg font-black font-display text-white mt-1 block">
                              <EditableText text={res.value} onSave={(val) => {
                                const updated = { ...slide.customData };
                                updated.results[idx].value = val;
                                onUpdateSlide({ ...slide, customData: updated });
                              }} />
                            </span>
                            {res.growth && (
                              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                                <span>↑ {res.growth.replace(/[+%]/g, '')}%</span>
                                <span className="text-neutral-600 font-mono text-[9px]">
                                  vs prev({res.prev || '0'})
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 14: COMPETITOR INSIGHTS ==================== */}
        {slide.type === 'competitor_insights' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Side-by-Side Swipable Columns (Single Item View) */}
            <div className="grid grid-cols-2 gap-10 flex-1 min-h-0 relative">
              {/* SEO COLUMN */}
              <div className="flex flex-col min-h-0 relative">
                <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-blue-500" /> SEO Competitors
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-neutral-600 font-mono uppercase">Node Analysis Active</span>
                    <div className="flex gap-1">
                      {(slide.customData?.seoCompetitors || []).map((_: any, i: number) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${i === (slide.customData?.selectedSeoIdx || 0) ? 'bg-blue-500' : 'bg-neutral-800'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center relative">
                   <div className="w-full flex overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4 items-center">
                    {(slide.customData?.seoCompetitors || []).map((comp: any, i: number) => (
                      <div key={i} className="w-full flex-shrink-0 snap-center px-1">
                        <CompetitorDetailCard
                          comp={comp}
                          type="seo"
                          isSelected={slide.customData?.selectedSeoIdx === i}
                          onClick={() => {
                            const updated = { ...slide.customData, selectedSeoIdx: slide.customData.selectedSeoIdx === i ? null : i };
                            onUpdateSlide({ ...slide, customData: updated });
                          }}
                        />
                      </div>
                    ))}
                    {(!slide.customData?.seoCompetitors || slide.customData.seoCompetitors.length === 0) && (
                      <div className="w-full h-44 bg-[#080808]/50 border border-neutral-900 rounded-[2.5rem] p-6 border-dashed flex items-center justify-center">
                        <p className="text-neutral-700 text-[10px] font-mono uppercase tracking-[0.3em] animate-pulse text-center leading-relaxed">
                          Synchronizing SEO Nodes...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Swipe Guidance */}
                  <div className="absolute -bottom-2 left-0 right-0 flex justify-center">
                     <span className="text-[8px] text-neutral-700 font-mono uppercase tracking-widest animate-pulse">← Swipe Nodes →</span>
                  </div>
                </div>

                {/* Detail View for SEO */}
                <AnimatePresence>
                  {slide.customData?.selectedSeoIdx !== null && slide.customData?.selectedSeoIdx !== undefined && slide.customData?.seoCompetitors?.[slide.customData.selectedSeoIdx] && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 z-50 p-6 bg-[#070708] flex items-center justify-center backdrop-blur-md"
                    >
                      <div className="glass-panel p-8 rounded-2xl border-l-4 border-l-blue-500 bg-[#0b0f19] relative group w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="font-display font-bold text-white text-sm uppercase tracking-widest">
                            {slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].name}
                          </h4>
                          <div className="flex items-center gap-2">
                            {slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].url && (
                              <a
                                href={slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-400/20 transition-all border border-blue-500/20"
                                title="Visit Website"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => onUpdateSlide({ ...slide, customData: { ...slide.customData, selectedSeoIdx: null } })}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
                            >
                              <ChevronLeft size={14} className="rotate-90" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase block mb-2">Inferred Actions</span>
                            <div className="space-y-2">
                              {(Array.isArray(slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].inferred_actions)
                                ? slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].inferred_actions
                                : [slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].inferred_actions]
                              ).map((action: string, i: number) => (
                                <p key={i} className="text-xs text-white/70 leading-relaxed font-sans">{action}</p>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6 pt-2 border-t border-white/5">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-green-500 uppercase block mb-2">Strengths</span>
                              <ul className="space-y-1.5">
                                {(Array.isArray(slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].strengths)
                                  ? slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].strengths
                                  : [slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].strengths]
                                ).map((s: string, i: number) => (
                                  <li key={i} className="text-[11px] text-white/50 leading-tight flex gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase block mb-2">Weaknesses</span>
                              <ul className="space-y-1.5">
                                {(Array.isArray(slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].weaknesses)
                                  ? slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].weaknesses
                                  : [slide.customData.seoCompetitors[slide.customData.selectedSeoIdx].weaknesses]
                                ).map((w: string, i: number) => (
                                  <li key={i} className="text-[11px] text-white/50 leading-tight flex gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    {w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* PERFORMANCE COLUMN */}
              <div className="flex flex-col min-h-0 relative">
                <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-blue-500" /> Performance Competitors
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-neutral-600 font-mono uppercase">VECTORS ALIGNED</span>
                    <div className="flex gap-1">
                      {(slide.customData?.performanceCompetitors || []).map((_: any, i: number) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${i === (slide.customData?.selectedPerfIdx || 0) ? 'bg-blue-500' : 'bg-neutral-800'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center relative">
                   <div className="w-full flex overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4 items-center">
                    {(slide.customData?.performanceCompetitors || []).map((comp: any, i: number) => (
                      <div key={i} className="w-full flex-shrink-0 snap-center px-1">
                        <CompetitorDetailCard
                          comp={comp}
                          type="perf"
                          isSelected={slide.customData?.selectedPerfIdx === i}
                          onClick={() => {
                            const updated = { ...slide.customData, selectedPerfIdx: slide.customData.selectedPerfIdx === i ? null : i };
                            onUpdateSlide({ ...slide, customData: updated });
                          }}
                        />
                      </div>
                    ))}
                    {(!slide.customData?.performanceCompetitors || slide.customData.performanceCompetitors.length === 0) && (
                      <div className="w-full h-44 bg-[#080808]/50 border border-neutral-900 rounded-[2.5rem] p-6 border-dashed flex items-center justify-center">
                        <p className="text-neutral-700 text-[10px] font-mono uppercase tracking-[0.3em] animate-pulse text-center leading-relaxed">
                          Establishing Ad Vectors...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Swipe Guidance */}
                  <div className="absolute -bottom-2 left-0 right-0 flex justify-center">
                     <span className="text-[8px] text-neutral-700 font-mono uppercase tracking-widest animate-pulse">← Swipe Nodes →</span>
                  </div>
                </div>

                {/* Detail View for Performance */}
                <AnimatePresence>
                  {slide.customData?.selectedPerfIdx !== null && slide.customData?.selectedPerfIdx !== undefined && slide.customData?.performanceCompetitors?.[slide.customData.selectedPerfIdx] && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 z-50 p-6 bg-[#070708] flex items-center justify-center backdrop-blur-md"
                    >
                      <div className="glass-panel p-8 rounded-2xl border-l-4 border-l-blue-500 bg-[#0b0f19] relative group w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="font-display font-bold text-white text-sm uppercase tracking-widest">
                            {slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].name}
                          </h4>
                          <div className="flex items-center gap-2">
                            {slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].url && (
                              <a
                                href={slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-400/20 transition-all border border-blue-500/20"
                                title="Visit Website"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => onUpdateSlide({ ...slide, customData: { ...slide.customData, selectedPerfIdx: null } })}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
                            >
                              <ChevronLeft size={14} className="rotate-90" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase block mb-2">Inferred Actions</span>
                            <div className="space-y-2">
                              {(Array.isArray(slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].inferred_actions)
                                ? slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].inferred_actions
                                : [slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].inferred_actions]
                              ).map((action: string, i: number) => (
                                <p key={i} className="text-xs text-white/70 leading-relaxed font-sans">{action}</p>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6 pt-2 border-t border-white/5">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-green-500 uppercase block mb-2">Strengths</span>
                              <ul className="space-y-1.5">
                                {(Array.isArray(slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].strengths)
                                  ? slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].strengths
                                  : [slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].strengths]
                                ).map((s: string, i: number) => (
                                  <li key={i} className="text-[11px] text-white/50 leading-tight flex gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase block mb-2">Weaknesses</span>
                              <ul className="space-y-1.5">
                                {(Array.isArray(slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].weaknesses)
                                  ? slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].weaknesses
                                  : [slide.customData.performanceCompetitors[slide.customData.selectedPerfIdx].weaknesses]
                                ).map((w: string, i: number) => (
                                  <li key={i} className="text-[11px] text-white/50 leading-tight flex gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    {w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Key Observations (2 Boxes) & Opportunity (2 Points) */}
            <div className="grid grid-cols-2 gap-8 items-stretch flex-1 min-h-0">
              <div className="flex flex-col gap-3">
                <div className="bg-[#0a0a0a] border border-neutral-900 text-neutral-300 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full inline-block self-start">
                  Key Observations
                </div>
                <div className="grid grid-rows-2 gap-3 flex-1">
                  <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-center">
                    <span className="text-[9px] font-mono text-white uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">SEO Intelligence</span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      <EditableText text={slide.customData?.seoObservation || ''} onSave={(val) => {
                        const updated = { ...slide.customData, seoObservation: val };
                        onUpdateSlide({ ...slide, customData: updated });
                      }} textarea={true} />
                    </p>
                  </div>
                  <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-center">
                    <span className="text-[9px] font-mono text-white uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Performance Intelligence</span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      <EditableText text={slide.customData?.performanceObservation || ''} onSave={(val) => {
                        const updated = { ...slide.customData, performanceObservation: val };
                        onUpdateSlide({ ...slide, customData: updated });
                      }} textarea={true} />
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-[#0a0a0a] border border-neutral-900 text-neutral-300 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full inline-block self-start">
                  Opportunity
                </div>
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-around flex-1">
                  <div className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-tighter">SEO Strategy</span>
                      <p className="text-sm font-medium text-white mt-1 leading-snug">
                        <EditableText text={slide.customData?.seoOpportunity || ''} onSave={(val) => {
                          const updated = { ...slide.customData, seoOpportunity: val };
                          onUpdateSlide({ ...slide, customData: updated });
                        }} textarea={true} />
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-neutral-800 my-2" />
                  <div className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Performance Strategy</span>
                      <p className="text-sm font-medium text-white mt-1 leading-snug">
                        <EditableText text={slide.customData?.performanceOpportunity || ''} onSave={(val) => {
                          const updated = { ...slide.customData, performanceOpportunity: val };
                          onUpdateSlide({ ...slide, customData: updated });
                        }} textarea={true} />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 15: RECOMMENDATIONS ==================== */}
        {slide.type === 'recommendations' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-5">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* Grid rows list */}
            {slide.listItems && (
              <div className="space-y-2.5 my-auto max-w-4xl mx-auto w-full">
                {slide.listItems.map((rec, idx) => (
                  <div key={idx} className="bg-[#080808] border border-neutral-900 rounded-2xl px-6 py-3.5 flex items-center gap-6 hover:border-neutral-800 transition-colors">
                    <span className="font-mono text-neutral-600 text-base font-bold">0{idx + 1}</span>
                    <span className="text-sm font-semibold font-display text-white leading-relaxed">
                      <EditableText
                        text={rec}
                        onSave={(val) => {
                          const updated = [...(slide.listItems || [])];
                          updated[idx] = val;
                          onUpdateSlide({ ...slide, listItems: updated });
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== SLIDE 16: NEXT MONTH ACTION PLAN ==================== */}
        {slide.type === 'action_plan' && (
          <div className="flex-1 flex flex-col justify-between py-2 overflow-y-auto">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-3 mb-4">
              <h2 className="text-3xl font-bold font-display text-white">
                <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans max-w-md text-right leading-relaxed">
                <EditableText
                  text={slide.metadata?.rightDesc || ''}
                  onSave={(val) => handleMetaChange('rightDesc', val)}
                  textarea={true}
                />
              </p>
            </div>

            {/* 4 columns (similar to Slide 12) */}
            {slide.listSections && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch mb-5">
                {slide.listSections.map((section, sIdx) => (
                  <div key={sIdx} className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between">
                    <h3 className="text-xs font-bold font-display text-white tracking-tight border-b border-neutral-900 pb-2 mb-2">
                      <EditableText
                        text={section.title}
                        onSave={(val) => {
                          const updated = [...(slide.listSections || [])];
                          updated[sIdx].title = val;
                          onUpdateSlide({ ...slide, listSections: updated });
                        }}
                      />
                    </h3>
                    <div className="space-y-2 flex-1 flex flex-col justify-center">
                      {section.items.map((item, iIdx) => (
                        <BulletItem
                          key={iIdx}
                          text={item}
                          onSave={(val) => {
                            const updated = [...(slide.listSections || [])];
                            updated[sIdx].items[iIdx] = val;
                            onUpdateSlide({ ...slide, listSections: updated });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Conclusion text banner below */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border-t border-neutral-900 pt-3 items-center">
              <div className="md:col-span-3">
                <h3 className="text-lg font-bold font-display text-white uppercase tracking-wider leading-none">Conclusion</h3>
              </div>
              <div className="md:col-span-9 bg-neutral-950/20 p-4 border border-neutral-900 rounded-2xl">
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  <EditableText text={slide.customData?.conclusion || ''} onSave={(val) => {
                    const updated = { ...slide.customData };
                    updated.conclusion = val;
                    onUpdateSlide({ ...slide, customData: updated });
                  }} textarea={true} />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 17: THANK YOU ==================== */}
        {slide.type === 'thank_you' && (
          <div className="flex-1 flex flex-col justify-between py-12 relative overflow-hidden">
            {/* Ambient center Spotlight glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-neutral-800/10 blur-3xl pointer-events-none" />

            <div className="my-auto text-center z-10 space-y-8">
              {/* BNB customized elegant logo */}
              <div className="inline-flex flex-col items-center gap-1 bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 shadow-2xl">
                {slide.images?.logo || userAvatarUrl ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center bg-black">
                    <img
                      src={slide.images?.logo || userAvatarUrl}
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 border-2 border-white flex items-center justify-center font-display font-black text-2xl tracking-tighter text-white bg-black">
                    B N B
                  </div>
                )}
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white mt-2 font-bold">
                  <EditableText
                    text={slide.metadata?.preparedBy || 'BLACK AND BOLD'}
                    onSave={(val) => handleMetaChange('preparedBy', val)}
                  />
                </span>
                <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-neutral-500">
                  <EditableText
                    text={slide.metadata?.classification || 'MEDIA'}
                    onSave={(val) => handleMetaChange('classification', val)}
                  />
                </span>
              </div>

              {/* Thank you presentation slide text */}
              <div>
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-[0.1em] font-display text-white uppercase drop-shadow-lg">
                  <EditableText text={slide.title} onSave={(val) => handleTextChange('title', val)} />
                </h1>
                <p className="text-xs font-mono uppercase tracking-[0.4em] text-neutral-400 mt-4 block">
                  <EditableText
                    text={slide.metadata?.platform || 'BLACKNBOLD.IN'}
                    onSave={(val) => handleMetaChange('platform', val)}
                  />
                </p>
              </div>

              {/* Social platform accounts icons row */}
              <div className="flex justify-center items-center gap-5 pt-4">
                <div className="w-8 h-8 rounded-full border border-neutral-900 bg-[#080808] hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer text-neutral-400 hover:text-white">
                  <Linkedin className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-full border border-neutral-900 bg-[#080808] hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer text-neutral-400 hover:text-white">
                  <Instagram className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-full border border-neutral-900 bg-[#080808] hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer text-neutral-400 hover:text-white">
                  <Facebook className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-full border border-neutral-900 bg-[#080808] hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer text-neutral-400 hover:text-white">
                  <Twitter className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-full border border-neutral-900 bg-[#080808] hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer text-neutral-400 hover:text-white">
                  <Youtube className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-full border border-neutral-900 bg-[#080808] hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer text-neutral-400 hover:text-white">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER METADATA / INDEX INDICATOR */}
      <div className="z-10 w-full flex justify-between items-end text-[10px] font-mono tracking-wider text-neutral-600 border-t border-neutral-900/40 pt-2 mt-1 select-none">
        {slide.type === 'digital_cover' || slide.type === 'cover' ? (
          <div className="flex gap-12 text-left">
            <div>
              <span className="text-[9px] font-mono tracking-widest text-neutral-500 block uppercase mb-0.5">PREPARED BY</span>
              <span className="text-xs font-bold text-neutral-300 font-sans block">
                <EditableText
                  text={slide.metadata?.preparedBy || 'AdmarTech AI Engine V2.0'}
                  onSave={(val) => handleMetaChange('preparedBy', val)}
                />
              </span>
            </div>
            <div>
              <span className="text-[9px] font-mono tracking-widest text-neutral-500 block uppercase mb-0.5">PLATFORM</span>
              <span className="text-xs font-bold text-neutral-300 font-sans block">
                <EditableText
                  text={slide.metadata?.platform || 'Rltoursandtravels.Com'}
                  onSave={(val) => handleMetaChange('platform', val)}
                />
              </span>
            </div>
          </div>
        ) : (
          <span className="text-[10px] tracking-widest uppercase font-mono font-bold text-neutral-500">
            <EditableText
              text={slide.metadata?.client || 'RL TOURS & TRAVELS'}
              onSave={(val) => handleMetaChange('client', val)}
            />
          </span>
        )}

        <span className="text-neutral-500 font-sans text-3xl font-bold select-none opacity-50 hover:opacity-100 transition-opacity">
          <EditableText
            text={slide.footer || '01'}
            onSave={(val) => handleTextChange('footer', val)}
          />
        </span>
      </div>

    </div>
  );
};
