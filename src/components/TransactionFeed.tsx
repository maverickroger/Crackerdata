import React, { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag,
  Package,
  Receipt,
  AlertOctagon,
  Clock,
  User,
  Filter,
  Search,
  Camera,
  AlertTriangle,
  Lock,
  Edit2,
  Trash2,
  Image as ImageIcon,
  X,
  IndianRupee,
  TrendingUp,
  CreditCard,
  Wallet
} from 'lucide-react';
import { EditEntryModal } from './EditEntryModal';

export const TransactionFeed: React.FC = () => {
  const {
    sales,
    purchases,
    expenses,
    damagedStock,
    totalSales,
    totalPurchases,
    totalExpenses,
    runningProfit,
    cashInHand,
    fampayBalance,
    dailySeals,
    todayDateStr,
    nightMode
  } = useLedger();

  const { isAdmin, profile } = useAuth();

  const [activeFilter, setActiveFilter] = useState<'all' | 'sales' | 'purchases' | 'expenses' | 'damaged'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Photo viewer modal
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; time?: string } | null>(null);

  // Edit / Delete modal
  const [editingItem, setEditingItem] = useState<{ entry: any; type: any } | null>(null);

  // Combine active (non-deleted) items into unified chronological list
  const combinedEntries = useMemo(() => {
    const list: Array<{
      id: string;
      collectionType: 'sales' | 'purchases' | 'expenses' | 'damaged_stock';
      title: string;
      subtitle?: string;
      quantity?: number;
      amount: number;
      paymentType?: 'cash' | 'fampay';
      loggedByName: string;
      timestamp: string;
      date: string;
      photoUrl?: string;
      photoTimestamp?: string;
      photoTimeDiffHours?: number;
      isModifiedAfterSeal?: boolean;
      raw: any;
    }> = [];

    // Sales
    if (activeFilter === 'all' || activeFilter === 'sales') {
      sales
        .filter(s => !s.isDeleted)
        .forEach(s => {
          list.push({
            id: s.id,
            collectionType: 'sales',
            title: s.itemName,
            subtitle: s.isBulkSale ? 'Bulk Wholesale Sale' : undefined,
            quantity: s.quantity,
            amount: s.totalPrice,
            paymentType: s.paymentType,
            loggedByName: s.loggedByName,
            timestamp: s.timestamp,
            date: s.date,
            photoUrl: s.photoUrl,
            photoTimestamp: s.photoTimestamp,
            photoTimeDiffHours: s.photoTimeDiffHours,
            isModifiedAfterSeal: s.modifiedAfterSeal,
            raw: s
          });
        });
    }

    // Purchases
    if (activeFilter === 'all' || activeFilter === 'purchases') {
      purchases
        .filter(p => !p.isDeleted)
        .forEach(p => {
          list.push({
            id: p.id,
            collectionType: 'purchases',
            title: p.itemName,
            subtitle: `Supplier: ${p.supplierName}`,
            quantity: p.quantity,
            amount: p.totalCost,
            paymentType: 'cash',
            loggedByName: p.loggedByName,
            timestamp: p.timestamp,
            date: p.date,
            photoUrl: p.photoUrl,
            photoTimestamp: p.photoTimestamp,
            photoTimeDiffHours: p.photoTimeDiffHours,
            isModifiedAfterSeal: p.modifiedAfterSeal,
            raw: p
          });
        });
    }

    // Expenses
    if (activeFilter === 'all' || activeFilter === 'expenses') {
      expenses
        .filter(e => !e.isDeleted)
        .forEach(e => {
          list.push({
            id: e.id,
            collectionType: 'expenses',
            title: `Expense: ${e.category.replace('_', ' ').toUpperCase()}`,
            subtitle: e.note,
            amount: e.amount,
            paymentType: e.paymentType,
            loggedByName: e.loggedByName,
            timestamp: e.timestamp,
            date: e.date,
            photoUrl: e.photoUrl,
            photoTimestamp: e.photoTimestamp,
            isModifiedAfterSeal: e.modifiedAfterSeal,
            raw: e
          });
        });
    }

    // Damaged Stock
    if (activeFilter === 'all' || activeFilter === 'damaged') {
      damagedStock
        .filter(d => !d.isDeleted)
        .forEach(d => {
          list.push({
            id: d.id,
            collectionType: 'damaged_stock',
            title: `Damaged: ${d.itemName}`,
            subtitle: `Reason: ${d.reason}`,
            quantity: d.quantity,
            amount: 0,
            loggedByName: d.loggedByName,
            timestamp: d.timestamp,
            date: d.date,
            photoUrl: d.photoUrl,
            raw: d
          });
        });
    }

    // Filter by date
    let filtered = list;
    if (dateFilter === 'today') {
      filtered = filtered.filter(item => item.date === todayDateStr);
    }

    // Filter by partner
    if (partnerFilter !== 'all') {
      filtered = filtered.filter(item => item.loggedByName.toLowerCase().includes(partnerFilter.toLowerCase()));
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.loggedByName.toLowerCase().includes(q)
      );
    }

    // Sort descending by timestamp
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return filtered;
  }, [sales, purchases, expenses, damagedStock, activeFilter, dateFilter, partnerFilter, searchQuery, todayDateStr]);

  return (
    <div className="space-y-4">
      {/* Top Financial Dashboard Strip (Realtime) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Sales Card */}
        <div className={`p-3.5 rounded-2xl border ${
          nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Sales</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400">
            ₹{totalSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <span>Cash: ₹{sales.filter(s => !s.isDeleted && s.paymentType === 'cash').reduce((a, s) => a + s.totalPrice, 0).toLocaleString()}</span>
            <span>•</span>
            <span>UPI: ₹{sales.filter(s => !s.isDeleted && s.paymentType === 'fampay').reduce((a, s) => a + s.totalPrice, 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Expected Cash in Hand */}
        <div className={`p-3.5 rounded-2xl border ${
          nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Stall Cash in Drawer</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-amber-400">
            ₹{cashInHand.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Calculated: Cash Sales − Cash Expenses
          </div>
        </div>

        {/* FamPay / Digital UPI */}
        <div className={`p-3.5 rounded-2xl border ${
          nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">FamPay / UPI</span>
            <CreditCard className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-sky-400">
            ₹{fampayBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Direct digital collections
          </div>
        </div>

        {/* Net Profit */}
        <div className={`p-3.5 rounded-2xl border ${
          nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Net Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-xl sm:text-2xl font-extrabold font-mono ${
            runningProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            ₹{runningProfit.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Sales − (Purchases + Expenses)
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
        nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Collection Type Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Live Feed' },
              { id: 'sales', label: 'Sales Only' },
              { id: 'purchases', label: 'Stock Bills' },
              { id: 'expenses', label: 'Expenses' },
              { id: 'damaged', label: 'Damaged' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`py-1 px-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeFilter === f.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Date Selector: Today vs All */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setDateFilter('today')}
              className={`py-1 px-2.5 rounded-xl text-xs font-semibold ${
                dateFilter === 'today'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today's Stall
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`py-1 px-2.5 rounded-xl text-xs font-semibold ${
                dateFilter === 'all'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Season
            </button>
          </div>
        </div>

        {/* Search and Partner filters */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-800">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items, notes, or entries..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Partner:</span>
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="py-1.5 px-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">All 4 Partners</option>
              <option value="Rajesh">Rajesh (Admin)</option>
              <option value="Amit">Amit</option>
              <option value="Vikram">Vikram</option>
              <option value="Suresh">Suresh</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feed List Items */}
      <div className="space-y-2.5">
        {combinedEntries.length === 0 ? (
          <div className={`p-10 rounded-2xl border text-center text-xs text-slate-400 ${
            nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <ShoppingBag className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No transactions recorded for this filter.</p>
            <p className="mt-1">Tap the large "+ Quick Stall Entry" button below to log firecracker sales or bills!</p>
          </div>
        ) : (
          combinedEntries.map(item => {
            const isSale = item.collectionType === 'sales';
            const isPurchase = item.collectionType === 'purchases';
            const isExpense = item.collectionType === 'expenses';
            const isDamaged = item.collectionType === 'damaged_stock';

            return (
              <div
                key={`${item.collectionType}-${item.id}`}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  item.isModifiedAfterSeal
                    ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/40'
                    : nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Icon by type */}
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isSale
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isPurchase
                        ? 'bg-amber-500/20 text-amber-400'
                        : isExpense
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      {isSale ? (
                        <ShoppingBag className="w-4 h-4" />
                      ) : isPurchase ? (
                        <Package className="w-4 h-4" />
                      ) : isExpense ? (
                        <Receipt className="w-4 h-4" />
                      ) : (
                        <AlertOctagon className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{item.title}</span>

                        {item.quantity && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300">
                            Qty: {item.quantity}
                          </span>
                        )}

                        {item.paymentType && (
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                            item.paymentType === 'cash'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                          }`}>
                            {item.paymentType === 'cash' ? '💵 Cash' : '📱 FamPay'}
                          </span>
                        )}

                        {item.subtitle && (
                          <span className="text-[11px] text-slate-400">
                            • {item.subtitle}
                          </span>
                        )}
                      </div>

                      {/* Logged by & Timestamp info */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          Logged by <span className="text-slate-200 font-semibold">{item.loggedByName}</span>
                        </span>

                        <span>•</span>

                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {dateFilter === 'all' && ` on ${item.date}`}
                        </span>

                        {/* EXIF Time Diff Flag */}
                        {item.photoTimeDiffHours && item.photoTimeDiffHours > 3 && (
                          <span className="text-amber-400 font-semibold flex items-center gap-0.5" title="Photo taken >3 hours before entry was recorded">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            Photo taken {item.photoTimeDiffHours}h prior
                          </span>
                        )}
                      </div>

                      {/* POST-SEAL MODIFICATION FLAG */}
                      {item.isModifiedAfterSeal && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold tracking-wide">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          ⚠️ MODIFIED AFTER DAILY SEAL
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Amount & Photo & Actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className={`font-mono text-base font-extrabold ${
                      isSale
                        ? 'text-emerald-400'
                        : isPurchase
                        ? 'text-amber-400'
                        : isExpense
                        ? 'text-rose-400'
                        : 'text-indigo-400'
                    }`}>
                      {isSale ? '+' : isPurchase || isExpense ? '-' : ''}
                      ₹{item.amount.toLocaleString()}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Photo Thumbnail */}
                      {item.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto({
                            url: item.photoUrl!,
                            title: item.title,
                            time: item.photoTimestamp
                          })}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 text-[11px]"
                          title="View Bill / Photo Proof"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">Photo</span>
                        </button>
                      )}

                      {/* Admin-only edit & delete */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setEditingItem({ entry: item.raw, type: item.collectionType })}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 border border-slate-700 text-xs"
                          title="Audit Edit or Delete"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Photo Preview Fullscreen Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-xl w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">{previewPhoto.title}</h4>
                {previewPhoto.time && (
                  <p className="text-[11px] text-slate-400 font-mono">
                    Captured: {new Date(previewPhoto.time).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={previewPhoto.url}
                alt="Receipt Verification"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {editingItem && (
        <EditEntryModal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          entry={editingItem.entry}
          collectionType={editingItem.type}
        />
      )}
    </div>
  );
};
