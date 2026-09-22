export type UserRole = 'admin' | 'member';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  hindiName?: string;
  category: 'Sparklers (Phuljhadi)' | 'Ground Spinners (Chakri)' | 'Flower Pots (Anar)' | 'Rockets' | 'Garlands (Ladi)' | 'Sky Shots' | 'Kids Novelty' | 'Other';
  unit: string; // e.g. 'box', 'packet', 'piece'
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  createdAt?: string;
}

export interface PurchaseEntry {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
  supplierName: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO String
  photoUrl: string; // mandatory receipt
  photoTimestamp?: string;
  photoTimeDiffHours?: number;
  loggedByUid: string;
  loggedByName: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  isSealed?: boolean;
  sealedChecksum?: string;
  modifiedAfterSeal?: boolean;
}

export interface SaleEntry {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentType: 'cash' | 'fampay';
  isBulkSale: boolean;
  photoUrl?: string; // required if bulk sale
  photoTimestamp?: string;
  photoTimeDiffHours?: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO String
  loggedByUid: string;
  loggedByName: string;
  basketId?: string; // grouping for multiple items in same sale transaction
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  isSealed?: boolean;
  sealedChecksum?: string;
  modifiedAfterSeal?: boolean;
}

export interface ExpenseEntry {
  id: string;
  category: 'transport' | 'stall_rental' | 'packaging' | 'food' | 'misc';
  amount: number;
  paymentType: 'cash' | 'fampay';
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO String
  note: string;
  photoUrl?: string; // required where available
  photoTimestamp?: string;
  loggedByUid: string;
  loggedByName: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  isSealed?: boolean;
  sealedChecksum?: string;
  modifiedAfterSeal?: boolean;
}

export interface DamagedStockEntry {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason: string;
  date: string;
  timestamp: string;
  photoUrl?: string;
  loggedByUid: string;
  loggedByName: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
}

export interface CashHandoverEntry {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  initiatedAt: string;
  confirmedAt?: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  entryId: string;
  collectionType: 'purchases' | 'sales' | 'expenses' | 'damaged_stock' | 'season' | 'seal';
  action: 'create' | 'edit' | 'soft_delete' | 'restore' | 'purge' | 'reopen_season' | 'spot_check';
  reason: string;
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;
  changes?: Record<string, { old: any; new: any }>;
  changedByUid: string;
  changedByName: string;
  timestamp: string;
}

export interface DailySeal {
  date: string; // YYYY-MM-DD
  closedByUid: string;
  closedByName: string;
  closedAt: string;
  totalSales: number;
  totalExpenses: number;
  totalPurchases: number;
  cashSales: number;
  fampaySales: number;
  cashExpenses: number;
  fampayExpenses: number;
  expectedCash: number;
  physicalCashCounted: number;
  discrepancy: number; // physical - expected
  discrepancyNotes?: string;
  checksum: string;
  entriesCount: number;
  spotCheckVerifiedEntryId?: string;
  spotCheckVerifiedAt?: string;
}

export interface SeasonSignoff {
  uid: string;
  displayName: string;
  email: string;
  confirmedAt: string;
  note?: string;
}

export interface SeasonConfig {
  id: string;
  seasonYear: number;
  seasonName: string;
  status: 'active' | 'closed';
  signoffs: SeasonSignoff[];
  finalSummary?: {
    totalRevenue: number;
    totalPurchases: number;
    totalExpenses: number;
    netProfit: number;
    cashInHand: number;
    fampayBalance: number;
    closedAt: string;
  };
  reopenedLogs?: Array<{
    reopenedByUid: string;
    reopenedByName: string;
    reopenedAt: string;
    reason: string;
  }>;
}

export interface ItemStockSummary {
  item: CatalogItem;
  purchasedQty: number;
  soldQty: number;
  damagedQty: number;
  remainingQty: number;
  isLowStock: boolean;
  totalRevenue: number;
  totalCost: number;
  profitMarginPercent: number;
}
