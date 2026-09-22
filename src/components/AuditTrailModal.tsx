import React, { useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import {
  History,
  Shield,
  Search,
  Clock,
  User,
  ArrowRight,
  Filter,
  CheckCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, nightMode } = useLedger();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = auditLogs.filter(log => {
    if (filterType !== 'all' && log.collectionType !== filterType && log.action !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.reason.toLowerCase().includes(q) ||
        log.changedByName.toLowerCase().includes(q) ||
        log.entryId.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <History className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-base sm:text-lg">Immutable Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tamper-proof ledger log. Every creation, edit, soft-delete, restore, and seal is recorded with mandatory reason and author timestamp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit records..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Actions</option>
            <option value="edit">Edits Only</option>
            <option value="soft_delete">Deletes Only</option>
            <option value="seal">Daily Seals</option>
            <option value="purchases">Purchases</option>
            <option value="sales">Sales</option>
            <option value="expenses">Expenses</option>
          </select>
        </div>
      </div>

      {/* Logs stream */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className={`p-8 rounded-2xl border text-center text-xs text-slate-400 ${
            nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            No audit records match your filters.
          </div>
        ) : (
          filteredLogs.map(log => {
            const isEdit = log.action === 'edit';
            const isDelete = log.action === 'soft_delete' || log.action === 'purge';
            const isSeal = log.action === 'create' && log.collectionType === 'seal';

            return (
              <div
                key={log.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isDelete
                    ? 'bg-rose-950/20 border-rose-800/40'
                    : isEdit
                    ? 'bg-amber-950/20 border-amber-800/40'
                    : nightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isDelete
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isEdit
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : isSeal
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {log.action}
                    </span>

                    <span className="text-xs font-semibold text-slate-300 capitalize">
                      {log.collectionType}
                    </span>

                    <span className="text-[10px] font-mono text-slate-500">
                      ID #{log.entryId?.slice(0, 8)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-end sm:self-auto font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>

                {/* Actor & Mandatory Reason */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Actor:</span>
                    <span className="font-bold text-amber-400">{log.changedByName}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-200 flex items-start gap-2">
                    <span className="text-slate-400 font-semibold shrink-0">Reason:</span>
                    <span className="italic">{log.reason}</span>
                  </div>

                  {/* Changes Diff if present */}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-[11px] font-mono">
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                        Field Diffs:
                      </div>
                      {Object.entries(log.changes).map(([field, delta]: [string, any]) => (
                        <div key={field} className="flex items-center gap-2">
                          <span className="text-slate-400">{field}:</span>
                          <span className="text-rose-400 line-through">{String(delta.old ?? 'empty')}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-emerald-400 font-bold">{String(delta.new ?? 'empty')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
