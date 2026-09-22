import { PurchaseEntry, SaleEntry, ExpenseEntry, CatalogItem, AuditLogEntry, DailySeal, CashHandoverEntry, DamagedStockEntry } from '../types';

export interface FullBackupPayload {
  exportDate: string;
  season: string;
  totals: {
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    netProfit: number;
    cashInHand: number;
    fampayBalance: number;
  };
  items: CatalogItem[];
  purchases: PurchaseEntry[];
  sales: SaleEntry[];
  expenses: ExpenseEntry[];
  damagedStock: DamagedStockEntry[];
  cashHandovers: CashHandoverEntry[];
  auditLogs: AuditLogEntry[];
  dailySeals: DailySeal[];
}

export function generateCsvData(data: FullBackupPayload): string {
  const lines: string[] = [];

  lines.push('=== DIWALI PATAKAS LEDGER - COMPLETE HUMAN-READABLE BACKUP ===');
  lines.push(`Exported At,${data.exportDate}`);
  lines.push(`Season,${data.season}`);
  lines.push(`Total Sales,Rs ${data.totals.totalSales}`);
  lines.push(`Total Purchases,Rs ${data.totals.totalPurchases}`);
  lines.push(`Total Expenses,Rs ${data.totals.totalExpenses}`);
  lines.push(`Net Profit,Rs ${data.totals.netProfit}`);
  lines.push(`Cash-in-Hand,Rs ${data.totals.cashInHand}`);
  lines.push(`FamPay Balance,Rs ${data.totals.fampayBalance}`);
  lines.push('');

  // 1. Catalog & Inventory
  lines.push('--- INVENTORY CATALOG ---');
  lines.push('ID,Item Name,Category,Unit,Cost Price,Selling Price,Low Stock Alert');
  data.items.forEach(i => {
    lines.push(`"${i.id}","${escapeCsv(i.name)}","${i.category}","${i.unit}",${i.costPrice},${i.sellingPrice},${i.lowStockThreshold}`);
  });
  lines.push('');

  // 2. Sales
  lines.push('--- SALES TRANSACTIONS ---');
  lines.push('ID,Date,Time,Item Name,Qty,Unit Price,Total Price,Payment Mode,Bulk Sale,Logged By,Modified After Seal,Deleted');
  data.sales.forEach(s => {
    lines.push(`"${s.id}","${s.date}","${s.timestamp}","${escapeCsv(s.itemName)}",${s.quantity},${s.unitPrice},${s.totalPrice},"${s.paymentType}","${s.isBulkSale ? 'YES' : 'NO'}","${escapeCsv(s.loggedByName)}","${s.modifiedAfterSeal ? 'YES' : 'NO'}","${s.isDeleted ? 'YES' : 'NO'}"`);
  });
  lines.push('');

  // 3. Purchases
  lines.push('--- PURCHASES (STOCK BILLS) ---');
  lines.push('ID,Date,Item Name,Qty,Cost Per Unit,Total Cost,Supplier,Receipt Attached,Logged By,Modified After Seal,Deleted');
  data.purchases.forEach(p => {
    lines.push(`"${p.id}","${p.date}","${escapeCsv(p.itemName)}",${p.quantity},${p.costPerUnit},${p.totalCost},"${escapeCsv(p.supplierName)}","${p.photoUrl ? 'YES' : 'NO'}","${escapeCsv(p.loggedByName)}","${p.modifiedAfterSeal ? 'YES' : 'NO'}","${p.isDeleted ? 'YES' : 'NO'}"`);
  });
  lines.push('');

  // 4. Expenses
  lines.push('--- EXPENSES ---');
  lines.push('ID,Date,Category,Amount,Payment Mode,Note,Logged By,Receipt Attached,Deleted');
  data.expenses.forEach(e => {
    lines.push(`"${e.id}","${e.date}","${e.category}",${e.amount},"${e.paymentType}","${escapeCsv(e.note)}","${escapeCsv(e.loggedByName)}","${e.photoUrl ? 'YES' : 'NO'}","${e.isDeleted ? 'YES' : 'NO'}"`);
  });
  lines.push('');

  // 5. Damaged Stock
  lines.push('--- DAMAGED / WASTED STOCK ---');
  lines.push('ID,Date,Item Name,Quantity,Reason,Logged By');
  data.damagedStock.forEach(d => {
    lines.push(`"${d.id}","${d.date}","${escapeCsv(d.itemName)}",${d.quantity},"${escapeCsv(d.reason)}","${escapeCsv(d.loggedByName)}"`);
  });
  lines.push('');

  // 6. Cash Handovers
  lines.push('--- PHYSICAL CASH HANDOVERS ---');
  lines.push('ID,Initiated At,From Partner,To Partner,Amount,Status,Confirmed At,Notes');
  data.cashHandovers.forEach(h => {
    lines.push(`"${h.id}","${h.initiatedAt}","${escapeCsv(h.fromName)}","${escapeCsv(h.toName)}",${h.amount},"${h.status}","${h.confirmedAt || ''}","${escapeCsv(h.notes || '')}"`);
  });
  lines.push('');

  // 7. Daily Seals
  lines.push('--- DAILY SEALS & RECONCILIATION ---');
  lines.push('Date,Closed At,Closed By,Expected Cash,Counted Cash,Discrepancy,SHA-256 Checksum,Notes');
  data.dailySeals.forEach(ds => {
    lines.push(`"${ds.date}","${ds.closedAt}","${escapeCsv(ds.closedByName)}",${ds.expectedCash},${ds.physicalCashCounted},${ds.discrepancy},"${ds.checksum}","${escapeCsv(ds.discrepancyNotes || '')}"`);
  });
  lines.push('');

  // 8. Immutable Audit Trail
  lines.push('--- IMMUTABLE AUDIT TRAIL ---');
  lines.push('ID,Timestamp,Entry ID,Collection,Action,Editor,Mandatory Reason');
  data.auditLogs.forEach(al => {
    lines.push(`"${al.id}","${al.timestamp}","${al.entryId}","${al.collectionType}","${al.action}","${escapeCsv(al.changedByName)}","${escapeCsv(al.reason)}"`);
  });

  return lines.join('\n');
}

function escapeCsv(str: string): string {
  if (!str) return '';
  return str.replace(/"/g, '""');
}

export function downloadFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportLedgerJson(data: any) {
  const jsonStr = JSON.stringify(data, null, 2);
  downloadFile(`diwali_ledger_backup_${new Date().toISOString().split('T')[0]}.json`, jsonStr, 'application/json');
}

export function exportSalesCsv(sales: SaleEntry[]) {
  const lines = ['ID,Date,Time,Item Name,Quantity,Unit Price,Total Price,Payment Mode,Bulk Sale,Logged By,Deleted'];
  sales.forEach(s => {
    lines.push(`"${s.id}","${s.date}","${s.timestamp}","${escapeCsv(s.itemName)}",${s.quantity},${s.unitPrice},${s.totalPrice},"${s.paymentType}","${s.isBulkSale ? 'YES' : 'NO'}","${escapeCsv(s.loggedByName)}","${s.isDeleted ? 'YES' : 'NO'}"`);
  });
  downloadFile(`diwali_sales_${new Date().toISOString().split('T')[0]}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;');
}
