import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import {
  FileCheck2,
  Lock,
  CheckCircle2,
  Clock,
  IndianRupee,
  Users,
  X,
  AlertTriangle,
  Download
} from 'lucide-react';
import { exportLedgerJson, exportSalesCsv } from '../utils/export';

interface SeasonSignOffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SeasonSignOffModal: React.FC<SeasonSignOffModalProps> = ({ isOpen, onClose }) => {
  const {
    seasonConfig,
    signoffSeason,
    totalSales,
    totalPurchases,
    totalExpenses,
    runningProfit,
    cashInHand,
    sales,
    purchases,
    expenses,
    dailySeals,
    auditLogs,
    cashHandovers,
    isSeasonLocked,
    nightMode
  } = useLedger();

  const { profile, predefinedPartners } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const currentUid = profile?.uid || '';
  const currentEmail = profile?.email || '';

  // Determine if current user has already signed
  const userHasSigned = seasonConfig?.signoffs?.some(
    (u: any) => u.uid === currentUid || u.email === currentEmail
  );

  const signOffCount = seasonConfig?.signoffs?.length || 0;
  const partnerCount = predefinedPartners.length || 3;
  const perPartnerShare = Number((runningProfit / partnerCount).toFixed(2));

  const handleSign = async () => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      await signoffSeason();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to record digital sign-off.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportBackup = () => {
    exportLedgerJson({
      seasonConfig,
      sales,
      purchases,
      expenses,
      dailySeals,
      auditLogs,
      cashHandovers,
      totals: { totalSales, totalPurchases, totalExpenses, runningProfit, cashInHand }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        nightMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-base sm:text-lg">
                Diwali Season Final Sign-Off
              </h2>
              <p className="text-xs text-slate-400">
                All {partnerCount} partners must individually digitally confirm before season lock.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {isSeasonLocked && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
              <Lock className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block text-sm">Season Closed &amp; Locked!</span>
                All {partnerCount} partners confirmed final accounts. The ledger is now officially sealed and immutable.
              </div>
            </div>
          )}

          {/* Final Financial Summary */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Final Financial Summary</span>
              <span className="text-amber-400">Diwali 2026</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Sales</span>
                <span className="font-mono font-bold text-emerald-400">₹{totalSales.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Stock Cost</span>
                <span className="font-mono font-bold text-slate-300">₹{totalPurchases.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Stall Expenses</span>
                <span className="font-mono font-bold text-rose-400">₹{totalExpenses.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Net Profit</span>
                <span className="font-mono font-bold text-amber-400">₹{runningProfit.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">Equal {partnerCount}-Way Profit Distribution (1/{partnerCount}th):</span>
              <span className="text-base font-extrabold text-amber-400">₹{perPartnerShare.toLocaleString()} / partner</span>
            </div>
          </div>

          {/* Partners Sign-Off Status Grid */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Digital Sign-Off Status ({signOffCount} of {partnerCount} signed)</span>
              <span className="text-[11px] font-mono text-amber-400">{Math.round((signOffCount / partnerCount) * 100)}%</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {predefinedPartners.map(partner => {
                const signature = seasonConfig?.signoffs?.find(
                  (u: any) => u.email === partner.email || u.displayName === partner.name
                );

                return (
                  <div
                    key={partner.email}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      signature
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {partner.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {signature
                          ? `Signed on ${new Date(signature.confirmedAt).toLocaleDateString()} ${new Date(signature.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Pending confirmation'}
                      </div>
                    </div>

                    {signature ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action button for active user */}
          {!isSeasonLocked && (
            <div className="pt-2 space-y-2">
              {userHasSigned ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-300 font-semibold">
                  ✓ You ({profile?.displayName}) have already digitally signed off on this statement.
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSign}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 font-bold text-slate-950 text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <FileCheck2 className="w-4 h-4" />
                  {submitting ? 'Signing...' : 'I Agree These Numbers Are Final and Accurate'}
                </button>
              )}
            </div>
          )}

          {/* Export JSON / CSV backup button */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Download complete audit backup:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>JSON Ledger</span>
              </button>
              <button
                type="button"
                onClick={() => exportSalesCsv(sales)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sales CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
