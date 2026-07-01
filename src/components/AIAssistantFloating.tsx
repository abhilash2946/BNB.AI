import React, { useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ReportResponse } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistantFloatingProps {
  reportData?: ReportResponse | null;
}

export const AIAssistantFloating: React.FC<AIAssistantFloatingProps> = ({ reportData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: 'Hi! I’m your BNB AI analyst. Ask me anything about your data.' }
  ]);

  const getAIResponse = async (userQuestion: string): Promise<string> => {
    if (reportData?.narrative1) {
      const lowerQuestion = userQuestion.toLowerCase();
      if (lowerQuestion.includes('traffic') || lowerQuestion.includes('organic')) {
        return `Based on your report: ${reportData.narrative1.substring(0, 250)}... Would you like me to dive deeper into specific channels?`;
      }
      if (lowerQuestion.includes('competitor')) {
        const comp = reportData.aiCompetitorAnalysis;
        if (comp && typeof comp === 'object') {
          const actions = comp.inferred_actions?.slice(0, 2).join(', ');
          return `Competitor insights: ${actions || 'No strong signals detected in this cycle.'}`;
        }
        return `No competitor data available yet. Generate a report to activate neural scanning.`;
      }
      return `I see your report covers: ${reportData.title}. Ask me about specific metrics like traffic, conversion protocols, or campaign performance.`;
    }
    return `I need a report to analyze. Please initiate a "Neural Sync" to provide me with data.`;
  };

  const handleSend = async () => {
    if (!question.trim()) return;
    const userQuestion = question;
    const newMessages: { role: 'user' | 'ai'; content: string }[] = [...messages, { role: 'user', content: userQuestion }];
    setMessages(newMessages);
    setQuestion('');

    const aiReply = await getAIResponse(userQuestion);
    setMessages([...newMessages, { role: 'ai', content: aiReply }]);
  };

  return (
    <>
      <button
        className="floating-ai-btn group !bg-[#1A1A1A]"
        onClick={() => setIsOpen(true)}
        aria-label="Open AI assistant"
      >
        <Sparkles size={24} className="text-white group-hover:scale-110 transition-transform" />
        <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping group-hover:opacity-40" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-[450px] max-w-full h-[600px] z-[110]"
            >
              <GlassCard className="h-full flex flex-col p-0 overflow-hidden border-white/30 shadow-2xl">
                <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">BNB AI Analyst</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {messages.map((msg, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-[1.25rem] px-5 py-3.5 text-sm leading-relaxed shadow-lg ${
                        msg.role === 'user'
                          ? 'bg-white text-black'
                          : 'bg-white/[0.05] border border-white/10 text-gray-200'
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="p-5 border-t border-white/10 bg-white/[0.03] flex gap-3">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about traffic, protocols, competitors..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600"
                  />
                  <button
                    onClick={handleSend}
                    className="p-3.5 rounded-xl bg-white text-black hover:bg-gray-200 transition-all active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
