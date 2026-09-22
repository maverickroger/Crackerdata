import React, { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import {
  X,
  ShieldCheck,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Hash,
  ArrowRight
} from 'lucide-react';

interface CashReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashReconciliationModal: React.FC<CashReconciliationModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    sales,
    purchases,
    expenses,
    closeDay,
    dailySeals,
    todayDateStr,
    nightMode
  } = useLedger();
  const { isAdmin, profile } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [physicalCashInput, setPhysicalCashInput] = useState<string>('');
  const [reconcileNotes, setReconcileNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successSeal, setSuccessSeal] = useState<any>(null);

  // Active records for selectedDate
  const daySales = useMemo(() => sales.filter(s => !s.isDeleted && s.date === selectedDate), [sales, selectedDate]);
  const dayPurchases = useMemo(() => purchases.filter(p => !p.isDeleted && p.date === selectedDate), [purchases, selectedDate]);
  const dayExpenses = useMemo(() => expenses.filter(e => !e.isDeleted && e.date === selectedDate), [expenses, selectedDate]);

  const totalSalesAmount = useMemo(() => daySales.reduce((acc, s) => acc + s.totalPrice, 0), [daySales]);
  const totalPurchasesAmount = useMemo(() => dayPurchases.reduce((acc, p) => acc + p.totalCost, 0), [dayPurchases]);
  const totalExpensesAmount = useMemo(() => dayExpenses.reduce((acc, e) => acc + e.amount, 0), [dayExpenses]);

  const cashSales = useMemo(() => daySales.filter(s => s.paymentType === 'cash').reduce((acc, s) => acc + s.totalPrice, 0), [daySales]);
  const fampaySales = useMemo(() => daySales.filter(s => s.paymentType === 'fampay').reduce((acc, s) => acc + s.totalPrice, 0), [daySales]);
  const cashExpenses = useMemo(() => dayExpenses.filter(e => e.paymentType === 'cash').reduce((acc, e) => acc + e.amount, 0), [dayExpenses]);
  const fampayExpenses = useMemo(() => dayExpenses.filter(e => e.paymentType === 'fampay').reduce((acc, e) => acc + e.amount, 0), [dayExpenses]);

  // Expected Physical Cash for that day = Cash Sales - Cash Expenses
  const expectedCash = useMemo(() => {
    return Math.max(0, cashSales - cashExpenses);
  }, [cashSales, cashExpenses]);

  const countedCash = parseFloat(physicalCashInput) || 0;
  const discrepancy = Number((countedCash - expectedCash).toFixed(2));

  // Check if already sealed
  const existingSeal = useMemo(() => {
    return dailySeals.find(s => s.date === selectedDate);
  }, [dailySeals, selectedDate]);

  if (!isOpen) return null;

  const handleSeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isAdmin) {
      setErrorMsg('Unauthorized: You do not have permission to close and seal daily accounts.');
      return;
    }

    if (physicalCashInput === '') {
      setErrorMsg('Please enter the actual physical cash counted in hand at the stall drawer.');
      return;
    }

    setSubmitting(true);

    try {
      const seal = await closeDay(selectedDate, countedCash, reconcileNotes);
      setSuccessSeal(seal);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to seal day accounts.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
        nightMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-base sm:text-lg">
                Daily Close &amp; Cash Reconciliation
              </h2>
              <p className="text-xs text-slate-400">
                Tamper-Evident SHA-256 Seal • Physical Drawer Audit
              </p>
            </div>
          </div>

          <button
            onClick={() => { setSuccessSeal(null); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {successSeal ? (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-emerald-300">
                Day {successSeal.date} Successfully Sealed!
              </h3>
              <p className="text-xs text-slate-300">
                All records for this date have been cryptographically stamped. Any post-seal edits will be visibly flagged.
              </p>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">SHA-256 Checksum:</span>
                  <span className="font-bold text-amber-400">{successSeal.checksum}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expected Cash:</span>
                  <span className="text-slate-200">₹{successSeal.expectedCash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Counted Cash:</span>
                  <span className="text-slate-200">₹{successSeal.physicalCashCounted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Discrepancy:</span>
                  <span className={`font-bold ${successSeal.discrepancy === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {successSeal.discrepancy >= 0 ? `+₹${successSeal.discrepancy}` : `-₹${Math.abs(successSeal.discrepancy)}`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setSuccessSeal(null); onClose(); }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 text-xs transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSeal} className="space-y-4">
              {/* Date Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reconciliation Date
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex-1 py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Already sealed notice if applicable */}
              {existingSeal && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>This day was sealed on {new Date(existingSeal.closedAt).toLocaleTimeString()}. Re-closing will update checksum and audit log.</span>
                  </div>
                </div>
              )}

              {/* Day Breakdown Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-400 pb-1 border-b border-slate-800 flex justify-between">
                  <span>Day Activity Summary ({daySales.length} sales, {dayPurchases.length} bills, {dayExpenses.length} exp)</span>
                  <span className="font-mono text-slate-300">{selectedDate}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400">Total Sales: </span>
                    <span className="font-bold text-white">₹{totalSalesAmount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Purchases: </span>
                    <span className="font-bold text-white">₹{totalPurchasesAmount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">💵 Cash Sales: </span>
                    <span className="font-bold text-emerald-400">₹{cashSales}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">📱 FamPay Sales: </span>
                    <span className="font-bold text-sky-400">₹{fampaySales}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">💵 Cash Expenses: </span>
                    <span className="font-bold text-rose-400">₹{cashExpenses}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">📱 FamPay Expenses: </span>
                    <span className="font-bold text-slate-300">₹{fampayExpenses}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono">
                  <span className="text-slate-300 font-semibold">Expected Cash in Drawer:</span>
                  <span className="text-sm font-extrabold text-emerald-400">₹{expectedCash}</span>
                </div>
              </div>

              {/* Physical Cash Input */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" />
                    Actual Physical Cash Counted in Hand:
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Stall Cash Drawer</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={physicalCashInput}
                      onChange={(e) => setPhysicalCashInput(e.target.value)}
                      placeholder="e.g. 14500"
                      className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-lg font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhysicalCashInput(String(expectedCash))}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-300"
                  >
                    Match Expected
                  </button>
                </div>

                {/* Discrepancy Display */}
                {physicalCashInput !== '' && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                    discrepancy === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : discrepancy > 0
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {discrepancy === 0 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Perfect Match! Zero Discrepancy</span>
                        </>
                      ) : discrepancy > 0 ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-sky-400" />
                          <span>Cash Surplus (+₹{discrepancy})</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Cash Shortage (-₹{Math.abs(discrepancy)})</span>
                        </>
                      )}
                    </div>
                    <span>{discrepancy >= 0 ? `+₹${discrepancy}` : `-₹${Math.abs(discrepancy)}`}</span>
                  </div>
                )}
              </div>

              {/* Explanatory notes */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Reconciliation Notes (optional)
                </label>
                <input
                  type="text"
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  placeholder="e.g. ₹50 loose change rounded to customer"
                  className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Seal button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || physicalCashInput === ''}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 font-bold text-slate-950 text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Lock className="w-4 h-4" />
                  {submitting ? 'Computing Cryptographic Seal...' : 'Seal Day & Lock Checksum'}
                </button>
                <p className="text-[10px] text-center text-slate-500 mt-2">
                  Computes SHA-256 seal of {selectedDate}. Future modifications will be permanently flagged.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
