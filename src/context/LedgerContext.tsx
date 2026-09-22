import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db, testFirestoreConnection } from '../firebase/config';
import { useAuth } from './AuthContext';
import {
  CatalogItem,
  PurchaseEntry,
  SaleEntry,
  ExpenseEntry,
  DamagedStockEntry,
  CashHandoverEntry,
  AuditLogEntry,
  DailySeal,
  SeasonConfig,
  ItemStockSummary
} from '../types';
import { seedInitialCatalog } from '../firebase/seed';
import { computeDayChecksum } from '../utils/crypto';
import { generateCsvData, downloadFile, FullBackupPayload } from '../utils/export';

interface LedgerContextType {
  items: CatalogItem[];
  purchases: PurchaseEntry[];
  sales: SaleEntry[];
  expenses: ExpenseEntry[];
  damagedStock: DamagedStockEntry[];
  cashHandovers: CashHandoverEntry[];
  auditLogs: AuditLogEntry[];
  dailySeals: DailySeal[];
  seasonConfig: SeasonConfig | null;

  // Running Financials
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  runningProfit: number;
  cashInHand: number;
  fampayBalance: number;

  // Stock
  itemStockMap: Record<string, ItemStockSummary>;
  lowStockItems: ItemStockSummary[];

  // Audits & Day seals
  todayDateStr: string;
  isTodaySealed: boolean;
  todaySeal?: DailySeal;
  unconfirmedHandoversCount: number;

  // App settings
  isOnline: boolean;
  nightMode: boolean;
  toggleNightMode: () => void;
  isSeasonLocked: boolean;

  // Actions
  addPurchase: (entry: Omit<PurchaseEntry, 'id' | 'timestamp' | 'loggedByUid' | 'loggedByName'>) => Promise<string>;
  addSale: (entry: Omit<SaleEntry, 'id' | 'timestamp' | 'loggedByUid' | 'loggedByName'>) => Promise<string>;
  addExpense: (entry: Omit<ExpenseEntry, 'id' | 'timestamp' | 'loggedByUid' | 'loggedByName'>) => Promise<string>;
  addDamagedStock: (entry: Omit<DamagedStockEntry, 'id' | 'timestamp' | 'loggedByUid' | 'loggedByName'>) => Promise<string>;
  initiateCashHandover: (toUid: string, toName: string, amount: number, notes?: string) => Promise<string>;
  confirmCashHandover: (handoverId: string) => Promise<void>;

  // Admin Actions with Mandatory Reason
  editEntry: (collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock', id: string, changes: Record<string, any>, reason: string) => Promise<void>;
  softDeleteEntry: (collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock', id: string, reason: string) => Promise<void>;
  restoreEntry: (collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock', id: string, reason: string) => Promise<void>;
  purgeEntry: (collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock', id: string, reason: string) => Promise<void>;

  // Daily Seal & Spot-check
  closeDay: (dateStr: string, physicalCashCounted: number, notes?: string) => Promise<DailySeal>;
  verifySpotCheck: (dateStr: string, entryId: string) => Promise<void>;

  // Season Sign-off
  signoffSeason: (note?: string) => Promise<void>;
  reopenSeason: (reason: string) => Promise<void>;

  // Backup
  exportBackupNow: () => void;

  // Reset all entries data
  resetAllEntriesData: () => Promise<void>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, currentUser, isAdmin } = useAuth();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [damagedStock, setDamagedStock] = useState<DamagedStockEntry[]>([]);
  const [cashHandovers, setCashHandovers] = useState<CashHandoverEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [dailySeals, setDailySeals] = useState<DailySeal[]>([]);
  const [seasonConfig, setSeasonConfig] = useState<SeasonConfig | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [nightMode, setNightMode] = useState<boolean>(() => {
    // Night stall mode: default active if after 6 PM local time or saved in localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('patakas_night_mode');
      if (saved !== null) return saved === 'true';
      const hours = new Date().getHours();
      return hours >= 18 || hours < 6;
    }
    return true;
  });

  const toggleNightMode = () => {
    setNightMode(prev => {
      const next = !prev;
      localStorage.setItem('patakas_night_mode', String(next));
      return next;
    });
  };

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    testFirestoreConnection();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Today string YYYY-MM-DD
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUser) return;

    seedInitialCatalog();

    // 1. Items
    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      const data: CatalogItem[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as CatalogItem));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setItems(data);
    }, err => console.warn('Items listener:', err));

    // 2. Purchases
    const unsubPurchases = onSnapshot(collection(db, 'purchases'), (snap) => {
      const data: PurchaseEntry[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as PurchaseEntry));
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPurchases(data);
    }, err => console.warn('Purchases listener:', err));

    // 3. Sales
    const unsubSales = onSnapshot(collection(db, 'sales'), (snap) => {
      const data: SaleEntry[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as SaleEntry));
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSales(data);
    }, err => console.warn('Sales listener:', err));

    // 4. Expenses
    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
      const data: ExpenseEntry[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as ExpenseEntry));
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setExpenses(data);
    }, err => console.warn('Expenses listener:', err));

    // 5. Damaged Stock
    const unsubDamaged = onSnapshot(collection(db, 'damaged_stock'), (snap) => {
      const data: DamagedStockEntry[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as DamagedStockEntry));
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setDamagedStock(data);
    }, err => console.warn('Damaged stock listener:', err));

    // 6. Cash Handovers
    const unsubHandovers = onSnapshot(collection(db, 'cash_handovers'), (snap) => {
      const data: CashHandoverEntry[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as CashHandoverEntry));
      data.sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime());
      setCashHandovers(data);
    }, err => console.warn('Handovers listener:', err));

    // 7. Audit Logs
    const unsubAudit = onSnapshot(collection(db, 'audit_logs'), (snap) => {
      const data: AuditLogEntry[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as AuditLogEntry));
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(data);
    }, err => console.warn('Audit logs listener:', err));

    // 8. Daily Seals
    const unsubSeals = onSnapshot(collection(db, 'daily_seals'), (snap) => {
      const data: DailySeal[] = [];
      snap.forEach(d => data.push({ ...d.data(), date: d.id } as DailySeal));
      data.sort((a, b) => b.date.localeCompare(a.date));
      setDailySeals(data);
    }, err => console.warn('Seals listener:', err));

    // 9. Season Config
    const unsubSeason = onSnapshot(doc(db, 'season_config', 'current'), (snap) => {
      if (snap.exists()) {
        setSeasonConfig(snap.data() as SeasonConfig);
      } else {
        // Initialize default season config
        const initialSeason: SeasonConfig = {
          id: 'current',
          seasonYear: new Date().getFullYear(),
          seasonName: `Diwali Season ${new Date().getFullYear()}`,
          status: 'active',
          signoffs: []
        };
        setDoc(doc(db, 'season_config', 'current'), initialSeason).catch(err => {
          console.warn('Initial season doc:', err);
        });
        setSeasonConfig(initialSeason);
      }
    }, err => console.warn('Season listener:', err));

    return () => {
      unsubItems();
      unsubPurchases();
      unsubSales();
      unsubExpenses();
      unsubDamaged();
      unsubHandovers();
      unsubAudit();
      unsubSeals();
      unsubSeason();
    };
  }, [currentUser]);

  // Active records (ignoring soft-deleted)
  const activeSales = useMemo(() => sales.filter(s => !s.isDeleted), [sales]);
  const activePurchases = useMemo(() => purchases.filter(p => !p.isDeleted), [purchases]);
  const activeExpenses = useMemo(() => expenses.filter(e => !e.isDeleted), [expenses]);
  const activeDamaged = useMemo(() => damagedStock.filter(d => !d.isDeleted), [damagedStock]);

  // Running Totals
  const totalSales = useMemo(() => activeSales.reduce((acc, s) => acc + (s.totalPrice || 0), 0), [activeSales]);
  const totalPurchases = useMemo(() => activePurchases.reduce((acc, p) => acc + (p.totalCost || 0), 0), [activePurchases]);
  const totalExpenses = useMemo(() => activeExpenses.reduce((acc, e) => acc + (e.amount || 0), 0), [activeExpenses]);
  const runningProfit = useMemo(() => totalSales - totalPurchases - totalExpenses, [totalSales, totalPurchases, totalExpenses]);

  // Money separation: Cash-in-hand vs FamPay / Digital
  const cashSales = useMemo(() => activeSales.filter(s => s.paymentType === 'cash').reduce((acc, s) => acc + s.totalPrice, 0), [activeSales]);
  const fampaySales = useMemo(() => activeSales.filter(s => s.paymentType === 'fampay').reduce((acc, s) => acc + s.totalPrice, 0), [activeSales]);
  const cashExpenses = useMemo(() => activeExpenses.filter(e => e.paymentType === 'cash').reduce((acc, e) => acc + e.amount, 0), [activeExpenses]);
  const fampayExpenses = useMemo(() => activeExpenses.filter(e => e.paymentType === 'fampay').reduce((acc, e) => acc + e.amount, 0), [activeExpenses]);

  // Cash handovers impact
  const cashInHand = useMemo(() => {
    // Basic physical cash at stall = Cash sales - Cash expenses
    return Math.max(0, cashSales - cashExpenses);
  }, [cashSales, cashExpenses]);

  const fampayBalance = useMemo(() => {
    return fampaySales - fampayExpenses;
  }, [fampaySales, fampayExpenses]);

  // Stock map
  const itemStockMap = useMemo(() => {
    const map: Record<string, ItemStockSummary> = {};
    items.forEach(item => {
      const itemPurchases = activePurchases.filter(p => p.itemId === item.id);
      const itemSales = activeSales.filter(s => s.itemId === item.id);
      const itemDamaged = activeDamaged.filter(d => d.itemId === item.id);

      const purchasedQty = itemPurchases.reduce((acc, p) => acc + p.quantity, 0);
      const soldQty = itemSales.reduce((acc, s) => acc + s.quantity, 0);
      const damagedQty = itemDamaged.reduce((acc, d) => acc + d.quantity, 0);
      const remainingQty = purchasedQty - soldQty - damagedQty;

      const totalRevenue = itemSales.reduce((acc, s) => acc + s.totalPrice, 0);
      const totalCost = itemPurchases.reduce((acc, p) => acc + p.totalCost, 0);

      // Profit margin per item: (sellingPrice - costPrice) / sellingPrice * 100
      const margin = item.sellingPrice > 0 ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100 : 0;

      map[item.id] = {
        item,
        purchasedQty,
        soldQty,
        damagedQty,
        remainingQty,
        isLowStock: remainingQty <= (item.lowStockThreshold || 5),
        totalRevenue,
        totalCost,
        profitMarginPercent: Math.round(margin)
      };
    });
    return map;
  }, [items, activePurchases, activeSales, activeDamaged]);

  const lowStockItems = useMemo(() => {
    return Object.values(itemStockMap).filter(summary => summary.isLowStock && summary.purchasedQty > 0);
  }, [itemStockMap]);

  const unconfirmedHandoversCount = useMemo(() => {
    return cashHandovers.filter(h => h.status === 'pending').length;
  }, [cashHandovers]);

  const todaySeal = useMemo(() => {
    return dailySeals.find(s => s.date === todayDateStr);
  }, [dailySeals, todayDateStr]);

  const isTodaySealed = Boolean(todaySeal);
  const isSeasonLocked = seasonConfig?.status === 'closed';

  // Helper to record an immutable audit log
  const recordAudit = async (
    entryId: string,
    collectionType: AuditLogEntry['collectionType'],
    action: AuditLogEntry['action'],
    reason: string,
    changes?: Record<string, { old: any; new: any }>
  ) => {
    if (!profile) return;
    const auditRef = doc(collection(db, 'audit_logs'));
    const log: AuditLogEntry = {
      id: auditRef.id,
      entryId,
      collectionType,
      action,
      reason,
      changes,
      changedByUid: profile.uid,
      changedByName: profile.displayName || profile.email,
      timestamp: new Date().toISOString()
    };
    await setDoc(auditRef, log);
  };

  // Add Purchase
  const addPurchase = async (entry: Omit<PurchaseEntry, 'id' | 'timestamp' | 'loggedByUid' | 'loggedByName'>) => {
    if (isSeasonLocked) throw new Error('Diwali season has been signed off and locked.');
    if (!profile) throw new Error('Must be logged in to record purchase.');

    const newRef = doc(collection(db, 'purchases'));
    const fullEntry: PurchaseEntry = {
      ...entry,
      id: newRef.id,
      timestamp: new Date().toISOString(),
      loggedByUid: profile.uid,
      loggedByName: profile.displayName || profile.email,
      isDeleted: false
    };

    await setDoc(newRef, fullEntry);
    await recordAudit(newRef.id, 'purchases', 'create', `Created purchase of ${entry.quantity}x ${entry.itemName} (Rs ${entry.totalCost})`);
    return newRef.id;
  };

  // Add Sale
  const addSale = async (entry: Omit<SaleEntry, 'id' | 'timestamp' | 'loggedByUid' | 'loggedByName'>) => {
    if (isSeasonLocked) throw new Error('Diwali season has been signed off and locked.');
    if (!profile) throw new Error('Must be logged in to record sale.');

    const newRef = doc(collection(db, 'sales'));
    const fullEntry: SaleEntry = {
      ...entry,
      id: newRef.id,
      timestamp: new Date().toISOString(),
      loggedByUid: profile.uid,
      loggedByName: profile.displayName || profile.email,
      isDeleted: false
    };

    await setDoc(newRef, fullEntry);
    await recordAudit(newRef.id, 'sales', 'create', `Created ${entry.paymentType.toUpperCase()} sale of ${entry.quantity}x ${entry.itemName} for Rs ${entry.totalPrice}`);
    return newRef.id;
  };

  // Add Expense
  const addExpense = async (entry: Omit<ExpenseEntry, 'id' | 'timestamp' | 'loggedByUid' | 'loggedByName'>) => {
    if (isSeasonLocked) throw new Error('Diwali season has been signed off and locked.');
    if (!profile) throw new Error('Must be logged in to record expense.');

    const newRef = doc(collection(db, 'expenses'));
    const fullEntry: ExpenseEntry = {
      ...entry,
      id: newRef.id,
      timestamp: new Date().toISOString(),
      loggedByUid: profile.uid,
      loggedByName: profile.displayName || profile.email,
      isDeleted: false
    };

    await setDoc(newRef, fullEntry);
    await recordAudit(newRef.id, 'expenses', 'create', `Created expense: ${entry.category} for Rs ${entry.amount}`);
    return newRef.id;
  };

  // Add Damaged Stock
  const addDamagedStock = async (entry: Omit<DamagedStockEntry, 'id' | 'timestamp' | 'loggedByUid' | 'loggedByName'>) => {
    if (isSeasonLocked) throw new Error('Diwali season has been signed off and locked.');
    if (!profile) throw new Error('Must be logged in to log damaged stock.');

    const newRef = doc(collection(db, 'damaged_stock'));
    const fullEntry: DamagedStockEntry = {
      ...entry,
      id: newRef.id,
      timestamp: new Date().toISOString(),
      loggedByUid: profile.uid,
      loggedByName: profile.displayName || profile.email,
      isDeleted: false
    };

    await setDoc(newRef, fullEntry);
    await recordAudit(newRef.id, 'damaged_stock', 'create', `Logged ${entry.quantity} damaged items of ${entry.itemName}: ${entry.reason}`);
    return newRef.id;
  };

  // Cash Handover
  const initiateCashHandover = async (toUid: string, toName: string, amount: number, notes?: string) => {
    if (!profile) throw new Error('Must be logged in.');
    const newRef = doc(collection(db, 'cash_handovers'));
    const entry: CashHandoverEntry = {
      id: newRef.id,
      fromUid: profile.uid,
      fromName: profile.displayName || profile.email,
      toUid,
      toName,
      amount,
      status: 'pending',
      initiatedAt: new Date().toISOString(),
      notes
    };
    await setDoc(newRef, entry);
    await recordAudit(newRef.id, 'purchases', 'create', `Initiated cash handover of Rs ${amount} to ${toName}`);
    return newRef.id;
  };

  const confirmCashHandover = async (handoverId: string) => {
    if (!profile) throw new Error('Must be logged in.');
    const ref = doc(db, 'cash_handovers', handoverId);
    await updateDoc(ref, {
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    });
    await recordAudit(handoverId, 'purchases', 'edit', `Recipient ${profile.displayName || profile.email} confirmed cash handover`);
  };

  // Edit Entry (Admin only, mandatory reason, checks seal status)
  const editEntry = async (
    collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock',
    id: string,
    changes: Record<string, any>,
    reason: string
  ) => {
    if (!isAdmin) throw new Error('Only Admin can edit saved entries.');
    if (!reason || reason.trim().length < 4) {
      throw new Error('A valid explanation reason is mandatory before editing any record.');
    }

    const docRef = doc(db, collectionType, id);
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) throw new Error('Entry not found');
    const oldData = existingSnap.data();

    // Check if the entry belongs to a date that was already sealed
    const entryDate = oldData.date || (oldData.timestamp ? oldData.timestamp.split('T')[0] : '');
    const isSealedDate = dailySeals.some(s => s.date === entryDate);

    const diffRecord: Record<string, { old: any; new: any }> = {};
    for (const [key, val] of Object.entries(changes)) {
      diffRecord[key] = { old: oldData[key], new: val };
    }

    const updatePayload: Record<string, any> = {
      ...changes,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: profile?.displayName || profile?.email
    };

    if (isSealedDate) {
      updatePayload.modifiedAfterSeal = true;
    }

    await updateDoc(docRef, updatePayload);
    await recordAudit(id, collectionType, 'edit', reason, diffRecord);
  };

  // Soft Delete (Admin only)
  const softDeleteEntry = async (
    collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock',
    id: string,
    reason: string
  ) => {
    if (!isAdmin) throw new Error('Only Admin can delete entries.');
    if (!reason || reason.trim().length < 4) {
      throw new Error('A mandatory explanation reason is required for deletion.');
    }

    const docRef = doc(db, collectionType, id);
    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: profile?.displayName || profile?.email,
      deleteReason: reason
    });

    await recordAudit(id, collectionType, 'soft_delete', reason);
  };

  // Restore Entry from Trash
  const restoreEntry = async (
    collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock',
    id: string,
    reason: string
  ) => {
    if (!isAdmin) throw new Error('Only Admin can restore entries.');
    const docRef = doc(db, collectionType, id);
    await updateDoc(docRef, {
      isDeleted: false,
      restoredAt: new Date().toISOString(),
      restoredBy: profile?.displayName || profile?.email
    });
    await recordAudit(id, collectionType, 'restore', reason || 'Restored from trash');
  };

  // Permanent Purge
  const purgeEntry = async (
    collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock',
    id: string,
    reason: string
  ) => {
    if (!isAdmin) throw new Error('Only Admin can permanently purge entries.');
    const docRef = doc(db, collectionType, id);
    await deleteDoc(docRef);
    await recordAudit(id, collectionType, 'purge', reason || 'Permanent purge from trash');
  };

  // Daily Close & Cash Reconciliation
  const closeDay = async (dateStr: string, physicalCashCounted: number, notes?: string): Promise<DailySeal> => {
    if (!isAdmin) throw new Error('Only Admin can close and seal the day.');
    if (!profile) throw new Error('Must be logged in.');

    // Compute expected numbers for dateStr
    const daysSales = activeSales.filter(s => s.date === dateStr);
    const daysPurchases = activePurchases.filter(p => p.date === dateStr);
    const daysExpenses = activeExpenses.filter(e => e.date === dateStr);

    const dayTotalSales = daysSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const dayTotalPurchases = daysPurchases.reduce((acc, p) => acc + p.totalCost, 0);
    const dayTotalExpenses = daysExpenses.reduce((acc, e) => acc + e.amount, 0);

    const dayCashSales = daysSales.filter(s => s.paymentType === 'cash').reduce((acc, s) => acc + s.totalPrice, 0);
    const dayFampaySales = daysSales.filter(s => s.paymentType === 'fampay').reduce((acc, s) => acc + s.totalPrice, 0);
    const dayCashExpenses = daysExpenses.filter(e => e.paymentType === 'cash').reduce((acc, e) => acc + e.amount, 0);
    const dayFampayExpenses = daysExpenses.filter(e => e.paymentType === 'fampay').reduce((acc, e) => acc + e.amount, 0);

    const expectedCash = Math.max(0, dayCashSales - dayCashExpenses);
    const discrepancy = Number((physicalCashCounted - expectedCash).toFixed(2));
    const entriesCount = daysSales.length + daysPurchases.length + daysExpenses.length;

    // Cryptographic hash
    const checksum = await computeDayChecksum({
      date: dateStr,
      totalSales: dayTotalSales,
      totalPurchases: dayTotalPurchases,
      totalExpenses: dayTotalExpenses,
      entriesCount
    });

    const seal: DailySeal = {
      date: dateStr,
      closedByUid: profile.uid,
      closedByName: profile.displayName || profile.email,
      closedAt: new Date().toISOString(),
      totalSales: dayTotalSales,
      totalExpenses: dayTotalExpenses,
      totalPurchases: dayTotalPurchases,
      cashSales: dayCashSales,
      fampaySales: dayFampaySales,
      cashExpenses: dayCashExpenses,
      fampayExpenses: dayFampayExpenses,
      expectedCash,
      physicalCashCounted,
      discrepancy,
      discrepancyNotes: notes,
      checksum,
      entriesCount
    };

    const sealRef = doc(db, 'daily_seals', dateStr);
    await setDoc(sealRef, seal);

    // Also mark items in that day as sealed
    const batch = writeBatch(db);
    daysSales.forEach(s => batch.update(doc(db, 'sales', s.id), { isSealed: true, sealedChecksum: checksum }));
    daysPurchases.forEach(p => batch.update(doc(db, 'purchases', p.id), { isSealed: true, sealedChecksum: checksum }));
    daysExpenses.forEach(e => batch.update(doc(db, 'expenses', e.id), { isSealed: true, sealedChecksum: checksum }));
    await batch.commit();

    await recordAudit(
      dateStr,
      'seal',
      'create',
      `Closed and sealed day ${dateStr}. Expected Cash: Rs ${expectedCash}, Counted: Rs ${physicalCashCounted}, Discrepancy: Rs ${discrepancy}. Checksum: ${checksum}`
    );

    return seal;
  };

  // Spot-check confirmation
  const verifySpotCheck = async (dateStr: string, entryId: string) => {
    if (!isAdmin) throw new Error('Only Admin can verify spot checks.');
    const sealRef = doc(db, 'daily_seals', dateStr);
    await updateDoc(sealRef, {
      spotCheckVerifiedEntryId: entryId,
      spotCheckVerifiedAt: new Date().toISOString()
    }).catch(async () => {
      // create partial seal doc if not sealed yet
      await setDoc(sealRef, {
        date: dateStr,
        spotCheckVerifiedEntryId: entryId,
        spotCheckVerifiedAt: new Date().toISOString()
      }, { merge: true });
    });
    await recordAudit(entryId, 'purchases', 'spot_check', `Admin verified daily random spot check for entry ${entryId}`);
  };

  // Season Sign-off
  const signoffSeason = async (note?: string) => {
    if (!profile) throw new Error('Must be logged in to sign off.');
    const seasonRef = doc(db, 'season_config', 'current');
    const existingSignoffs = seasonConfig?.signoffs || [];

    // Filter out existing signoff for this user if updating
    const otherSignoffs = existingSignoffs.filter(s => s.uid !== profile.uid);
    const mySignoff = {
      uid: profile.uid,
      displayName: profile.displayName || profile.email,
      email: profile.email,
      confirmedAt: new Date().toISOString(),
      note
    };

    const newSignoffs = [...otherSignoffs, mySignoff];
    const allSigned = newSignoffs.length >= 4; // all 4 partners confirmed!

    const updatePayload: Partial<SeasonConfig> = {
      signoffs: newSignoffs
    };

    if (allSigned) {
      updatePayload.status = 'closed';
      updatePayload.finalSummary = {
        totalRevenue: totalSales,
        totalPurchases,
        totalExpenses,
        netProfit: runningProfit,
        cashInHand,
        fampayBalance,
        closedAt: new Date().toISOString()
      };
    }

    await updateDoc(seasonRef, updatePayload);
    await recordAudit('current', 'season', 'edit', `${profile.displayName} digitally signed off on final season numbers. (${newSignoffs.length}/4 partners confirmed)`);
  };

  // Reopen Season (Admin only, mandatory explanation)
  const reopenSeason = async (reason: string) => {
    if (!isAdmin) throw new Error('Only Admin can reopen season.');
    if (!reason || reason.trim().length < 6) {
      throw new Error('A detailed reason is strictly required to reopen a closed season.');
    }

    const seasonRef = doc(db, 'season_config', 'current');
    const pastLogs = seasonConfig?.reopenedLogs || [];
    const newLog = {
      reopenedByUid: profile!.uid,
      reopenedByName: profile!.displayName || profile!.email,
      reopenedAt: new Date().toISOString(),
      reason
    };

    await updateDoc(seasonRef, {
      status: 'active',
      reopenedLogs: [...pastLogs, newLog]
    });

    await recordAudit('current', 'season', 'reopen_season', `Admin reopened season: ${reason}`);
  };

  // Export full backup
  const exportBackupNow = () => {
    const payload: FullBackupPayload = {
      exportDate: new Date().toISOString(),
      season: seasonConfig?.seasonName || 'Diwali 2026',
      totals: {
        totalSales,
        totalPurchases,
        totalExpenses,
        netProfit: runningProfit,
        cashInHand,
        fampayBalance
      },
      items,
      purchases,
      sales,
      expenses,
      damagedStock,
      cashHandovers,
      auditLogs,
      dailySeals
    };

    // Download CSV
    const csvContent = generateCsvData(payload);
    const dateTag = new Date().toISOString().slice(0, 10);
    downloadFile(`diwali-patakas-backup-${dateTag}.csv`, csvContent, 'text/csv;charset=utf-8;');

    // Also download full JSON for offline preservation
    const jsonContent = JSON.stringify(payload, null, 2);
    downloadFile(`diwali-patakas-backup-${dateTag}.json`, jsonContent, 'application/json');

    // Save snapshot in localStorage
    try {
      localStorage.setItem('patakas_last_backup', jsonContent);
      localStorage.setItem('patakas_last_backup_date', new Date().toISOString());
    } catch {
      // quota
    }
  };

  // Full reset of all entries, transactions, handovers, seals, and season state
  const resetAllEntriesData = async () => {
    if (!isAdmin) {
      throw new Error('Unauthorized: You do not have permission to reset data.');
    }

    const collectionsToClear = [
      'purchases',
      'sales',
      'expenses',
      'damaged_stock',
      'cash_handovers',
      'audit_logs',
      'daily_seals'
    ];

    for (const colName of collectionsToClear) {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // Reset season config
    const seasonRef = doc(db, 'season_config', 'current');
    await setDoc(seasonRef, {
      id: 'current',
      seasonYear: 2026,
      seasonName: 'Diwali Patakas 2026',
      status: 'active',
      signoffs: [],
      createdAt: new Date().toISOString()
    });

    // Reset local backup caches
    try {
      localStorage.removeItem('patakas_last_backup');
      localStorage.removeItem('patakas_last_backup_date');
    } catch {
      // ignore
    }
  };

  return (
    <LedgerContext.Provider
      value={{
        items,
        purchases,
        sales,
        expenses,
        damagedStock,
        cashHandovers,
        auditLogs,
        dailySeals,
        seasonConfig,
        totalSales,
        totalPurchases,
        totalExpenses,
        runningProfit,
        cashInHand,
        fampayBalance,
        itemStockMap,
        lowStockItems,
        todayDateStr,
        isTodaySealed,
        todaySeal,
        unconfirmedHandoversCount,
        isOnline,
        nightMode,
        toggleNightMode,
        isSeasonLocked,
        addPurchase,
        addSale,
        addExpense,
        addDamagedStock,
        initiateCashHandover,
        confirmCashHandover,
        editEntry,
        softDeleteEntry,
        restoreEntry,
        purgeEntry,
        closeDay,
        verifySpotCheck,
        signoffSeason,
        reopenSeason,
        exportBackupNow,
        resetAllEntriesData
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export function useLedger() {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
}
