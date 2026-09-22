import React, { useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Sparkles, PackageCheck, Flame, ShoppingBag } from 'lucide-react';

export const WhatSoldTogetherView: React.FC = () => {
  const { sales, nightMode } = useLedger();

  // Basic co-occurrence count across active sales
  const bundles = useMemo(() => {
    // Cluster sales by date + hour/minute window or basketId
    // If basketId is set, cluster by basketId; otherwise cluster sales by customer time window (e.g. within 3 minutes of each other)
    const active = sales.filter(s => !s.isDeleted);
    const groups: Record<string, string[]> = {};

    active.forEach(sale => {
      // Create a clustering key: basketId or date + approximate 3-minute bucket
      const timeMs = new Date(sale.timestamp).getTime();
      const bucket = sale.basketId || `${sale.date}-${Math.floor(timeMs / (3 * 60 * 1000))}`;
      if (!groups[bucket]) groups[bucket] = [];
      if (!groups[bucket].includes(sale.itemName)) {
        groups[bucket].push(sale.itemName);
      }
    });

    // Count pair co-occurrences
    const pairCounts: Record<string, { itemA: string; itemB: string; count: number }> = {};

    Object.values(groups).forEach(itemNames => {
      if (itemNames.length < 2) return;
      for (let i = 0; i < itemNames.length; i++) {
        for (let j = i + 1; j < itemNames.length; j++) {
          const [a, b] = [itemNames[i], itemNames[j]].sort();
          const key = `${a} +++ ${b}`;
          if (!pairCounts[key]) {
            pairCounts[key] = { itemA: a, itemB: b, count: 0 };
          }
          pairCounts[key].count += 1;
        }
      }
    });

    const list = Object.values(pairCounts);
    list.sort((a, b) => b.count - a.count);
    return list;
  }, [sales]);

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl border ${
        nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <h2 className="font-bold text-base sm:text-lg">What Sold Together (Stall Bundles)</h2>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Co-occurrence analysis: Shows which firecrackers customers frequently purchase in the same visit or checkout rush. Great for pre-packaging combo boxes!
        </p>
      </div>

      {bundles.length === 0 ? (
        <div className={`p-8 rounded-2xl border text-center text-xs text-slate-400 ${
          nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <ShoppingBag className="w-8 h-8 mx-auto text-slate-500 mb-2" />
          <p className="font-semibold text-slate-300">No multi-item sales patterns yet.</p>
          <p className="mt-1">As partners record multiple sales during customer visits, top product pairings will automatically populate here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bundles.map((bundle, index) => {
            const maxCount = bundles[0]?.count || 1;
            const pct = Math.round((bundle.count / maxCount) * 100);

            return (
              <div
                key={`${bundle.itemA}-${bundle.itemB}`}
                className={`p-4 rounded-2xl border space-y-3 ${
                  nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Combo #{index + 1}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {bundle.count} times together
                  </span>
                </div>

                <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                  <div className="flex-1 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                    {bundle.itemA}
                  </div>
                  <span className="text-amber-400 font-bold">+</span>
                  <div className="flex-1 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                    {bundle.itemB}
                  </div>
                </div>

                {/* Relative popularity bar */}
                <div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.max(10, pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
