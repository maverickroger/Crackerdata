import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LedgerProvider, useLedger } from './context/LedgerContext';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { TransactionFeed } from './components/TransactionFeed';
import { InventoryView } from './components/InventoryView';
import { WhatSoldTogetherView } from './components/WhatSoldTogetherView';
import { CashHandoversView } from './components/CashHandoversView';
import { AuditTrailView } from './components/AuditTrailModal';
import { QuickEntryModal } from './components/QuickEntryModal';
import { CashReconciliationModal } from './components/CashReconciliationModal';
import { SeasonSignOffModal } from './components/SeasonSignOffModal';
import { TrashModal } from './components/TrashModal';
import {
  Plus,
  WifiOff,
  Sparkles,
  Lock,
  Layers,
  ArrowRightLeft,
  History,
  ShoppingBag
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, profile, loading: authLoading } = useAuth();
  const { nightMode, isSeasonLocked, exportBackupNow } = useLedger();

  const [activeTab, setActiveTab] = useState<'feed' | 'inventory' | 'handovers' | 'insights' | 'audit'>('feed');

  // Modals state
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEntryTab, setQuickEntryTab] = useState<'sale' | 'purchase' | 'expense' | 'damaged'>('sale');
  const [sealModalOpen, setSealModalOpen] = useState(false);
  const [signOffModalOpen, setSignOffModalOpen] = useState(false);
  const [trashModalOpen, setTrashModalOpen] = useState(false);

  // Online / Offline connectivity tracker
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Loading Diwali Stall Ledger...</span>
      </div>
    );
  }

  if (!currentUser || !profile) {
    return <LoginScreen />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      nightMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Offline Stall Mode Active: All entries will sync automatically once internet reconnects via Firestore offline cache.</span>
        </div>
      )}

      {/* Season Locked Alert */}
      {isSeasonLocked && (
        <div className="bg-emerald-700 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-md">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Diwali 2026 Season Closed &amp; Formally Signed-Off by All 4 Partners. Ledger is permanently archived.</span>
        </div>
      )}

      {/* Main Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReconcile={() => setSealModalOpen(true)}
        onOpenSeasonModal={() => setSignOffModalOpen(true)}
        onOpenTrash={() => setTrashModalOpen(true)}
        onOpenBackup={() => exportBackupNow()}
        onOpenDigest={() => setSealModalOpen(true)}
      />

      {/* Application Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 pb-24">
        {activeTab === 'feed' && <TransactionFeed />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'insights' && <WhatSoldTogetherView />}
        {activeTab === 'handovers' && <CashHandoversView />}
        {activeTab === 'audit' && <AuditTrailView />}
      </main>

      {/* Floating Bottom Quick Stall Entry Action (Fast checkout on phone) */}
      {!isSeasonLocked && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2">
          <button
            onClick={() => {
              setQuickEntryTab('sale');
              setQuickEntryOpen(true);
            }}
            className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-xl shadow-amber-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>+ Quick Stall Entry</span>
          </button>
        </div>
      )}

      {/* Mobile bottom nav tabs for instant switching */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-30 border-t flex items-center justify-around py-2 px-1 backdrop-blur-lg ${
        nightMode ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl ${
            activeTab === 'feed' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl ${
            activeTab === 'inventory' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('handovers')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl ${
            activeTab === 'handovers' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Cash Custody</span>
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl ${
            activeTab === 'insights' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Bundles</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl ${
            activeTab === 'audit' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* Modals */}
      <QuickEntryModal
        isOpen={quickEntryOpen}
        onClose={() => setQuickEntryOpen(false)}
        initialTab={quickEntryTab}
      />

      <CashReconciliationModal
        isOpen={sealModalOpen}
        onClose={() => setSealModalOpen(false)}
      />

      <SeasonSignOffModal
        isOpen={signOffModalOpen}
        onClose={() => setSignOffModalOpen(false)}
      />

      <TrashModal
        isOpen={trashModalOpen}
        onClose={() => setTrashModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LedgerProvider>
        <MainAppContent />
      </LedgerProvider>
    </AuthProvider>
  );
}
