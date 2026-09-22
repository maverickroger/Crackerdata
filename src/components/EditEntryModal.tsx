import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Trash2,
  Lock,
  Edit3
} from 'lucide-react';

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: any;
  collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock';
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  isOpen,
  onClose,
  entry,
  collectionType
}) => {
  const { editEntry, softDeleteEntry, dailySeals, nightMode } = useLedger();
  const { isAdmin, profile } = useAuth();

  const [quantity, setQuantity] = useState<number>(entry?.quantity || 1);
  const [priceOrAmount, setPriceOrAmount] = useState<number>(
    collectionType === 'sales'
      ? entry?.unitPrice || 0
      : collectionType === 'purchases'
      ? entry?.costPerUnit || 0
      : entry?.amount || 0
  );
  const [paymentType, setPaymentType] = useState<'cash' | 'fampay'>(entry?.paymentType || 'cash');
  const [noteOrSupplier, setNoteOrSupplier] = useState<string>(
    collectionType === 'purchases'
      ? entry?.supplierName || ''
      : entry?.note || entry?.reason || ''
  );

  const [mandatoryReason, setMandatoryReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [actionType, setActionType] = useState<'edit' | 'delete'>('edit');

  if (!isOpen || !entry) return null;

  // Check if entry belongs to a closed/sealed date
  const entryDate = entry.date || (entry.timestamp ? entry.timestamp.split('T')[0] : '');
  const isDateSealed = dailySeals.some(s => s.date === entryDate);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isAdmin) {
      setErrorMsg('Unauthorized: You do not have permission to modify or delete entries.');
      return;
    }

    if (!mandatoryReason || mandatoryReason.trim().length < 5) {
      setErrorMsg('MANDATORY: Please type an explicit explanation reason (min 5 chars) before proceeding.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (actionType === 'delete') {
        await softDeleteEntry(collectionType, entry.id, mandatoryReason.trim());
        onClose();
        return;
      }

      // Build changes object
      const changes: Record<string, any> = {};

      if (collectionType === 'sales') {
        changes.quantity = Number(quantity);
        changes.unitPrice = Number(priceOrAmount);
        changes.totalPrice = Number((quantity * priceOrAmount).toFixed(2));
        changes.paymentType = paymentType;
      } else if (collectionType === 'purchases') {
        changes.quantity = Number(quantity);
        changes.costPerUnit = Number(priceOrAmount);
        changes.totalCost = Number((quantity * priceOrAmount).toFixed(2));
        changes.supplierName = noteOrSupplier;
      } else if (collectionType === 'expenses') {
        changes.amount = Number(priceOrAmount);
        changes.paymentType = paymentType;
        changes.note = noteOrSupplier;
      } else if (collectionType === 'damaged_stock') {
        changes.quantity = Number(quantity);
        changes.reason = noteOrSupplier;
      }

      await editEntry(collectionType, entry.id, changes, mandatoryReason.trim());
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
        nightMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {actionType === 'edit' ? 'Audit Edit' : 'Soft Delete to Trash'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Entry ID: #{entry.id?.slice(0, 8)} • Logged by {entry.loggedByName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sealed Day Warning */}
        {isDateSealed && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold">CRITICAL WARNING:</span> Day {entryDate} was already closed &amp; sealed.
              Any edits will permanently stamp this record with a visible <span className="font-mono font-bold text-amber-400">"⚠️ MODIFIED AFTER SEAL"</span> badge.
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Toggle between Edit and Soft Delete */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/40 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActionType('edit')}
              className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 ${
                actionType === 'edit' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Values
            </button>
            <button
              type="button"
              onClick={() => setActionType('delete')}
              className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 ${
                actionType === 'delete' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" /> Soft Delete
            </button>
          </div>

          {actionType === 'edit' ? (
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                <span className="text-slate-400 font-medium">Item / Title: </span>
                <span className="font-bold text-white">{entry.itemName || entry.category || 'Entry'}</span>
              </div>

              {/* Quantity if applicable */}
              {(collectionType === 'sales' || collectionType === 'purchases' || collectionType === 'damaged_stock') && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              )}

              {/* Price / Amount */}
              {collectionType !== 'damaged_stock' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {collectionType === 'sales'
                      ? 'Unit Price (₹)'
                      : collectionType === 'purchases'
                      ? 'Cost Per Unit (₹)'
                      : 'Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    value={priceOrAmount}
                    onChange={(e) => setPriceOrAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              )}

              {/* Payment Mode */}
              {(collectionType === 'sales' || collectionType === 'expenses') && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Payment Mode</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="fampay">📱 FamPay</option>
                  </select>
                </div>
              )}

              {/* Note / Supplier */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {collectionType === 'purchases' ? 'Supplier Name' : 'Note / Details'}
                </label>
                <input
                  type="text"
                  value={noteOrSupplier}
                  onChange={(e) => setNoteOrSupplier(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              Entry will be hidden from daily totals but kept safe in the 30-day Trash bin. Only Admin can restore or permanently purge it.
            </div>
          )}

          {/* MANDATORY REASON FIELD */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-amber-400 mb-1">
              * Mandatory Explanation Reason (Logged to Audit Trail)
            </label>
            <textarea
              rows={2}
              value={mandatoryReason}
              onChange={(e) => setMandatoryReason(e.target.value)}
              placeholder="e.g. Corrected mistaken quantity typed during customer rush"
              className="w-full py-2 px-3 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              required
            />
            <div className="text-[10px] text-slate-400 mt-1">
              Required. Saved immutably alongside your name ({profile?.displayName}) &amp; timestamp.
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mandatoryReason.trim().length < 5}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-colors ${
                isSubmitting || mandatoryReason.trim().length < 5
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : actionType === 'delete'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
              }`}
            >
              {isSubmitting
                ? 'Saving...'
                : actionType === 'delete'
                ? 'Confirm Soft Delete'
                : 'Save Changes to Audit Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
