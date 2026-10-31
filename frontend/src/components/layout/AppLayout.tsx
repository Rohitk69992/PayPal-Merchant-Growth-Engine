import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AiCopilotDrawer } from '../ai/AiCopilotDrawer';
import { ReorderModal } from '../inventory/ReorderModal';
import { CampaignModal } from '../marketing/CampaignModal';

export const AppLayout: React.FC = () => {
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isMobileDeviceView, setIsMobileDeviceView] = useState(false);
  const [isGlobalReorderOpen, setIsGlobalReorderOpen] = useState(false);
  const [isGlobalCampaignOpen, setIsGlobalCampaignOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        onToggleAiDrawer={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
        isAiDrawerOpen={isAiDrawerOpen}
        isMobileDeviceView={isMobileDeviceView}
        onToggleDeviceView={() => setIsMobileDeviceView(!isMobileDeviceView)}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (visible on desktop when not in mobile preview frame) */}
        {!isMobileDeviceView && <Sidebar className="hidden lg:flex" />}

        {/* Dynamic Viewport Container */}
        <main className="flex-1 overflow-y-auto flex justify-center p-2 sm:p-6">
          {isMobileDeviceView ? (
            /* Realistic Mobile Device Smartphone Frame matching the Wireframe Layout */
            <div className="w-full max-w-[412px] bg-white rounded-[44px] shadow-2xl border-[10px] border-slate-800 flex flex-col overflow-hidden relative min-h-[820px] max-h-[880px]">
              {/* Phone Status Bar */}
              <div className="bg-white px-7 pt-3 pb-2 flex items-center justify-between text-xs font-bold text-slate-800 shrink-0 select-none">
                <span>9:41</span>
                {/* Notch speaker */}
                <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>5G</span>
                  <div className="w-5 h-2.5 border border-slate-800 rounded-sm p-0.5">
                    <div className="h-full bg-slate-800 rounded-xs w-3/4" />
                  </div>
                </div>
              </div>

              {/* Scrollable Mobile Screen Content */}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <Outlet />
              </div>

              {/* Mobile Phone Bottom Navigation */}
              <MobileNav />
            </div>
          ) : (
            /* Full Width Responsive Dashboard Container */
            <div className="w-full max-w-5xl mx-auto">
              <Outlet />
              {/* Mobile Bottom Navigation for actual mobile viewports */}
              <div className="block lg:hidden">
                <MobileNav />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating Global AI Assistant Drawer */}
      <AiCopilotDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        onTriggerReorderModal={() => setIsGlobalReorderOpen(true)}
        onTriggerCampaignModal={() => setIsGlobalCampaignOpen(true)}
      />

      {/* Global Modals triggered from AI Drawer */}
      <ReorderModal
        isOpen={isGlobalReorderOpen}
        onClose={() => setIsGlobalReorderOpen(false)}
      />
      <CampaignModal
        isOpen={isGlobalCampaignOpen}
        onClose={() => setIsGlobalCampaignOpen(false)}
      />
    </div>
  );
};
