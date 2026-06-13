import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, User, Bot, Minimize2 } from 'lucide-react';
import { MarketingReport, ChatMessage } from '../types';

interface AIAssistantProps {
  report: MarketingReport | null;
}

export default function AIAssistant({ report }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'analyst',
      text: "Neural interface established. I'm your BNB AI co-processor. Inquire about the current data curves or campaign optimization protocols.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");

    // Simulate AI response delay
    setTimeout(() => {
      const response = generateAIResponse(inputText);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'analyst',
        text: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  const generateAIResponse = (input: string): string => {
    const text = input.toLowerCase();

    if (!report) {
      return "Current telemetry is offline. Please trigger a neural sync from the command bar so I can parse the specific site metrics.";
    }

    if (text.includes("traffic") || text.includes("visitors") || text.includes("users")) {
      return `The latest data for ${report.siteName} indicates that your primary traffic nodes are stabilized. I recommend looking at the SEO intelligence panel for deeper demographic distribution.`;
    }

    if (text.includes("performance") || text.includes("ads") || text.includes("spend")) {
      return `I've analyzed the paid protocol arrays. ROI metrics are showing a positive slope, but there's room to optimize the CPC on your secondary campaigns.`;
    }

    if (text.includes("competitor") || text.includes("radar")) {
      return "Cross-referencing radar sweeps... Competitor Beta is currently outperforming in domain authority, but your keyword cluster density is superior.";
    }

    return "Message acknowledged. My analytical modules are focused on the " + report.category + " report for " + report.siteName + ". Would you like me to highlight any specific KPI deviations?";
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-6 right-6 z-[100] p-4 rounded-full
          bg-gradient-to-tr from-[#00d4ff] to-[#7c3aed] text-white shadow-2xl
          hover:scale-110 active:scale-95 transition-all duration-300 group
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
        `}
        aria-label="Open AI assistant"
      >
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </button>

      {/* Assistant Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-[450px] h-[600px] flex flex-col glass-panel rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_0_50px_rgba(0,212,255,0.1)]">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#00d4ff]/10 text-[#00d4ff]">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-display font-medium text-sm text-white">BNB AI Analyst</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Neural Link Active</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              >
                <Minimize2 size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`mt-1 h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border border-white/10 ${
                      msg.sender === 'user' ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'bg-[#00d4ff]/10 text-[#00d4ff]'
                    }`}>
                      {msg.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </div>

                    <div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#7c3aed]/20 text-white border-br-none rounded-tr-none'
                          : 'bg-white/5 text-white/90 border border-white/5 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <span className={`text-[8px] font-mono text-white/30 mt-1 block ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-white/5 border-t border-white/10"
            >
              <div className="relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about traffic, protocols, competitors..."
                  className="w-full bg-black/40 border border-white/10 text-xs text-white rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-[#00d4ff]/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-gradient-to-tr from-[#00d4ff] to-[#7c3aed] text-white disabled:opacity-30 transition-opacity"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
