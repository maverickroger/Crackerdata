import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  AlertTriangle,
  Plus,
  Percent,
  TrendingUp,
  Package,
  CheckCircle,
  AlertOctagon,
  Search
} from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CatalogItem } from '../types';

export const InventoryView: React.FC = () => {
  const { items, itemStockMap, lowStockItems, nightMode } = useLedger();
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New item state
  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [category, setCategory] = useState<CatalogItem['category']>('Sparklers (Phuljhadi)');
  const [unit, setUnit] = useState('box');
  const [costPrice, setCostPrice] = useState<number>(50);
  const [sellingPrice, setSellingPrice] = useState<number>(100);
  const [threshold, setThreshold] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.hindiName && i.hindiName.includes(searchQuery)) ||
    i.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const newRef = doc(collection(db, 'items'));
      const newItem: CatalogItem = {
        id: newRef.id,
        name: name.trim(),
        hindiName: hindiName.trim() || undefined,
        category,
        unit,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        lowStockThreshold: Number(threshold),
        createdAt: new Date().toISOString()
      };
      await setDoc(newRef, newItem);
      setName('');
      setHindiName('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Low Stock High-Visibility Alert Banner if any items low */}
      {lowStockItems.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 space-y-1.5 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
            <span>LOW STOCK RUNNING OUT ALERT ({lowStockItems.length} items critical)</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {lowStockItems.map(summary => (
              <span
                key={summary.item.id}
                className="px-2.5 py-1 rounded-xl bg-amber-500/25 border border-amber-500/40 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                <span>{summary.item.name}:</span>
                <span className="font-mono font-extrabold text-amber-300">
                  {summary.remainingQty} {summary.item.unit} left
                </span>
                <span className="text-[10px] text-amber-200/70">(Min {summary.item.lowStockThreshold})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Header and Controls */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-base sm:text-lg">Inventory &amp; Profit Margins</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-calculated: Purchased − Sold − Damaged = Stock Remaining. Individual profit margin tracked.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search firecrackers..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 text-xs flex items-center gap-1 shrink-0 shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Catalog & Stock Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map(item => {
          const summary = itemStockMap[item.id] || {
            purchasedQty: 0,
            soldQty: 0,
            damagedQty: 0,
            remainingQty: 0,
            isLowStock: false,
            totalRevenue: 0,
            totalCost: 0,
            profitMarginPercent: Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100)
          };

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                summary.isLowStock && summary.purchasedQty > 0
                  ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/30'
                  : nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    {item.name}
                  </h3>
                  {item.hindiName && (
                    <div className="text-[11px] text-amber-400 font-medium">{item.hindiName}</div>
                  )}
                  <span className="text-[10px] text-slate-400">{item.category}</span>
                </div>

                <div className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold flex items-center gap-0.5 ${
                  summary.profitMarginPercent >= 40
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  {summary.profitMarginPercent}% margin
                </div>
              </div>

              {/* Pricing strip */}
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 gap-2 text-xs mb-3 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cost Price (CP)</span>
                  <span className="font-bold text-slate-200">₹{item.costPrice} / {item.unit}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Selling Price (SP)</span>
                  <span className="font-bold text-amber-400">₹{item.sellingPrice} / {item.unit}</span>
                </div>
              </div>

              {/* Stock breakdown numbers */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs pt-1 border-t border-slate-800">
                <div className="p-1 rounded-lg bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">Bought</span>
                  <span className="font-mono font-bold text-white">{summary.purchasedQty}</span>
                </div>

                <div className="p-1 rounded-lg bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">Sold</span>
                  <span className="font-mono font-bold text-emerald-400">{summary.soldQty}</span>
                </div>

                <div className="p-1 rounded-lg bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">Damaged</span>
                  <span className="font-mono font-bold text-indigo-400">{summary.damagedQty}</span>
                </div>

                <div className={`p-1 rounded-lg ${
                  summary.isLowStock && summary.purchasedQty > 0
                    ? 'bg-amber-500/20 text-amber-400 font-extrabold'
                    : 'bg-slate-800/80 text-white font-bold'
                }`}>
                  <span className="text-[10px] text-slate-400 block">Left</span>
                  <span className="font-mono">{summary.remainingQty}</span>
                </div>
              </div>

              {summary.isLowStock && summary.purchasedQty > 0 && (
                <div className="mt-2 text-[10px] text-amber-400 font-semibold flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Below alert threshold ({item.lowStockThreshold} {item.unit})
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 ${
            nightMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-base mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              Add Firecracker to Catalog
            </h3>

            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sivakasi 5-Star Deluxe Anar"
                  className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hindi/Local Name (optional)</label>
                <input
                  type="text"
                  value={hindiName}
                  onChange={(e) => setHindiName(e.target.value)}
                  placeholder="e.g. अनार स्पेशल"
                  className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full py-2 px-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Sparklers (Phuljhadi)">Sparklers (Phuljhadi)</option>
                    <option value="Ground Spinners (Chakri)">Ground Spinners (Chakri)</option>
                    <option value="Flower Pots (Anar)">Flower Pots (Anar)</option>
                    <option value="Rockets">Rockets</option>
                    <option value="Garlands (Ladi)">Garlands (Ladi)</option>
                    <option value="Sky Shots">Sky Shots</option>
                    <option value="Kids Novelty">Kids Novelty</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="box / packet / piece"
                    className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sell Price (₹)</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Alert Below</label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value) || 5)}
                    className="w-full py-2 px-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 text-xs shadow-md shadow-amber-500/20"
                >
                  {submitting ? 'Saving...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
