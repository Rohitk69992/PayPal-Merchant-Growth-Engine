import React, { useState } from 'react';
import {
  X,
  Bot,
  Send,
  Wrench,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerReorderModal?: () => void;
  onTriggerCampaignModal?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  toolExecutions?: {
    tool_name: string;
    arguments: Record<string, any>;
    status: string;
  }[];
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, currentMerchant } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'agent',
      text: `Hello ${user?.full_name ? user.full_name.split(' ')[0] : 'Partner'}! I am your PayPal Growth Copilot. I can query your persistent store data, evaluate your inventory safety stocks, check your RFM customer segments, and draft marketing strategies. How can I assist you today?`,
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'What is our current merchant revenue and balance overview?',
    'What should I reorder to avoid stockouts?',
    'What are my current RFM customer segments?',
    'Draft a targeted promotional campaign for high-value customers',
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await apiClient.sendAgentMessage(textToSend);
      const agentMsg: Message = {
        id: response.id,
        sender: 'agent',
        text: response.content,
        toolExecutions: response.tool_executions,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'agent',
          text: `Service Notice: ${err.message || 'Unable to connect to AI Agent. Please verify your backend connection.'}`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/30 flex items-center justify-center text-blue-200 border border-blue-400/30">
              <Bot className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                <span>PayPal AI Copilot</span>
                <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/80 text-white rounded font-bold uppercase">
                  Connected
                </span>
              </h3>
              <p className="text-[11px] text-blue-200/80">
                {currentMerchant?.business_name || 'Merchant Context'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/70'
                }`}
              >
                {/* Agent Tool Execution Pill if agent invoked tools */}
                {m.toolExecutions && m.toolExecutions.length > 0 && (
                  <div className="mb-2.5 space-y-1.5">
                    {m.toolExecutions.map((tool, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white/90 border border-slate-200 flex items-center justify-between gap-2 text-[10px] text-slate-700 font-mono shadow-2xs"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-bold text-blue-900 truncate">
                            {tool.tool_name}
                          </span>
                        </div>
                        <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                          {tool.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}

          {/* Thinking Indicator */}
          {isThinking && (
            <div className="flex items-start">
              <div className="bg-slate-100 rounded-2xl rounded-bl-xs p-3 text-xs text-slate-500 flex items-center gap-2 border border-slate-200/70">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Evaluating merchant models & tools...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-[10px] font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1.5 rounded-lg border border-slate-200 shrink-0 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Text Input Box */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your PayPal Growth Copilot..."
              className="flex-1 bg-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-transparent focus:border-blue-400 focus:bg-white focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
