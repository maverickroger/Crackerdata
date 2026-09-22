import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRightLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
  User,
  Plus
} from 'lucide-react';

export const CashHandoversView: React.FC = () => {
  const { cashHandovers, initiateCashHandover, confirmCashHandover, nightMode, isSeasonLocked } = useLedger();
  const { profile, predefinedPartners } = useAuth();

  const [toUid, setToUid] = useState<string>('');
  const [toName, setToName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  const otherPartners = predefinedPartners.filter(p => p.email !== profile?.email);

  const handlePartnerSelect = (email: string) => {
    const p = predefinedPartners.find(x => x.email === email);
    if (p) {
      setToUid(email); // or uid
      setToName(p.name);
    }
  };

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSeasonLocked) {
      setErrorMsg('Season is locked.');
      return;
    }

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setErrorMsg('Please enter a valid transfer amount.');
      return;
    }

    if (!toName) {
      setErrorMsg('Please select the partner receiving the cash.');
      return;
    }

    setSubmitting(true);
    try {
      await initiateCashHandover(toUid || toName, toName, amt, notes);
      setAmount('');
      setNotes('');
      setShowNewModal(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to record handover.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ArrowRightLeft className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-base sm:text-lg">Physical Cash Custody Trail</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            2-Party confirmation for stall cash transfers. Person A logs transfer, Person B digitally acknowledges receipt.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Hand Over Cash</span>
        </button>
      </div>

      {/* New Handover Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 ${
            nightMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-base mb-1 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              Initiate Physical Cash Handover
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              From: <span className="font-bold text-white">{profile?.displayName}</span> (You)
            </p>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleInitiate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Handing Over Cash To (Recipient Partner)
                </label>
                <select
                  value={toUid}
                  onChange={(e) => handlePartnerSelect(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="">-- Select Partner --</option>
                  {otherPartners.map(p => (
                    <option key={p.email} value={p.email}>
                      {p.name} ({p.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount Handed Over (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Purpose / Shift Note
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Afternoon shift cash collection deposited into stall safe"
                  className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 text-xs shadow-md shadow-amber-500/20"
                >
                  {submitting ? 'Recording...' : 'Send Handover Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handovers List */}
      <div className="space-y-2.5">
        {cashHandovers.length === 0 ? (
          <div className={`p-8 rounded-2xl border text-center text-xs text-slate-400 ${
            nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            No physical cash handovers recorded yet. Use this when partners transfer stall cash between shifts or for bank deposits.
          </div>
        ) : (
          cashHandovers.map(handover => {
            const isPending = handover.status === 'pending';
            const isRecipient = handover.toUid === profile?.email || handover.toName === profile?.displayName;

            return (
              <div
                key={handover.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isPending
                    ? nightMode ? 'bg-amber-950/20 border-amber-500/40' : 'bg-amber-50 border-amber-200'
                    : nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`p-2.5 rounded-xl text-lg font-mono font-extrabold flex items-center justify-center shrink-0 ${
                      isPending ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      ₹{handover.amount.toLocaleString()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                        <span className="text-slate-200">{handover.fromName}</span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-amber-400 font-bold">{handover.toName}</span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(handover.initiatedAt).toLocaleDateString()} {new Date(handover.initiatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {handover.notes && (
                          <span className="italic text-slate-300">"{handover.notes}"</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Confirmation Action */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isPending ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                          <AlertCircle className="w-3 h-3" /> Awaiting Receipt
                        </span>

                        {isRecipient && (
                          <button
                            onClick={() => confirmCashHandover(handover.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Confirm Receipt
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Confirmed by {handover.toName} ({new Date(handover.confirmedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
