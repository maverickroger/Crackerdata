/**
 * Computes a SHA-256 hex checksum of day's sales, purchases, and expenses totals
 */
export async function computeDayChecksum(data: {
  date: string;
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  entriesCount: number;
  itemIdsHash?: string;
}): Promise<string> {
  const payload = JSON.stringify({
    date: data.date,
    totalSales: Number(data.totalSales.toFixed(2)),
    totalPurchases: Number(data.totalPurchases.toFixed(2)),
    totalExpenses: Number(data.totalExpenses.toFixed(2)),
    entriesCount: data.entriesCount,
    itemIdsHash: data.itemIdsHash || ''
  });

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(payload);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
    } catch {
      // Fallback
    }
  }

  // Simple deterministic fallback hash
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'SEAL-' + Math.abs(hash).toString(16).padStart(12, '0');
}
