import React, { useState, useRef, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Camera,
  Upload,
  AlertTriangle,
  Clock,
  CheckCircle,
  IndianRupee,
  ShoppingBag,
  Package,
  Receipt,
  AlertOctagon,
  Sparkles
} from 'lucide-react';
import { compressImage, extractPhotoTimestamp, calculateTimeDiffHours } from '../utils/exif';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'sale' | 'purchase' | 'expense' | 'damaged';
}

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'sale'
}) => {
  const { items, addSale, addPurchase, addExpense, addDamagedStock, nightMode, isSeasonLocked, todayDateStr } = useLedger();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'sale' | 'purchase' | 'expense' | 'damaged'>(initialTab);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields - Sale
  const [saleItemId, setSaleItemId] = useState('');
  const [saleCustomName, setSaleCustomName] = useState('');
  const [saleQty, setSaleQty] = useState(1);
  const [saleUnitPrice, setSaleUnitPrice] = useState<number>(0);
  const [salePaymentType, setSalePaymentType] = useState<'cash' | 'fampay'>('cash');
  const [saleIsBulk, setSaleIsBulk] = useState(false);

  // Form Fields - Purchase
  const [purchItemId, setPurchItemId] = useState('');
  const [purchItemName, setPurchItemName] = useState('');
  const [purchQty, setPurchQty] = useState(10);
  const [purchCostPerUnit, setPurchCostPerUnit] = useState<number>(0);
  const [purchSupplier, setPurchSupplier] = useState('');

  // Form Fields - Expense
  const [expCategory, setExpCategory] = useState<'transport' | 'stall_rental' | 'packaging' | 'food' | 'misc'>('food');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expPaymentType, setExpPaymentType] = useState<'cash' | 'fampay'>('cash');
  const [expNote, setExpNote] = useState('');

  // Form Fields - Damaged
  const [dmgItemId, setDmgItemId] = useState('');
  const [dmgItemName, setDmgItemName] = useState('');
  const [dmgQty, setDmgQty] = useState(1);
  const [dmgReason, setDmgReason] = useState('Damp/Water Damage');

  // Photo Upload State
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [photoTimestamp, setPhotoTimestamp] = useState<string>('');
  const [photoTimeDiff, setPhotoTimeDiff] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // When selected catalog item changes in Sale
  useEffect(() => {
    if (saleItemId) {
      const itm = items.find(i => i.id === saleItemId);
      if (itm) {
        setSaleCustomName(itm.name);
        setSaleUnitPrice(itm.sellingPrice);
      }
    }
  }, [saleItemId, items]);

  // When selected catalog item changes in Purchase
  useEffect(() => {
    if (purchItemId) {
      const itm = items.find(i => i.id === purchItemId);
      if (itm) {
        setPurchItemName(itm.name);
        setPurchCostPerUnit(itm.costPrice);
      }
    }
  }, [purchItemId, items]);

  // Auto detect bulk sale if quantity is >= 5
  useEffect(() => {
    if (saleQty >= 5) {
      setSaleIsBulk(true);
    }
  }, [saleQty]);

  if (!isOpen) return null;

  const resetPhoto = () => {
    setPhotoDataUrl('');
    setPhotoTimestamp('');
    setPhotoTimeDiff(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Extract photo timestamp
      const { timestampIso } = await extractPhotoTimestamp(file);
      setPhotoTimestamp(timestampIso);

      // Compare with current time
      const diffHours = calculateTimeDiffHours(timestampIso, new Date().toISOString());
      setPhotoTimeDiff(diffHours);

      // 2. Compress image for mobile speed
      const { dataUrl } = await compressImage(file, 1024, 0.72);
      setPhotoDataUrl(dataUrl);
    } catch (err) {
      console.error('Photo handling error:', err);
      setErrorMsg('Failed to process image. Try another photo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isSeasonLocked) {
      setErrorMsg('Diwali season is signed off and locked. No new entries permitted.');
      return;
    }

    setSubmitting(true);

    try {
      if (activeTab === 'sale') {
        const itemName = saleCustomName || items.find(i => i.id === saleItemId)?.name;
        if (!itemName) {
          setErrorMsg('Please select or specify the item name.');
          setSubmitting(false);
          return;
        }

        // Check bulk photo requirement
        if (saleIsBulk && !photoDataUrl) {
          setErrorMsg('Photo of customer / bulk goods handover is REQUIRED for bulk/wholesale sales!');
          setSubmitting(false);
          return;
        }

        const totalPrice = Number((saleQty * saleUnitPrice).toFixed(2));
        await addSale({
          itemId: saleItemId || 'custom',
          itemName,
          quantity: Number(saleQty),
          unitPrice: Number(saleUnitPrice),
          totalPrice,
          paymentType: salePaymentType,
          isBulkSale: saleIsBulk,
          photoUrl: photoDataUrl || undefined,
          photoTimestamp: photoTimestamp || undefined,
          photoTimeDiffHours: photoTimeDiff > 0 ? Number(photoTimeDiff.toFixed(1)) : undefined,
          date: todayDateStr,
          isDeleted: false
        });

        setSuccessMsg(`✓ Sale of ${saleQty}x ${itemName} for ₹${totalPrice} recorded!`);
        // Reset sale form for rapid stall checkout
        setSaleQty(1);
        resetPhoto();
      } else if (activeTab === 'purchase') {
        const itemName = purchItemName || items.find(i => i.id === purchItemId)?.name;
        if (!itemName) {
          setErrorMsg('Please provide the purchase item name.');
          setSubmitting(false);
          return;
        }

        // Photo is strictly mandatory for stock purchases!
        if (!photoDataUrl) {
          setErrorMsg('MANDATORY: A clear photo of the supplier bill / receipt is strictly required for all purchases.');
          setSubmitting(false);
          return;
        }

        const totalCost = Number((purchQty * purchCostPerUnit).toFixed(2));
        await addPurchase({
          itemId: purchItemId || 'custom',
          itemName,
          quantity: Number(purchQty),
          costPerUnit: Number(purchCostPerUnit),
          totalCost,
          supplierName: purchSupplier || 'Local Wholesale Mandi',
          date: todayDateStr,
          photoUrl: photoDataUrl,
          photoTimestamp: photoTimestamp || undefined,
          photoTimeDiffHours: photoTimeDiff > 0 ? Number(photoTimeDiff.toFixed(1)) : undefined,
          isDeleted: false
        });

        setSuccessMsg(`✓ Purchase bill for ${itemName} (₹${totalCost}) logged!`);
        resetPhoto();
      } else if (activeTab === 'expense') {
        if (!expAmount || expAmount <= 0) {
          setErrorMsg('Please enter a valid expense amount.');
          setSubmitting(false);
          return;
        }

        await addExpense({
          category: expCategory,
          amount: Number(expAmount),
          paymentType: expPaymentType,
          date: todayDateStr,
          note: expNote || expCategory.toUpperCase(),
          photoUrl: photoDataUrl || undefined,
          photoTimestamp: photoTimestamp || undefined,
          isDeleted: false
        });

        setSuccessMsg(`✓ Expense of ₹${expAmount} recorded.`);
        setExpAmount(0);
        setExpNote('');
        resetPhoto();
      } else if (activeTab === 'damaged') {
        const itemName = dmgItemName || items.find(i => i.id === dmgItemId)?.name;
        if (!itemName) {
          setErrorMsg('Please select the item.');
          setSubmitting(false);
          return;
        }

        await addDamagedStock({
          itemId: dmgItemId || 'custom',
          itemName,
          quantity: Number(dmgQty),
          reason: dmgReason,
          date: todayDateStr,
          photoUrl: photoDataUrl || undefined,
          isDeleted: false
        });

        setSuccessMsg(`✓ Damaged stock logged: ${dmgQty}x ${itemName} deducted from inventory.`);
        resetPhoto();
      }

      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border shadow-2xl overflow-hidden max-h-[92vh] flex flex-col ${
        nightMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header & Tabs */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-base sm:text-lg">
              Stall Fast Entry
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              By {profile?.displayName?.split(' ')[0]}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Fast Action Tabs */}
        <div className="grid grid-cols-4 p-2 gap-1.5 border-b border-slate-800/60 bg-slate-950/30">
          <button
            type="button"
            onClick={() => { setActiveTab('sale'); resetPhoto(); setErrorMsg(''); }}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeTab === 'sale'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Sale</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('purchase'); resetPhoto(); setErrorMsg(''); }}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeTab === 'purchase'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Purchase</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('expense'); resetPhoto(); setErrorMsg(''); }}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeTab === 'expense'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('damaged'); resetPhoto(); setErrorMsg(''); }}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeTab === 'damaged'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Damaged</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: SALE */}
          {activeTab === 'sale' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Firecracker Item
                </label>
                <select
                  value={saleItemId}
                  onChange={(e) => setSaleItemId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose from Catalog --</option>
                  {items.map(itm => (
                    <option key={itm.id} value={itm.id}>
                      {itm.name} {itm.hindiName ? `(${itm.hindiName})` : ''} - ₹{itm.sellingPrice}/{itm.unit}
                    </option>
                  ))}
                </select>
              </div>

              {!saleItemId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Or Enter Custom Name
                  </label>
                  <input
                    type="text"
                    value={saleCustomName}
                    onChange={(e) => setSaleCustomName(e.target.value)}
                    placeholder="e.g. 5000 Wala Deluxe Bomb"
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Quantity Selector with 1-tap quick buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Quantity Sold</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 5, 10, 20].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSaleQty(q)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                          saleQty === q
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSaleQty(Math.max(1, saleQty - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-lg font-bold flex items-center justify-center hover:bg-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={saleQty}
                    onChange={(e) => setSaleQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 py-2 text-center bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSaleQty(saleQty + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-lg font-bold flex items-center justify-center hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price per unit & Total */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Price Per Unit (₹)
                  </label>
                  <input
                    type="number"
                    value={saleUnitPrice}
                    onChange={(e) => setSaleUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Total Revenue
                  </label>
                  <div className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-base font-extrabold text-amber-400 flex items-center justify-between">
                    <span>₹</span>
                    <span>{(saleQty * saleUnitPrice).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Type: Cash vs FamPay */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Mode (Money Separation)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSalePaymentType('cash')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      salePaymentType === 'cash'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    💵 Cash in Hand
                  </button>

                  <button
                    type="button"
                    onClick={() => setSalePaymentType('fampay')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      salePaymentType === 'fampay'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    📱 FamPay / UPI
                  </button>
                </div>
              </div>

              {/* Wholesale/Bulk Sale Toggle */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    Bulk / Wholesale Transaction
                    {saleQty >= 5 && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                        Qty ≥ 5 Auto-flag
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Mandates photo proof of handed over firecrackers
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={saleIsBulk}
                  onChange={(e) => setSaleIsBulk(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PURCHASE (Stock Bills) */}
          {activeTab === 'purchase' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Item Purchased
                </label>
                <select
                  value={purchItemId}
                  onChange={(e) => setPurchItemId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Catalog Item --</option>
                  {items.map(itm => (
                    <option key={itm.id} value={itm.id}>
                      {itm.name} (Current Cost: ₹{itm.costPrice})
                    </option>
                  ))}
                </select>
              </div>

              {!purchItemId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Or Enter Item Name
                  </label>
                  <input
                    type="text"
                    value={purchItemName}
                    onChange={(e) => setPurchItemName(e.target.value)}
                    placeholder="e.g. Sivakasi Deluxe Sky Rockets"
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Boxes / Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={purchQty}
                    onChange={(e) => setPurchQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cost Per Unit (₹)
                  </label>
                  <input
                    type="number"
                    value={purchCostPerUnit}
                    onChange={(e) => setPurchCostPerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supplier / Mandi Agency Name
                </label>
                <input
                  type="text"
                  value={purchSupplier}
                  onChange={(e) => setPurchSupplier(e.target.value)}
                  placeholder="e.g. Sivakasi Fireworks Wholesalers Delhi"
                  className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Total Bill Cost:</span>
                <span className="text-base font-bold text-emerald-400">₹{(purchQty * purchCostPerUnit).toFixed(0)}</span>
              </div>
            </div>
          )}

          {/* TAB 3: EXPENSE */}
          {activeTab === 'expense' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full py-2.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="transport">Transport / Tempo</option>
                    <option value="stall_rental">Stall Rental / Police NOC</option>
                    <option value="packaging">Packaging &amp; Polythene</option>
                    <option value="food">Chai, Samosa &amp; Food</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={expAmount || ''}
                    onChange={(e) => setExpAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="₹ Amount"
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Paid Via
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpPaymentType('cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      expPaymentType === 'cash'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    💵 Cash out of Till
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpPaymentType('fampay')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      expPaymentType === 'fampay'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    📱 FamPay / UPI
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Note
                </label>
                <input
                  type="text"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  placeholder="e.g. Tempo fare from warehouse to stall"
                  className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* TAB 4: DAMAGED STOCK */}
          {activeTab === 'damaged' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Damaged Firecracker Item
                </label>
                <select
                  value={dmgItemId}
                  onChange={(e) => setDmgItemId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Item from Catalog --</option>
                  {items.map(itm => (
                    <option key={itm.id} value={itm.id}>
                      {itm.name}
                    </option>
                  ))}
                </select>
              </div>

              {!dmgItemId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Or Item Name
                  </label>
                  <input
                    type="text"
                    value={dmgItemName}
                    onChange={(e) => setDmgItemName(e.target.value)}
                    placeholder="e.g. Deluxe Chakri"
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantity Damaged
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dmgQty}
                    onChange={(e) => setDmgQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reason
                  </label>
                  <select
                    value={dmgReason}
                    onChange={(e) => setDmgReason(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Damp/Water Damage">Damp / Rain Moisture</option>
                    <option value="Broken Fuse">Broken Fuse / Misfire</option>
                    <option value="Crushed Box">Crushed in Transport</option>
                    <option value="Defective Factory Batch">Defective Factory Batch</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800 text-[11px] text-indigo-200">
                💡 Damaged stock strictly deducts inventory count without skewing revenue numbers or appearing as an unexplained cash shortage.
              </div>
            </div>
          )}

          {/* Photo & Receipt Upload Area with Anti-Fraud Timestamp Cross-Check */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {activeTab === 'purchase'
                    ? 'Receipt / Bill Photo (MANDATORY)'
                    : activeTab === 'sale' && saleIsBulk
                    ? 'Bulk Wholesale Goods Proof (MANDATORY)'
                    : 'Receipt or Photo Proof (Optional)'}
                </span>
              </label>

              {(activeTab === 'purchase' || (activeTab === 'sale' && saleIsBulk)) && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  REQUIRED
                </span>
              )}
            </div>

            {photoDataUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                <img
                  src={photoDataUrl}
                  alt="Receipt Preview"
                  className="w-full h-36 object-contain bg-black"
                />
                <button
                  type="button"
                  onClick={resetPhoto}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/90 text-white hover:bg-rose-600 transition-colors shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Photo Timestamp Inspection & Cross Check Badge */}
                {photoTimestamp && (
                  <div className="p-2 bg-slate-900/95 border-t border-slate-800 text-[11px] flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Photo Taken: {new Date(photoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {photoTimeDiff > 3 ? (
                      <span className="text-amber-400 font-medium flex items-center gap-1" title="Photo taken more than 3 hours ago">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        ⚠️ {photoTimeDiff.toFixed(1)}h prior to log
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Recent
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-3 rounded-xl border border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-800/40 hover:bg-slate-800 text-slate-300 text-xs flex flex-col items-center justify-center gap-1.5 transition-all"
                >
                  <div className="p-2 rounded-full bg-slate-800 text-amber-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">Tap to Take Photo or Upload Bill</span>
                  <span className="text-[10px] text-slate-500">EXIF timestamps extracted automatically</span>
                </button>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={
                submitting ||
                (activeTab === 'purchase' && !photoDataUrl) ||
                (activeTab === 'sale' && saleIsBulk && !photoDataUrl)
              }
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                submitting ||
                (activeTab === 'purchase' && !photoDataUrl) ||
                (activeTab === 'sale' && saleIsBulk && !photoDataUrl)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : activeTab === 'sale'
                  ? 'bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 shadow-lg shadow-amber-500/20'
                  : activeTab === 'purchase'
                  ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 shadow-lg shadow-emerald-500/20'
                  : activeTab === 'expense'
                  ? 'bg-rose-500 hover:bg-rose-400 active:scale-[0.99] text-white shadow-lg shadow-rose-500/20'
                  : 'bg-indigo-500 hover:bg-indigo-400 active:scale-[0.99] text-white shadow-lg shadow-indigo-500/20'
              }`}
            >
              {submitting
                ? 'Recording...'
                : activeTab === 'sale'
                ? `Confirm Sale (₹${(saleQty * saleUnitPrice).toFixed(0)})`
                : activeTab === 'purchase'
                ? `Save Purchase Bill (₹${(purchQty * purchCostPerUnit).toFixed(0)})`
                : activeTab === 'expense'
                ? `Log Expense (₹${expAmount || 0})`
                : 'Deduct Damaged Stock'}
            </button>

            {((activeTab === 'purchase' && !photoDataUrl) || (activeTab === 'sale' && saleIsBulk && !photoDataUrl)) && (
              <div className="text-center mt-2 text-[11px] text-amber-400">
                🔒 Button locked: Photo of bill/bulk receipt is strictly required before saving.
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
