import React, { useState, useEffect, useRef } from 'react';
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
      text: `Hello ${user?.full_name ? user.full_name.split(' ')[0] : 'Partner'}, I am your PayPal Merchant Growth Copilot. I can query real-time sales balances, evaluate inventory reorder points, analyze RFM customer cohorts, and execute operational tools for your business. How can I assist you today?`,
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickPrompts = [
    'What is our current merchant balance & sales overview?',
    'Which items are below safety stock and need reordering?',
    'What are our current RFM customer segments?',
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
        id: response.id || `a_${Date.now()}`,
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
          text: `Service Notice: ${err.message || 'Unable to connect to AI Agent. Please verify your backend server.'}`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#172B45]/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#D9E2EC] z-10">
        {/* Drawer Header */}
        <div className="p-4 bg-[#1E3A5F] text-white flex items-center justify-between shrink-0 border-b border-[#162C48]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4779A8]/30 flex items-center justify-center text-[#DCEAF5] border border-[#4779A8]/40">
              <Bot className="w-4 h-4 text-[#DCEAF5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">
                  Merchant Growth Copilot
                </h3>
                <span className="px-1.5 py-0.2 text-[9px] bg-[#16A085] text-white rounded font-mono font-bold uppercase">
                  Connected
                </span>
              </div>
              <p className="text-[11px] text-[#DCEAF5]/80 font-mono">
                {currentMerchant?.business_name || 'Merchant Context'} • {currentMerchant?.currency || 'USD'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close copilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8FAFC]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl p-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#4779A8] text-white font-medium shadow-2xs'
                    : 'bg-white text-[#172B45] border border-[#D9E2EC] shadow-2xs'
                }`}
              >
                {/* Agent Tool Execution Pill if agent invoked tools */}
                {m.toolExecutions && m.toolExecutions.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {m.toolExecutions.map((tool, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 rounded-lg bg-[#F1F5F9] border border-[#D9E2EC] flex items-center justify-between gap-2 text-[10px] text-[#334155] font-mono"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Wrench className="w-3 h-3 text-[#4779A8] shrink-0" />
                          <span className="font-bold text-[#1E3A5F] truncate">
                            {tool.tool_name}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#16A085] font-bold bg-[#E8F6F3] px-1.5 py-0.2 rounded border border-[#A3E4D7] shrink-0">
                          {tool.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="whitespace-pre-line">{m.text}</p>
              </div>
            </div>
          ))}

          {/* Thinking Indicator */}
          {isThinking && (
            <div className="flex items-start">
              <div className="bg-white rounded-xl p-3 text-xs text-[#64748B] flex items-center gap-2 border border-[#D9E2EC] shadow-2xs">
                <Loader2 className="w-3.5 h-3.5 text-[#4779A8] animate-spin" />
                <span>Evaluating financial models & tool execution...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 border-t border-[#D9E2EC] bg-[#FFFFFF] flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-[10px] font-medium text-[#1E3A5F] bg-[#F1F5F9] hover:bg-[#DCEAF5] hover:border-[#CBD5E1] px-2.5 py-1.5 rounded-md border border-[#D9E2EC] shrink-0 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Text Input Box */}
        <div className="p-3 bg-white border-t border-[#D9E2EC] shrink-0">
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
              className="flex-1 bg-[#F1F5F9] text-xs px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] focus:border-[#4779A8] focus:bg-white focus:outline-none transition-all placeholder-[#94A3B8] text-[#172B45]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="w-9 h-9 rounded-lg bg-[#4779A8] hover:bg-[#3B6891] text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
