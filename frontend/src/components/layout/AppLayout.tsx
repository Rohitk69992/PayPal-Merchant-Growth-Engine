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
  const [isGlobalReorderOpen, setIsGlobalReorderOpen] = useState(false);
  const [isGlobalCampaignOpen, setIsGlobalCampaignOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans text-[#172B45]">
      {/* Top Application Header */}
      <Header
        onToggleAiDrawer={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
        isAiDrawerOpen={isAiDrawerOpen}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden lg:flex" />

        {/* Dynamic Fluid Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ onOpenAiDrawer: () => setIsAiDrawerOpen(true) }} />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation for Small Viewports */}
      <MobileNav />

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
