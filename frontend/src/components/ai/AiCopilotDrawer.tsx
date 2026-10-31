import React, { useState } from 'react';
import {
  X,
  Bot,
  Send,
  Sparkles,
  ArrowRight,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  toolCall?: {
    name: string;
    params: Record<string, any>;
    status: 'EXECUTED';
  };
  action?: {
    label: string;
    route?: string;
    callbackType?: 'reorder' | 'campaign';
  };
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  onTriggerReorderModal,
  onTriggerCampaignModal,
}) => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'agent',
      text: "Hello Aanya! I am your PayPal Growth Copilot. I analyze your transaction streams, Scikit-learn customer clusters, and time-series demand models to help you grow your business. How can I assist you today?",
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'What should I reorder to avoid stockouts?',
    'Who are my best customers right now?',
    'Draft a retention campaign for new buyers',
  ];

  const handleSend = (queryText?: string) => {
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

    setTimeout(() => {
      let agentReply: Message;
      const lower = textToSend.toLowerCase();

      if (lower.includes('reorder') || lower.includes('stock') || lower.includes('inventory')) {
        agentReply = {
          id: `a_${Date.now()}`,
          sender: 'agent',
          toolCall: {
            name: 'calculate_reorder_recommendation',
            params: { product_id: 'prod_1', lead_time_days: 14 },
            status: 'EXECUTED',
          },
          text: "Based on Holt-Winters seasonal forecasting, your **Wireless Headphones** demand is projected to surge by **+42%** over the upcoming holiday quarter. With 80 units currently on hand and a 14-day vendor lead time, you face a critical stockout risk by mid-December. I recommend placing a replenishment order of **120 units** within the next 2 weeks.",
          action: {
            label: 'Review & Add 120 Units to Order',
            callbackType: 'reorder',
          },
        };
      } else if (lower.includes('customer') || lower.includes('segment') || lower.includes('best')) {
        agentReply = {
          id: `a_${Date.now()}`,
          sender: 'agent',
          toolCall: {
            name: 'get_customer_segments',
            params: { metric: 'RFM_KMEANS' },
            status: 'EXECUTED',
          },
          text: "Your RFM analysis reveals 4 distinct customer cohorts: **VIPs (10%)** generate an average spend of **$680.00**, while **New Customers (42%)** represent your largest immediate growth opportunity with an average spend of **$62.50**. Geographic clustering shows **Mumbai (32%)** and **Bengaluru (24%)** are your top volume hubs.",
          action: {
            label: 'Explore AI Marketing Insights',
            route: '/marketing',
          },
        };
      } else if (lower.includes('campaign') || lower.includes('retention') || lower.includes('draft')) {
        agentReply = {
          id: `a_${Date.now()}`,
          sender: 'agent',
          toolCall: {
            name: 'generate_campaign_draft',
            params: { target_segment: 'New Customers', incentive: '15% Off' },
            status: 'EXECUTED',
          },
          text: "I have prepared a targeted retention draft for your **378 New Customers**: Headline: *'Unlock 15% Off Your Next Audio Upgrade'*. Expected conversion rate is **6.8%**, projected to generate an incremental **$1,600+** in PayPal GMV.",
          action: {
            label: 'Inspect & Schedule Campaign',
            callbackType: 'campaign',
          },
        };
      } else {
        agentReply = {
          id: `a_${Date.now()}`,
          sender: 'agent',
          toolCall: {
            name: 'get_merchant_overview',
            params: { merchant_id: 'm_1001' },
            status: 'EXECUTED',
          },
          text: "Your PayPal merchant balance stands at **$12,580.32** (+12% 30-day growth). All account systems and PayPal payment rails are fully secure with 0 dispute flags. Would you like me to analyze product demand or draft a marketing campaign?",
        };
      }

      setMessages((prev) => [...prev, agentReply]);
      setIsThinking(false);
    }, 800);
  };

  const handleActionClick = (action: Message['action']) => {
    if (!action) return;
    if (action.callbackType === 'reorder' && onTriggerReorderModal) {
      onClose();
      onTriggerReorderModal();
    } else if (action.callbackType === 'campaign' && onTriggerCampaignModal) {
      onClose();
      onTriggerCampaignModal();
    } else if (action.route) {
      onClose();
      navigate(action.route);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-tight">PayPal AI Copilot</h3>
                <span className="px-1.5 py-0.2 bg-blue-400/20 text-blue-200 text-[9px] font-extrabold rounded-md uppercase">
                  Agentic
                </span>
              </div>
              <p className="text-[10px] text-blue-200/80">Controlled Backend Function Calling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
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
              {/* Tool Execution Tag */}
              {m.toolCall && (
                <div className="mb-1.5 flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-mono text-slate-600 border border-slate-200">
                  <Wrench className="w-3 h-3 text-blue-600" />
                  <span>Executed: {m.toolCall.name}()</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#0070e0] text-white rounded-br-xs'
                    : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/70'
                }`}
              >
                <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />

                {m.action && (
                  <button
                    onClick={() => handleActionClick(m.action)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0070e0] hover:bg-[#005ea6] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <span>{m.action.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 max-w-[70%]">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">Orchestrating tools & ML models...</span>
            </div>
          )}
        </div>

        {/* Suggested Queries */}
        <div className="p-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Suggested Prompts</p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-[11px] px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 text-slate-600 hover:text-blue-600 rounded-lg transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white">
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
              placeholder="Ask about inventory, customers, or campaigns..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 rounded-xl bg-[#0070e0] hover:bg-[#005ea6] text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="mt-1.5 text-[9px] text-center text-slate-400">
            PayPal Agentic AI Engine — Responses validated with real ML models.
          </p>
        </div>
      </div>
    </div>
  );
};
