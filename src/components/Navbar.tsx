import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import {
  Flame,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  LogOut,
  Users,
  ShieldCheck,
  UserCheck,
  Lock,
  ArrowRightLeft,
  Trash2,
  FileSpreadsheet,
  Layers,
  History,
  AlertTriangle,
  Sparkles,
  CalendarCheck
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'feed' | 'inventory' | 'handovers' | 'insights' | 'audit';
  setActiveTab: (tab: 'feed' | 'inventory' | 'handovers' | 'insights' | 'audit') => void;
  onOpenReconcile: () => void;
  onOpenTrash: () => void;
  onOpenSeasonModal: () => void;
  onOpenBackup: () => void;
  onOpenDigest: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenReconcile,
  onOpenTrash,
  onOpenSeasonModal,
  onOpenBackup,
  onOpenDigest
}) => {
  const { profile, isAdmin, logout, predefinedPartners, signInPartnerQuick } = useAuth();
  const {
    cashInHand,
    fampayBalance,
    runningProfit,
    isOnline,
    nightMode,
    toggleNightMode,
    isTodaySealed,
    unconfirmedHandoversCount,
    isSeasonLocked,
    seasonConfig
  } = useLedger();

  const [partnerMenuOpen, setPartnerMenuOpen] = useState(false);

  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
      nightMode
        ? 'bg-slate-950/95 border-slate-800 text-slate-100'
        : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Top Banner if Season is Locked */}
      {isSeasonLocked && (
        <div className="bg-amber-600 text-white px-3 py-1.5 text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-sm">
          <Lock className="w-3.5 h-3.5" />
          <span>{seasonConfig?.seasonName || 'Diwali Season'} is Signed-Off &amp; Permanently Locked by all 3 Partners. Read-only mode.</span>
          <button
            onClick={onOpenSeasonModal}
            className="ml-2 underline font-bold hover:text-amber-100"
          >
            View Sign-offs
          </button>
        </div>
      )}

      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Stall Brand */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-md shadow-amber-500/20">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base tracking-tight leading-tight">
                <span>Diwali Patakas</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  STALL 2026
                </span>
              </div>
              <div className="text-[10px] text-slate-400 hidden sm:block">
                3-Partner Shared Cash Ledger
              </div>
            </div>
          </div>

          {/* Quick Money Strip on Desktop/Tablet */}
          <div className="hidden md:flex items-center gap-2">
            <div className={`px-2.5 py-1 rounded-xl border text-xs flex items-center gap-1.5 ${
              nightMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-slate-400 font-medium">💵 Cash in Hand:</span>
              <span className="font-mono font-bold text-emerald-500">₹{cashInHand.toLocaleString()}</span>
            </div>

            <div className={`px-2.5 py-1 rounded-xl border text-xs flex items-center gap-1.5 ${
              nightMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-slate-400 font-medium">📱 FamPay:</span>
              <span className="font-mono font-bold text-sky-500">₹{fampayBalance.toLocaleString()}</span>
            </div>

            <div className={`px-2.5 py-1 rounded-xl border text-xs flex items-center gap-1.5 ${
              runningProfit >= 0
                ? nightMode ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : nightMode ? 'bg-rose-950/40 border-rose-800 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <span className="font-medium">Net Profit:</span>
              <span className="font-mono font-bold">
                {runningProfit >= 0 ? `+₹${runningProfit.toLocaleString()}` : `-₹${Math.abs(runningProfit).toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Controls: Online/Offline, Night toggle, Profile & Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Online/Offline indicator */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
              }`}
              title={isOnline ? 'Online - Cloud Sync Active' : 'Offline Mode - Entries saved locally, will sync when online'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* High-Contrast Night Mode Toggle */}
            <button
              onClick={toggleNightMode}
              aria-label="Toggle Night Stall Mode"
              className={`p-2 rounded-xl border transition-colors ${
                nightMode
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Toggle Night Stall High Contrast"
            >
              {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Partner Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPartnerMenuOpen(!partnerMenuOpen)}
                className={`flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border transition-all text-xs font-medium ${
                  nightMode
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                }`}
              >
                <div className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-white text-[11px] bg-amber-600">
                  {profile?.displayName?.charAt(0) || 'P'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold leading-tight">{profile?.displayName?.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-400 leading-none">
                    Partner
                  </div>
                </div>
              </button>

              {partnerMenuOpen && (
                <div className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl p-2 z-50 ${
                  nightMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="px-3 py-2 border-b border-slate-700/50 mb-1">
                    <div className="font-bold text-xs">{profile?.displayName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{profile?.email}</div>
                    <div className="mt-1 flex items-center gap-1 text-[10px]">
                      <span className="text-amber-400/90 font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" /> Stall Partner
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1">
                    Fast Partner Switch (Stall Phone)
                  </div>

                  <div className="space-y-1 mb-2">
                    {predefinedPartners.map(partner => (
                      <button
                        key={partner.email}
                        onClick={() => {
                          setPartnerMenuOpen(false);
                          if (partner.email !== profile?.email) {
                            signInPartnerQuick(partner);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          partner.email === profile?.email
                            ? 'bg-amber-500/20 text-amber-400 font-semibold'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold text-white ${partner.avatarBg}`}>
                            {partner.name.charAt(0)}
                          </div>
                          <span>{partner.name}</span>
                        </div>
                        <span className="text-[9px] font-medium text-slate-400">
                          Partner
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-700/50 pt-1">
                    <button
                      onClick={() => {
                        setPartnerMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Running Money Banner */}
        <div className={`flex md:hidden items-center justify-between py-1.5 px-2 rounded-xl border text-[11px] mb-2 ${
          nightMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div>
            <span className="text-slate-400">💵 Cash: </span>
            <span className="font-mono font-bold text-emerald-500">₹{cashInHand.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-400">📱 FamPay: </span>
            <span className="font-mono font-bold text-sky-500">₹{fampayBalance.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-400">Profit: </span>
            <span className={`font-mono font-bold ${runningProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{runningProfit.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Primary Tabs Navigation & Fast Action Buttons */}
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-1 gap-2 border-t border-slate-800/40">
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'feed'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : nightMode ? 'text-slate-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Transactions
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : nightMode ? 'text-slate-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Stock &amp; Margin
            </button>

            <button
              onClick={() => setActiveTab('handovers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 relative ${
                activeTab === 'handovers'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : nightMode ? 'text-slate-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Cash Custody
              {unconfirmedHandoversCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'insights'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : nightMode ? 'text-slate-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Bundles
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : nightMode ? 'text-slate-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Audit Log
            </button>
          </nav>

          {/* Quick Header Tools: Reconcile Day, Trash, Season Sign-off, Backup */}
          <div className="flex items-center gap-1">
            {isAdmin && (
              <>
                <button
                  onClick={onOpenReconcile}
                  className={`px-2.5 py-1.2 rounded-lg text-xs font-semibold whitespace-nowrap border flex items-center gap-1 transition-colors ${
                    isTodaySealed
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                  }`}
                  title="Daily Close & Physical Cash Count"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isTodaySealed ? 'Day Sealed ✓' : 'Seal Day'}</span>
                </button>

                <button
                  onClick={onOpenDigest}
                  className="p-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Daily Edits & Deletes Digest"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenTrash}
                  className="p-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="30-Day Trash Bin"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onOpenBackup}
              className="p-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              title="Daily Automated Backup (CSV & JSON)"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenSeasonModal}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
              title="3-Partner Season Sign-Off"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Season Sign-off</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
