import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Globe, Lock, FileText, Presentation, Copy, Check } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  dateRange: { start: string; end: string };
}

export default function ShareDialog({ isOpen, onClose, siteId, dateRange }: ShareDialogProps) {
  const [accessType, setAccessType] = useState<'public' | 'private'>('private');
  const [includePPT, setIncludePPT] = useState(true);
  const [includeDoc, setIncludeDoc] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const sharedPages = [];
      if (includePPT) sharedPages.push('ppt');
      if (includeDoc) sharedPages.push('doc');

      if (sharedPages.length === 0) {
        toast.error("Please select at least one page to share");
        return;
      }

      const { data, error } = await supabase
        .from('shared_reports')
        .insert({
          site_id: siteId,
          date_range: dateRange,
          access_type: accessType,
          shared_pages: sharedPages
        })
        .select()
        .single();

      if (error) throw error;

      const shareUrl = `${window.location.origin}/shared/${data.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      console.error("Share Error:", err);
      toast.error("Failed to generate share link");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md"
          >
            <GlassCard className="p-8 border-white/20">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl text-white">
                    <Share2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold">Share Report</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                {/* Visibility Toggles */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">Visibility</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAccessType('public')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                        accessType === 'public'
                          ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Globe size={16} />
                      <span className="text-sm font-semibold">Public</span>
                    </button>
                    <button
                      onClick={() => setAccessType('private')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                        accessType === 'private'
                          ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Lock size={16} />
                      <span className="text-sm font-semibold">Private</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 italic">
                    {accessType === 'public'
                      ? "Anyone with the link can access all report pages (View Only)."
                      : "Access is restricted to Client PPT and Client Doc pages only."}
                  </p>
                </div>

                {/* Content Toggles */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">Select Pages to Share</label>
                  <div className="space-y-3">
                    <button
                      onClick={() => setIncludePPT(!includePPT)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        includePPT ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/5 text-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Presentation size={18} />
                        <span className="text-sm font-semibold">Client PPT</span>
                      </div>
                      {includePPT && <Check size={16} />}
                    </button>
                    <button
                      onClick={() => setIncludeDoc(!includeDoc)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        includeDoc ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/5 text-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} />
                        <span className="text-sm font-semibold">Client Doc</span>
                      </div>
                      {includeDoc && <Check size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button
                    onClick={handleGenerateLink}
                    disabled={isGenerating}
                    className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50 shadow-lg"
                  >
                    {isGenerating ? (
                      "Generating..."
                    ) : copied ? (
                      <>
                        <Check size={18} />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        <span>Generate & Copy Link</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-gray-500 mt-4 uppercase tracking-tighter">
                    Locked to Period: {dateRange.start} → {dateRange.end}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
