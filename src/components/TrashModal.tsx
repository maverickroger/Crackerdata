import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  X,
  Clock,
  ShieldAlert,
  Flame,
  CheckCircle
} from 'lucide-react';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const { sales, purchases, expenses, damagedStock, restoreEntry, purgeEntry, nightMode } = useLedger();
  const { isAdmin, profile } = useAuth();

  const [reasonInput, setReasonInput] = useState<string>('');
  const [activeItem, setActiveItem] = useState<{ id: string; type: any } | null>(null);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Gather all soft-deleted entries
  const deletedSales = sales.filter(s => s.isDeleted).map(s => ({ ...s, collectionType: 'sales' as const }));
  const deletedPurchases = purchases.filter(p => p.isDeleted).map(p => ({ ...p, collectionType: 'purchases' as const }));
  const deletedExpenses = expenses.filter(e => e.isDeleted).map(e => ({ ...e, collectionType: 'expenses' as const }));
  const deletedDamaged = damagedStock.filter(d => d.isDeleted).map(d => ({ ...d, collectionType: 'damaged_stock' as const }));

  const allTrash = [...deletedSales, ...deletedPurchases, ...deletedExpenses, ...deletedDamaged];
  allTrash.sort((a, b) => new Date(b.deletedAt || '').getTime() - new Date(a.deletedAt || '').getTime());

  const handleAction = async () => {
    if (!activeItem) return;
    setSubmitting(true);
    try {
      if (isPurging) {
        await purgeEntry(activeItem.type, activeItem.id, reasonInput || 'Permanent purge from 30-day trash');
      } else {
        await restoreEntry(activeItem.type, activeItem.id, reasonInput || 'Restored back from trash');
      }
      setActiveItem(null);
      setReasonInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
        nightMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <Trash2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-base sm:text-lg">
                Admin 30-Day Trash Bin
              </h2>
              <p className="text-xs text-slate-400">
                Soft-deleted items are safely quarantined here. Zero silent deletions.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {allTrash.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Trash bin is empty. No deleted transactions.
            </div>
          ) : (
            allTrash.map(item => {
              const deletedDate = item.deletedAt ? new Date(item.deletedAt) : new Date();
              const daysAgo = Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
              const daysRemaining = Math.max(0, 30 - daysAgo);

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {item.collectionType}
                      </span>
                      <span className="font-bold text-white text-sm">
                        {(item as any).itemName || (item as any).category || 'Transaction'}
                      </span>
                      <span className="text-slate-400 font-mono">
                        (₹{(item as any).totalPrice || (item as any).totalCost || (item as any).amount || 0})
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-amber-400">
                      {daysRemaining} days left in trash
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] space-y-1">
                    <div className="text-slate-400">
                      Deleted by: <span className="font-semibold text-white">{item.deletedBy || 'Admin'}</span> on{' '}
                      {deletedDate.toLocaleDateString()}
                    </div>
                    {item.deleteReason && (
                      <div className="text-slate-300 italic">
                        Reason: "{item.deleteReason}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        setActiveItem({ id: item.id, type: item.collectionType });
                        setIsPurging(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      Restore
                    </button>

                    <button
                      onClick={() => {
                        setActiveItem({ id: item.id, type: item.collectionType });
                        setIsPurging(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Permanent Purge
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Confirmation Modal for Restore or Purge */}
        {activeItem && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>{isPurging ? 'Confirm Permanent Purge' : 'Confirm Restoration to Ledger'}</span>
            </div>

            <input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Type required confirmation reason..."
              className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleAction}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white ${
                  isPurging ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {submitting ? 'Processing...' : isPurging ? 'Purge Permanently' : 'Restore Entry'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
