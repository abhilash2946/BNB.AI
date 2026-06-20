import React, { useState } from 'react';
import { Slide, SlideKPI } from '../../types';
import { ThreeDBarChart, ThreeDDonutChart, ThreeDGauge, ThreeDScatter, ThreeDFunnel, CircularGauge3D } from './ThreeDChart';
import { Edit2, TrendingUp, AlertTriangle, Lightbulb, Users, BarChart3, Globe, Award, ShieldAlert, Cpu, CheckCircle2, Bot } from 'lucide-react';

interface SlideRendererProps {
  slide: Slide;
  onUpdateSlide: (updatedSlide: Slide) => void;
  isEditMode: boolean; // Is user in editing panel mode
  siteImageUrl?: string;
  userAvatarUrl?: string;
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  onUpdateSlide,
  isEditMode,
  siteImageUrl,
  userAvatarUrl
}) => {
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  // Use base classes that scale based on container mode
  const modeScale = isEditMode ? "" : "presentation-scale";

  // Helper to handle simple text parameter changes
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

type EditableTextProps = {
  text: string;
  onSave: (val: string) => void;
  label?: string;
  className?: string;
  textarea?: boolean;
  placeholder?: string;
};

const EditableText: React.FC<EditableTextProps> = ({
  text,
  onSave,
  label = '',
  className = '',
  textarea = false,
  placeholder = 'Type value...'
}) => {
  const [editing, setEditing] = useState(false);
  const [tempText, setTempText] = useState(text);

  if (!isEditMode) {
    return <span className={className}>{text || placeholder}</span>;
  }

  if (editing) {
    return (
      <span className="inline-block w-full" onClick={e => e.stopPropagation()}>
        {textarea ? (
          <textarea
            value={tempText}
            onChange={e => setTempText(e.target.value)}
            onBlur={() => {
              setEditing(false);
              onSave(tempText);
            }}
            className="w-full text-slate-800 p-2 border-2 border-blue-500 rounded bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
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
            className="text-slate-800 px-1 py-0.5 border-2 border-blue-500 rounded bg-white focus:outline-none focus:ring-1 font-sans"
            autoFocus
          />
        )}
        <span className="text-[9px] text-blue-500 block">Press Enter/Click out to lock</span>
      </span>
    );
  }

  return (
    <span
      className={`relative group inline-block cursor-pointer border border-dashed border-transparent hover:border-blue-300 rounded hover:bg-blue-50/40 px-1 transition-all ${className}`}
      onClick={e => {
        e.stopPropagation();
        setEditing(true);
      }}
      onMouseEnter={() => setHoveredField(label)}
      onMouseLeave={() => setHoveredField(null)}
      title="Double click to edit inline"
    >
      <span>{text || placeholder}</span>
      <span className="absolute -top-4 right-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-blue-600 text-white text-[8px] py-0.5 px-1.5 rounded shadow pointer-events-none transition-opacity">
        <Edit2 className="w-2 h-2" /> Edit
      </span>
    </span>
  );
};

  // Helper to update individual KPI states
  const handleKPIChange = (index: number, updatedKPI: Partial<SlideKPI>) => {
    if (!slide.kpis) return;
    const newKpis = [...slide.kpis];
    newKpis[index] = { ...newKpis[index], ...updatedKPI };
    onUpdateSlide({ ...slide, kpis: newKpis });
  };

  // Common Header component for corporate styling
  const SlideHeader = () => (
    <div className="w-full flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
      <div className="flex flex-col">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <EditableText
            text={slide.title}
            onSave={(val) => handleTextChange('title', val)}
            label="Slide Title"
          />
        </div>
        {slide.subTag && (
          <span className="text-[10px] sm:text-xs font-mono font-semibold text-slate-400 tracking-widest uppercase mt-1">
            <EditableText
              text={slide.subTag}
              onSave={(val) => handleTextChange('subTag', val)}
              label="Tagline"
            />
          </span>
        )}
      </div>

      {slide.scoreTag && (
        <span className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 text-[10px] sm:text-sm font-mono font-bold tracking-wide rounded-full px-4 py-1.5 cursor-pointer transition-colors shrink-0">
          <EditableText
            text={slide.scoreTag}
            onSave={(val) => handleTextChange('scoreTag', val)}
            label="Header Score"
          />
        </span>
      )}
    </div>
  );

  // Common Footer branding element
  const SlideFooter = () => (
    <div className="w-full flex justify-between items-center text-[10px] font-mono tracking-widest text-slate-400 border-t border-slate-100 pt-2 mt-2">
      <span>
        <EditableText
          text={slide.footer || 'RL TOURS & TRAVELS'}
          onSave={(val) => handleTextChange('footer', val)}
          label="Footer Logo"
        />
      </span>
      <span className="text-slate-300 font-sans flex items-center gap-1 font-normal select-none">
        Powered by AdmarTech Intelligence • {slide.id && slide.id.replace('slide-', 'Slide ')}
      </span>
    </div>
  );

  return (
    <div className={`w-full h-full bg-white select-none flex flex-col justify-start p-4 sm:p-6 min-h-0 select-text overflow-y-auto custom-scrollbar ${modeScale}`}>

      {/* 1. TITLE / COVER SLIDE */}
      {slide.type === 'cover' && (
        <div className="flex-1 flex flex-col justify-between py-4">
          {/* Header */}
          <div className="flex justify-between items-start pb-3">
            <span className="text-blue-600 font-bold tracking-wider text-sm font-mono uppercase">
              <EditableText
                text={slide.footer || 'RL TOURS & TRAVELS'}
                onSave={(val) => handleTextChange('footer', val)}
                label="Header Site Name"
              />
            </span>
          </div>

          {/* Main Content Grid */}
          <div className="flex-1 grid grid-cols-12 gap-8 items-center">
            <div className="col-span-7 flex flex-col justify-center relative">
               <div className="space-y-6">
                  <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                    <EditableText
                      text={slide.title}
                      onSave={(val) => handleTextChange('title', val)}
                      label="Cover Main Title"
                    />
                  </h1>
                  <div className="text-sm text-slate-500 font-normal max-w-md leading-relaxed">
                    <EditableText
                      text={slide.descriptionText || ''}
                      onSave={(val) => handleTextChange('descriptionText', val)}
                      textarea={true}
                      label="Cover Description"
                    />
                  </div>

                  <div className="pt-4 flex flex-col gap-1.5">
                     <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                       <span className="uppercase text-slate-400 font-mono tracking-tighter w-24">Client Name:</span>
                       <span className="text-slate-600">
                          <EditableText
                            text={slide.footer || 'RL Tours & Travels'}
                            onSave={(val) => handleTextChange('footer', val)}
                            label="Client Name Info"
                          />
                       </span>
                     </div>
                     <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                       <span className="uppercase text-slate-400 font-mono tracking-tighter w-24">Report ID:</span>
                       <span className="text-slate-600">
                          <EditableText
                            text={slide.metadata?.version || 'BNB_AIR_09DD'}
                            onSave={(val) => handleMetaChange('version', val)}
                            label="Report ID Info"
                          />
                       </span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="col-span-5 flex justify-center items-center relative">
               <div className="relative group transition-all duration-700 hover:scale-105">
                  {/* Decorative Background Blob */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />

                  {/* Main Logo Card */}
                  <div className="relative z-10 bg-white rounded-[3rem] p-10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.12)] border border-slate-50 w-64 h-64 flex items-center justify-center overflow-hidden">
                    {siteImageUrl ? (
                      <img src={siteImageUrl} alt="Site Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-2 border-dashed border-slate-200">
                        <Users size={48} className="text-slate-200" />
                      </div>
                    )}
                  </div>

                  {/* Growth Badge Widget */}
                  <div className="absolute -bottom-6 -left-8 p-4 bg-white rounded-2xl shadow-2xl border border-slate-50 z-20 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-white">
                        <TrendingUp size={18} />
                     </div>
                     <div className="pr-2">
                        <p className="text-[7px] font-mono font-bold text-slate-400 uppercase tracking-widest leading-none">Growth</p>
                        <p className="text-[11px] font-bold text-slate-900 mt-0.5">+12.4%</p>
                     </div>
                  </div>

                  {/* Prepared By / User Logo Badge */}
                  <div className="absolute -top-4 -right-4 flex flex-col items-end gap-2 z-20">
                     {userAvatarUrl && (
                        <div className="w-12 h-12 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                           <img src={userAvatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                        </div>
                     )}
                     <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[7px] font-mono font-bold uppercase tracking-widest shadow-lg">
                        BLACK AND BOLD
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">REPORTING PERIOD</span>
              <span className="text-xs font-semibold text-slate-700">
                <EditableText
                  text={slide.metadata?.reportingPeriod || ''}
                  onSave={(val) => handleMetaChange('reportingPeriod', val)}
                  label="Metadata Reporting Period"
                />
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">PREPARED BY</span>
              <span className="text-xs font-semibold text-slate-700">
                <EditableText
                  text={slide.metadata?.preparedBy || ''}
                  onSave={(val) => handleMetaChange('preparedBy', val)}
                  label="Metadata Compiled By"
                />
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">SECURITY CLASSIFICATION</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <EditableText
                  text={slide.metadata?.classification || ''}
                  onSave={(val) => handleMetaChange('classification', val)}
                  label="Metadata Classification"
                />
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center text-[8px] font-mono tracking-[0.2em] text-slate-300 pt-3 border-t border-slate-50">
            <span className="uppercase">
              <EditableText
                text={slide.footer || 'RL TOURS & TRAVELS'}
                onSave={(val) => handleTextChange('footer', val)}
                label="Footer Site Name"
              />
            </span>
          </div>
        </div>
      )}

      {/* 2. EXECUTIVE PERFORMANCE SUMMARY */}
      {slide.type === 'summary' && (
        <div className="flex-1 flex flex-col justify-between py-2">
          <div>
            <SlideHeader />

            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-1.5 bg-blue-600 rounded-full" />
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">
                  <EditableText
                    text={slide.title}
                    onSave={(val) => handleTextChange('title', val)}
                  />
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <Award size={14} className="text-blue-500" />
                  <span className="text-[10px] font-mono font-bold text-blue-600 tracking-widest uppercase">
                    <EditableText
                      text={slide.scoreTag || ''}
                      onSave={(val) => handleTextChange('scoreTag', val)}
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Metrics widgets rows */}
            {slide.kpis && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 pb-5 mb-5">
                {slide.kpis.map((kpi, idx) => (
                  <div key={idx} className="flex flex-col items-center sm:items-start text-center sm:text-left bg-slate-50/50 p-4 border border-slate-100 rounded-xl relative group">
                    <span className="text-[10px] sm:text-xs font-mono tracking-widest text-slate-400">
                      <EditableText
                        text={kpi.label}
                        onSave={(val) => handleKPIChange(idx, { label: val })}
                      />
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">
                      <EditableText
                        text={kpi.value}
                        onSave={(val) => handleKPIChange(idx, { value: val })}
                      />
                    </span>
                    {kpi.growth && (
                      <span className="text-[11px] sm:text-xs font-mono font-semibold text-emerald-600 mt-1 bg-emerald-50 px-2.5 py-1 rounded">
                        <EditableText
                          text={kpi.growth}
                          onSave={(val) => handleKPIChange(idx, { growth: val })}
                        />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom details paragraph and column blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strategic Summary */}
              <div className="bg-slate-50/30 p-4 rounded-xl border border-dashed border-slate-200">
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-wider font-sans uppercase mb-2">STRATEGIC SUMMARY</h4>
                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans mb-4">
                  <EditableText
                    text={slide.descriptionText || ''}
                    onSave={(val) => handleTextChange('descriptionText', val)}
                    textarea={true}
                    label="Executive Summary Block text"
                  />
                </div>
                {slide.insightsList && slide.insightsList.slice(0,1).map((item, id) => (
                  <div key={id} className="flex gap-2.5 items-start mt-2 border-t border-slate-100 pt-3">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">{item.title}</span>
                      <span className="text-xs sm:text-sm text-slate-500 block leading-relaxed">{item.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Risks and opportunities */}
              <div className="bg-slate-50/30 p-4 rounded-xl border border-dashed border-slate-200">
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-wider font-sans uppercase mb-2">RISKS & OPPORTUNITIES</h4>
                <div className="flex flex-col gap-3">
                  {slide.insightsList && slide.insightsList.slice(1).map((item, id) => (
                    <div key={id} className="flex gap-2.5 items-start border-b border-slate-100/50 pb-3 last:border-0 last:pb-0">
                      {item.icon === 'risk' ? (
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="text-sm font-bold text-slate-800 block">{item.title}</span>
                        <span className="text-xs sm:text-sm text-slate-500 block leading-relaxed">{item.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SlideFooter />
        </div>
      )}

      {/* 3. SCORECARD SLIDE */}
      {slide.type === 'scorecard' && (
        <div className="flex-1 flex flex-col justify-between bg-[#f8fafc] -m-4 sm:-m-8 p-4 sm:p-8">
          <div>
            <div className="w-full flex justify-between items-start border-b border-slate-200 pb-2 mb-4">
              <div className="flex flex-col">
                <div className="text-xl font-bold tracking-tight text-slate-900">
                  <EditableText
                    text={slide.title}
                    onSave={(val) => handleTextChange('title', val)}
                    label="Slide Title"
                  />
                </div>
              </div>

              {slide.scoreTag && (
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#1e293b] uppercase flex items-center gap-2">
                  <EditableText
                    text={slide.scoreTag}
                    onSave={(val) => handleTextChange('scoreTag', val)}
                    label="Header Score"
                  />
                </span>
              )}
            </div>

            {/* Scorecard gauges and AI engine container */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {slide.scorecardGauges && slide.scorecardGauges.slice(0, 5).map((gauge, idx) => (
                <CircularGauge3D
                  key={gauge.id}
                  score={gauge.score}
                  label={gauge.name}
                  color={gauge.color}
                  size={100}
                  onUpdateScore={(newScore) => {
                    const newGauges = [...(slide.scorecardGauges || [])];
                    newGauges[idx] = { ...newGauges[idx], score: newScore };
                    onUpdateSlide({ ...slide, scorecardGauges: newGauges });
                  }}
                />
              ))}

              {/* Glowing Interactive AI Engine Badge Card */}
              <div
                className="flex flex-col items-center justify-center p-2 border border-dashed border-blue-400 bg-white rounded-xl relative shadow-sm overflow-hidden min-h-[120px] text-center group"
              >
                <div className="absolute top-2 right-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                </div>

                <div className="p-2 bg-blue-50 rounded-2xl mb-1.5 group-hover:scale-110 transition-transform duration-500">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>

                <span className="text-[9px] font-bold text-blue-800 tracking-[0.2em] uppercase">AI GROWTH ENGINE</span>
                <span className="text-[8px] text-slate-400 mt-0.5 font-medium">Analyzing 2.4M Data Points</span>
              </div>
            </div>

            {/* AI intelligence footer insight box */}
            <div className="bg-white rounded-2xl p-5 flex gap-5 items-start border border-slate-100 shadow-sm">
              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] sm:text-xs uppercase font-mono tracking-[0.2em] text-[#1e293b] block font-bold mb-1.5">AI INTELLIGENCE INSIGHT</span>
                <div className="text-[11px] sm:text-sm leading-relaxed text-slate-600 font-sans mt-0.5">
                  <EditableText
                    text={slide.scorecardInsight || ''}
                    onSave={(val) => handleTextChange('scorecardInsight', val)}
                    textarea={true}
                    className="w-full"
                    label="Health Scorecard Insight text"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full flex justify-between items-center text-[10px] font-mono tracking-widest text-slate-400 pt-6 border-t border-slate-200 mt-4">
            <span className="font-bold">
              <EditableText
                text={slide.footer || 'RL TOURS & TRAVELS'}
                onSave={(val) => handleTextChange('footer', val)}
                label="Footer Logo"
              />
            </span>
            <span className="text-slate-300 font-sans flex items-center gap-1 font-normal select-none uppercase tracking-tighter">
              Powered by AdmarTech Intelligence • Slide 3
            </span>
          </div>
        </div>
      )}

      {/* 4. OVERALL GROWTH PERFORMANCE DASHBOARD */}
      {slide.type === 'growth' && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <SlideHeader />

            {/* Performance analysis Table */}
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm mb-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-[11px] font-mono tracking-wider text-slate-400 uppercase">
                      <th className="py-3 px-4 font-bold">CORE KPI</th>
                      <th className="py-3 px-4 text-right font-bold">PREVIOUS</th>
                      <th className="py-3 px-4 text-right font-bold">CURRENT</th>
                      <th className="py-3 px-4 text-right font-bold">VARIANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs">
                    {slide.growthTable && slide.growthTable.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <EditableText
                            text={row.name}
                            onSave={(val) => {
                              const newTable = [...(slide.growthTable || [])];
                              newTable[idx] = { ...newTable[idx], name: val };
                              onUpdateSlide({ ...slide, growthTable: newTable });
                            }}
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-500">
                          <EditableText
                            text={row.prev}
                            onSave={(val) => {
                              const newTable = [...(slide.growthTable || [])];
                              newTable[idx] = { ...newTable[idx], prev: val };
                              onUpdateSlide({ ...slide, growthTable: newTable });
                            }}
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                          <EditableText
                            text={row.current}
                            onSave={(val) => {
                              const newTable = [...(slide.growthTable || [])];
                              newTable[idx] = { ...newTable[idx], current: val };
                              onUpdateSlide({ ...slide, growthTable: newTable });
                            }}
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`inline-block px-3 py-1 rounded-full font-mono text-[11px] sm:text-xs font-bold ${
                            row.status === 'positive'
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.status === 'negative'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            <EditableText
                              text={row.variance}
                              onSave={(val) => {
                                const newTable = [...(slide.growthTable || [])];
                                newTable[idx] = { ...newTable[idx], variance: val };
                                onUpdateSlide({ ...slide, growthTable: newTable });
                              }}
                            />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Growth Analysis comment footer text */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-4 items-start">
              <span className="text-[10px] sm:text-xs uppercase font-mono tracking-widest text-blue-600 block shrink-0 font-bold mt-1">GROWTH ANALYSIS</span>
              <div className="text-[11px] sm:text-xs leading-relaxed text-slate-600 font-sans">
                <EditableText
                  text={slide.growthInsight || ''}
                  onSave={(val) => handleTextChange('growthInsight', val)}
                  textarea={true}
                  label="Growth Table Insights comment"
                />
              </div>
            </div>
          </div>

          <SlideFooter />
        </div>
      )}

      {/* 5. ORGANIC SEARCH INTELLIGENCE */}
      {slide.type === 'organic' && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <SlideHeader />

            {/* Stats row overview */}
            {slide.kpis && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                {slide.kpis.map((kpi, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="text-[8px] font-mono tracking-wide text-slate-400">
                      <EditableText
                        text={kpi.label}
                        onSave={(val) => handleKPIChange(idx, { label: val })}
                      />
                    </span>
                    <span className="text-sm font-bold text-slate-800 leading-tight">
                      <EditableText
                        text={kpi.value}
                        onSave={(val) => handleKPIChange(idx, { value: val })}
                      />
                    </span>
                    {kpi.subValue && (
                      <span className="text-[9px] text-emerald-600 font-medium leading-none mt-0.5">
                        <EditableText
                          text={kpi.subValue}
                          onSave={(val) => handleKPIChange(idx, { subValue: val })}
                        />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Spacer to push dashboard down */}
            <div className="flex-1" />

            {/* Inner Dashboard Layout with double column split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch mb-6">
              {/* Left Column: Metric Cards */}
              <div className="lg:col-span-2 flex flex-col gap-2 justify-center">
                {slide.growthTable && slide.growthTable.map((org, idx) => (
                  <div key={org.id} className="border border-slate-100 bg-white p-2 rounded-lg shadow-sm">
                    <span className="text-[8px] font-mono tracking-wide text-slate-400">{org.name}</span>
                    <span className="block text-sm font-black text-slate-800 leading-tight">
                      <EditableText
                        text={org.current}
                        onSave={(val) => {
                          const newTable = [...(slide.growthTable || [])];
                          newTable[idx] = { ...newTable[idx], current: val };
                          onUpdateSlide({ ...slide, growthTable: newTable });
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>

              {/* Center Column: 3D Bar Chart */}
              <div className="lg:col-span-6 flex flex-col justify-end">
                <span className="text-[9px] font-mono tracking-wider font-semibold text-slate-400 uppercase mb-8 block">VISIBILITY DASHBOARD</span>
                {slide.chartData && (
                  <ThreeDBarChart
                    data={slide.chartData}
                    height={160}
                    onUpdateValue={(valIdx, newVal) => {
                      const newData = [...(slide.chartData || [])];
                      newData[valIdx] = { ...newData[valIdx], value: newVal };
                      onUpdateSlide({ ...slide, chartData: newData });
                    }}
                  />
                )}
              </div>

              {/* Right Column: AI Analysis box */}
              <div className="lg:col-span-4 bg-blue-50/20 border border-dashed border-blue-200/60 rounded-xl p-3 flex flex-col justify-between">
                <div className="flex gap-2 items-start">
                  <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-bold text-blue-800 uppercase tracking-widest block leading-tight">AI INTELLIGENCE</span>
                    <span className="text-[10px] font-bold text-slate-700 block mt-0.5">RELEVANCE VS. VISIBILITY</span>
                    <div className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      <EditableText
                        text={slide.descriptionText || ''}
                        onSave={(val) => handleTextChange('descriptionText', val)}
                        textarea={true}
                        label="Organic Analysis Insights block"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SlideFooter />
        </div>
      )}

      {/* 6. KEYWORD OPPORTUNITY ANALYSIS */}
      {slide.type === 'scatter' && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <SlideHeader />

            {/* Split row content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center mb-4">

              {/* Left Grid: 3D interactive bubble scatter chart */}
              <div className="lg:col-span-8">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 uppercase">CTR VS. POSITION</span>
                </div>
                {slide.scatterPoints && (
                  <ThreeDScatter
                     points={slide.scatterPoints}
                     onUpdatePoint={(idx, updated) => {
                       const newPoints = [...(slide.scatterPoints || [])];
                       newPoints[idx] = { ...newPoints[idx], ...updated };
                       onUpdateSlide({ ...slide, scatterPoints: newPoints });
                     }}
                  />
                )}
              </div>

              {/* Right Grid: Table stats */}
              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-100 px-3 py-1.5">
                  <span className="text-[8px] font-mono tracking-wider text-slate-400 font-bold uppercase block">PERFORMANCE</span>
                </div>
                <div className="overflow-y-auto max-h-[140px]">
                  <table className="w-full text-left border-collapse text-[9px]">
                    <thead>
                      <tr className="border-b border-slate-100 font-mono text-slate-400 bg-slate-50/40">
                        <th className="py-2 px-3">KEYWORD</th>
                        <th className="py-2 px-3 text-right">CTR</th>
                        <th className="py-2 px-3 text-right">POS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {slide.scatterPoints && slide.scatterPoints.map((point, idx) => (
                        <tr key={point.id} className="hover:bg-slate-50/40">
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            <EditableText
                              text={point.keyword}
                              onSave={(val) => {
                                const newPoints = [...(slide.scatterPoints || [])];
                                newPoints[idx] = { ...newPoints[idx], keyword: val };
                                onUpdateSlide({ ...slide, scatterPoints: newPoints });
                              }}
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-600">
                            <EditableText
                              text={`${point.ctr}%`}
                              onSave={(val) => {
                                const num = parseFloat(val.replace('%',''));
                                if (!isNaN(num)) {
                                  const newPoints = [...(slide.scatterPoints || [])];
                                  newPoints[idx] = { ...newPoints[idx], ctr: num };
                                  onUpdateSlide({ ...slide, scatterPoints: newPoints });
                                }
                              }}
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-500">
                            <EditableText
                              text={point.position.toString()}
                              onSave={(val) => {
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                  const newPoints = [...(slide.scatterPoints || [])];
                                  newPoints[idx] = { ...newPoints[idx], position: num };
                                  onUpdateSlide({ ...slide, scatterPoints: newPoints });
                                }
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

            {/* Strategic recom footer */}
            <div className="bg-emerald-50/20 border-l-4 border-emerald-500 p-3 rounded-r-xl flex gap-3 items-start">
              <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-700 block font-bold">STRATEGIC RECOMMENDATION</span>
                <div className="text-[10px] leading-relaxed text-slate-600 font-sans mt-0.5">
                  <EditableText
                    text={slide.descriptionText || ''}
                    onSave={(val) => handleTextChange('descriptionText', val)}
                    textarea={true}
                    label="Keyword Opportunity Recommendations text"
                  />
                </div>
              </div>
            </div>
          </div>

          <SlideFooter />
        </div>
      )}

      {/* 7. PAID MEDIA INTELLIGENCE - FUNNEL SLIDE */}
      {slide.type === 'funnel' && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <SlideHeader />

            {/* Four column row parameters widget */}
            {slide.kpis && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-b border-slate-100 pb-3 mb-3">
                {slide.kpis.map((kpi, idx) => (
                  <div key={idx} className="flex flex-col items-center bg-slate-50 p-2 border border-slate-100 rounded-lg">
                    <span className="text-[8px] font-mono tracking-wider text-slate-400">
                      <EditableText
                        text={kpi.label}
                        onSave={(val) => handleKPIChange(idx, { label: val })}
                      />
                    </span>
                    <span className="text-base font-black text-slate-800 leading-tight mt-0.5">
                      <EditableText
                        text={kpi.value}
                        onSave={(val) => handleKPIChange(idx, { value: val })}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Split Funnel and AI details display */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

              {/* Funnel chart section */}
              <div className="lg:col-span-6 flex flex-col justify-between">
                <span className="text-[9px] font-mono tracking-wider font-semibold text-slate-400 uppercase leading-none block mb-1">FUNNEL ANALYSIS</span>
                {slide.funnelStages && (
                  <ThreeDFunnel
                    stages={slide.funnelStages}
                    onUpdateStage={(stageIdx, newVal) => {
                      const newStages = [...(slide.funnelStages || [])];
                      newStages[stageIdx] = { ...newStages[stageIdx], value: newVal };
                      onUpdateSlide({ ...slide, funnelStages: newStages });
                    }}
                  />
                )}
              </div>

              {/* Stats insights layout list */}
              <div className="lg:col-span-6 flex flex-col gap-2.5 justify-center">
                {slide.insightsList && slide.insightsList.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-xl relative ${
                      idx === 0
                        ? 'border-blue-100 bg-blue-50/20'
                        : 'border-emerald-100 bg-emerald-50/10'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      {idx === 0 ? <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> : <Award className="w-3.5 h-3.5 text-emerald-600" />}
                      <EditableText
                        text={item.title}
                        onSave={(val) => {
                          const newList = [...(slide.insightsList || [])];
                          newList[idx] = { ...newList[idx], title: val };
                          onUpdateSlide({ ...slide, insightsList: newList });
                        }}
                      />
                    </span>
                    <span className="block text-[11px] text-slate-600 mt-1 leading-relaxed font-sans">
                      <EditableText
                        text={item.text}
                        onSave={(val) => {
                          const newList = [...(slide.insightsList || [])];
                          newList[idx] = { ...newList[idx], text: val };
                          onUpdateSlide({ ...slide, insightsList: newList });
                        }}
                        textarea={true}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SlideFooter />
        </div>
      )}

      {/* 8. CAMPAIGN PERFORMANCE ANALYSIS COMPARISON */}
      {slide.type === 'campaign' && (
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          <div>
            <SlideHeader />

            {/* Segment comparative layout container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {slide.campaigns && slide.campaigns.map((camp, cIdx) => (
                <div
                  key={camp.id}
                  className={`border p-2.5 rounded-xl relative ${
                    camp.status === 'Top Performer'
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : 'border-amber-200 bg-amber-50/10'
                  }`}
                >
                  {/* Status header strip */}
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-bold text-slate-800 leading-none truncate pr-2">
                      <EditableText
                        text={camp.name}
                        onSave={(val) => {
                          const newCamps = [...(slide.campaigns || [])];
                          newCamps[cIdx] = { ...newCamps[cIdx], name: val };
                          onUpdateSlide({ ...slide, campaigns: newCamps });
                        }}
                      />
                    </span>
                    <span className={`text-[8px] font-bold py-0.5 px-2 rounded-full shrink-0 ${
                      camp.status === 'Top Performer'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      <EditableText
                        text={camp.status}
                        onSave={(val) => {
                          const newCamps = [...(slide.campaigns || [])];
                          newCamps[cIdx] = { ...newCamps[cIdx], status: val as any };
                          onUpdateSlide({ ...slide, campaigns: newCamps });
                        }}
                      />
                    </span>
                  </div>

                  {/* Core KPI grid */}
                  <div className="grid grid-cols-3 gap-1 border-b border-slate-100/60 pb-1.5 mb-1.5">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-mono text-slate-400">SPEND</span>
                      <span className="text-xs font-extrabold text-slate-700">
                        <EditableText
                          text={camp.spend}
                          onSave={(val) => {
                            const newCamps = [...(slide.campaigns || [])];
                            newCamps[cIdx] = { ...newCamps[cIdx], spend: val };
                            onUpdateSlide({ ...slide, campaigns: newCamps });
                          }}
                        />
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] font-mono text-slate-400">LEADS</span>
                      <span className="text-xs font-extrabold text-slate-700">
                        <EditableText
                          text={camp.leads.toString()}
                          onSave={(val) => {
                            const newCamps = [...(slide.campaigns || [])];
                            newCamps[cIdx] = { ...newCamps[cIdx], leads: parseInt(val) || 0 };
                            onUpdateSlide({ ...slide, campaigns: newCamps });
                          }}
                        />
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] font-mono text-slate-400">CPL</span>
                      <span className="text-xs font-extrabold text-slate-700">
                        <EditableText
                          text={camp.cpl}
                          onSave={(val) => {
                            const newCamps = [...(slide.campaigns || [])];
                            newCamps[cIdx] = { ...newCamps[cIdx], cpl: val };
                            onUpdateSlide({ ...slide, campaigns: newCamps });
                          }}
                        />
                      </span>
                    </div>
                  </div>

                  {/* Comparative bars SVG mini representation */}
                  <div className="flex items-end justify-center gap-4 h-10 pt-1">
                    {camp.chartData && camp.chartData.map((d, dIdx) => (
                      <div key={dIdx} className="flex flex-col items-center">
                        <div className="relative w-6 bg-slate-100 rounded-sm overflow-visible h-8 flex items-end">
                          <div
                            className={`w-full rounded-sm transition-all duration-300 ${
                              d.label === 'Spend' ? 'bg-slate-400 shadow-sm' : 'bg-emerald-500 shadow-sm'
                            }`}
                            style={{ height: `${d.relative}%` }}
                          />
                        </div>
                        <span className="text-[7px] font-mono text-slate-500 mt-0.5">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Strategic recommendations double lines commentary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {slide.insightsList && slide.insightsList.map((rec, id) => (
                <div key={id} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex gap-2 items-start">
                  {rec.icon === 'opportunity' ? <TrendingUp className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 uppercase block">{rec.title}</span>
                    <span className="text-[11px] text-slate-600 block leading-snug mt-0.5">
                      <EditableText
                        text={rec.text}
                        onSave={(val) => {
                          const newList = [...(slide.insightsList || [])];
                          newList[id] = { ...newList[id], text: val };
                          onUpdateSlide({ ...slide, insightsList: newList });
                        }}
                        textarea={true}
                      />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SlideFooter />
        </div>
      )}

      {/* 9. AUDIENCE & GEO INTELLIGENCE SLIDE */}
      {slide.type === 'audience' && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <SlideHeader />

            {/* Divided panel representation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch mb-4">

              {/* Left Column: Geographic Concentration Map Mock */}
              <div className="lg:col-span-5 bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 uppercase block mb-2 leading-none">GEOGRAPHIC CONCENTRATION</span>

                {/* Clean wireframe map vector */}
                <div className="flex-1 min-h-[130px] border border-dashed border-slate-200 bg-slate-50 rounded-lg flex flex-col items-center justify-center p-4 text-center my-2">
                  <Globe className="w-10 h-10 text-slate-300 animate-pulse mb-2" />
                  <span className="text-xs font-bold text-slate-700 tracking-wider">PRIMARY MARKET: INDIA</span>
                  <span className="text-[10px] text-slate-400 italic mt-0.5">96.69% Regional Ingress</span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2 border border-slate-100 rounded">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-mono text-slate-400">Total Users (India)</span>
                    <span className="text-xs font-bold text-slate-800">25,015</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] font-mono text-slate-400">New User Ratio</span>
                    <span className="text-xs font-bold text-emerald-600">99.8%</span>
                  </div>
                </div>
              </div>

              {/* Right Column: High Quality Top City Bar Chart */}
              <div className="lg:col-span-7 bg-white border border-slate-100 shadow-sm rounded-xl p-4">
                <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 uppercase block mb-3 leading-none">TOP CITY PERFORMANCE (USERS)</span>

                {/* Beautiful horizontal SVG bar chart */}
                <div className="flex flex-col gap-2">
                  {slide.cities && slide.cities.map((ctVal, idx) => {
                    const maxUsers = slide.cities ? Math.max(...slide.cities.map(u => u.users), 1) : 1;
                    const wPct = (ctVal.users / maxUsers) * 100;
                    return (
                      <div key={ctVal.id} className="flex items-center text-xs">
                        {/* City label with inline editing */}
                        <div className="w-20 font-bold text-slate-700 truncate pr-2">
                          <EditableText
                            text={ctVal.city}
                            onSave={(val) => {
                              const newCities = [...(slide.cities || [])];
                              newCities[idx] = { ...newCities[idx], city: val };
                              onUpdateSlide({ ...slide, cities: newCities });
                            }}
                          />
                        </div>

                        {/* Interactive dynamic bar element */}
                        <div className="flex-1 bg-slate-100 h-6 rounded overflow-visible relative group">
                          <div
                            className="bg-blue-600 h-full rounded shadow-sm hover:brightness-110 cursor-pointer relative"
                            style={{ width: `${wPct}%` }}
                          >
                            <span className="absolute right-2 inset-y-0 flex items-center text-[10px] font-semibold text-white pointer-events-none font-mono">
                              {ctVal.users.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Float hovering indicators value */}
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded shadow pointer-events-none z-10 font-mono">
                            Edit details in inputs
                          </div>
                        </div>

                        {/* Direct input controls for ease of editing */}
                        <div className="ml-2 w-16 text-right">
                          <input
                            type="number"
                            value={ctVal.users}
                            onChange={(e) => {
                              const numStr = e.target.value;
                              const num = parseInt(numStr) || 0;
                              const newCities = [...(slide.cities || [])];
                              newCities[idx] = { ...newCities[idx], users: num };
                              onUpdateSlide({ ...slide, cities: newCities });
                            }}
                            disabled={!isEditMode}
                            className="w-full text-right bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-700 rounded border border-transparent hover:border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold font-mono text-[10px] px-1 py-0.5"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Strategic Commentary footer text outline */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-3 items-start">
              <span className="text-[10px] uppercase font-mono tracking-widest text-blue-600 block shrink-0 font-bold mt-1">AUDIENCE ANALYSIS</span>
              <div className="text-xs leading-relaxed text-slate-600 font-sans">
                <EditableText
                  text={slide.descriptionText || ''}
                  onSave={(val) => handleTextChange('descriptionText', val)}
                  textarea={true}
                  label="Audience analysis footer commentary copy"
                />
              </div>
            </div>
          </div>

          <SlideFooter />
        </div>
      )}

      {/* 10. CHANNEL & LEAD INTELLIGENCE */}
      {slide.type === 'channels' && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <SlideHeader />

            {/* Double Column content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch mb-4">

              {/* Left Column: 3D Donut Chart */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 uppercase leading-none block mb-2">LEAD SOURCE DISTRIBUTION</span>
                {slide.chartData && (
                  <ThreeDDonutChart
                    data={slide.chartData}
                    onUpdateValue={(valIdx, newVal) => {
                      const newData = [...(slide.chartData || [])];
                      newData[valIdx] = { ...newData[valIdx], value: newVal };
                      onUpdateSlide({ ...slide, chartData: newData });
                    }}
                  />
                )}
              </div>

              {/* Right Column: Mini KPI efficiency table */}
              <div className="lg:col-span-6 bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-2">
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase block">CHANNEL EFFICIENCY METRICS</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 font-mono text-slate-400 uppercase font-semibold text-[10px] bg-slate-50/20">
                        <th className="py-2.5 px-4">ACQUISITION CHANNEL</th>
                        <th className="py-2.5 px-4 text-right">LEADS</th>
                        <th className="py-2.5 px-4 text-right">SHARE</th>
                        <th className="py-2.5 px-4 text-right">CPL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {slide.growthTable && slide.growthTable.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/40">
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            <EditableText
                              text={row.name}
                              onSave={(val) => {
                                const newTable = [...(slide.growthTable || [])];
                                newTable[idx] = { ...newTable[idx], name: val };
                                onUpdateSlide({ ...slide, growthTable: newTable });
                              }}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-600">
                            <EditableText
                              text={row.prev}
                              onSave={(val) => {
                                const newTable = [...(slide.growthTable || [])];
                                newTable[idx] = { ...newTable[idx], prev: val };
                                onUpdateSlide({ ...slide, growthTable: newTable });
                              }}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                            <EditableText
                              text={row.current}
                              onSave={(val) => {
                                const newTable = [...(slide.growthTable || [])];
                                newTable[idx] = { ...newTable[idx], current: val };
                                onUpdateSlide({ ...slide, growthTable: newTable });
                              }}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">
                            <EditableText
                              text={row.variance}
                              onSave={(val) => {
                                const newTable = [...(slide.growthTable || [])];
                                newTable[idx] = { ...newTable[idx], variance: val };
                                onUpdateSlide({ ...slide, growthTable: newTable });
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

            {/* Channel strategy comments block */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-3 items-start">
              <span className="text-[10px] uppercase font-mono tracking-widest text-blue-500 block shrink-0 font-bold mt-1">CHANNEL STRATEGY</span>
              <div className="text-xs leading-relaxed text-slate-600 font-sans">
                <EditableText
                  text={slide.descriptionText || ''}
                  onSave={(val) => handleTextChange('descriptionText', val)}
                  textarea={true}
                  label="Channel strategy copy description text"
                />
              </div>
            </div>
          </div>

          <SlideFooter />
        </div>
      )}

      {/* 11. 90-DAY STRATEGIC GROWTH ROADMAP */}
      {slide.type === 'roadmap' && (
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          <div>
            <SlideHeader />

            {/* 3 Columns roadmap representation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
              {slide.roadmapMonths && slide.roadmapMonths.map((month, mIdx) => (
                <div key={month.title} className="border border-slate-100 rounded-xl bg-slate-50/30 p-2.5 flex flex-col gap-2">

                  {/* Column Month header */}
                  <div
                    className="text-center font-mono font-extrabold text-[9px] py-1 text-white rounded shadow-sm tracking-wider leading-none"
                    style={{ backgroundColor: month.color }}
                  >
                    <EditableText
                      text={month.title}
                      onSave={(val) => {
                        const newMonths = [...(slide.roadmapMonths || [])];
                        newMonths[mIdx] = { ...newMonths[mIdx], title: val };
                        onUpdateSlide({ ...slide, roadmapMonths: newMonths });
                      }}
                      className="hover:text-slate-200"
                    />
                  </div>

                  {/* Column roadmap items card */}
                  {month.items.map((card, cIdx) => (
                    <div key={card.id} className="bg-white border border-slate-100 p-2.5 rounded-lg shadow-xs flex flex-col gap-1 hover:shadow-sm transition-shadow">
                      <span className="text-[8px] font-mono text-slate-400 font-bold tracking-wider">
                        <EditableText
                          text={card.category}
                          onSave={(val) => {
                            const newMonths = [...(slide.roadmapMonths || [])];
                            newMonths[mIdx].items[cIdx] = { ...card, category: val };
                            onUpdateSlide({ ...slide, roadmapMonths: newMonths });
                          }}
                        />
                      </span>
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        <EditableText
                          text={card.title}
                          onSave={(val) => {
                            const newMonths = [...(slide.roadmapMonths || [])];
                            newMonths[mIdx].items[cIdx] = { ...card, title: val };
                            onUpdateSlide({ ...slide, roadmapMonths: newMonths });
                          }}
                        />
                      </span>
                      <div className="text-[10px] text-slate-500 leading-snug mt-0.5">
                        <EditableText
                          text={card.desc}
                          onSave={(val) => {
                            const newMonths = [...(slide.roadmapMonths || [])];
                            newMonths[mIdx].items[cIdx] = { ...card, desc: val };
                            onUpdateSlide({ ...slide, roadmapMonths: newMonths });
                          }}
                          textarea={true}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Effort map footnotes horizontal segment */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 flex flex-wrap justify-around items-center gap-3">
              {slide.insightsList && slide.insightsList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className={`w-2.5 h-2.5 rounded-xs shrink-0 ${
                    idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-emerald-500' : 'bg-yellow-500'
                  }`} />
                  <span className="font-semibold text-slate-700">
                    <EditableText
                      text={item.title}
                      onSave={(val) => {
                        const newList = [...(slide.insightsList || [])];
                        newList[idx] = { ...newList[idx], title: val };
                        onUpdateSlide({ ...slide, insightsList: newList });
                      }}
                    />
                  </span>
                  <span className="text-slate-500 font-mono font-semibold text-[10px] sm:text-xs tracking-wide">
                    <EditableText
                      text={item.text}
                      onSave={(val) => {
                        const newList = [...(slide.insightsList || [])];
                        newList[idx] = { ...newList[idx], text: val };
                        onUpdateSlide({ ...slide, insightsList: newList });
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <SlideFooter />
        </div>
      )}

      {/* 12. OUTRO / SUMMARY REVIEW SLIDE */}
      {slide.type === 'outro' && (
        <div className="flex-1 flex flex-col justify-between py-4 select-text">
          <SlideHeader />

          {/* Quick Metrics stats summary */}
          {slide.kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-auto py-4">
              {slide.kpis.map((kpi, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col items-center hover:bg-slate-100/40 cursor-text group relative">
                  <span className="text-[10px] font-mono tracking-widest text-slate-400">
                    <EditableText
                      text={kpi.label}
                      onSave={(val) => handleKPIChange(idx, { label: val })}
                    />
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1 leading-none">
                    <EditableText
                      text={kpi.value}
                      onSave={(val) => handleKPIChange(idx, { value: val })}
                    />
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Core final wrap up commentary block text */}
          <div className="bg-blue-50/20 border-l-4 border-blue-600 rounded-r-xl p-5 mb-5 hover:shadow-sm">
            <span className="text-[10px] font-mono tracking-widest font-bold text-blue-800 uppercase block mb-1">FINAL STRATEGIC OUTLOOK</span>
            <div className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed mt-1">
              <EditableText
                text={slide.descriptionText || ''}
                onSave={(val) => handleTextChange('descriptionText', val)}
                textarea={true}
                className="w-full text-slate-700"
                label="Final Outro strategic wrap comment"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-3">
            <span>
              <EditableText
                text={slide.footer || 'RL TOURS & TRAVELS'}
                onSave={(val) => handleTextChange('footer', val)}
                label="Outro final branded log"
              />
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
