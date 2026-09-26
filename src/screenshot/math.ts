import type { Direction, ExtractedSignal } from './types.js';

export function riskReward(entry: number | null, stop: number | null, target: number | null, direction: Direction): number | null {
  if (entry === null || stop === null || target === null || !direction) return null;
  const risk = Math.abs(entry - stop);
  const reward = direction === 'BUY' ? target - entry : entry - target;
  return risk > 0 && reward > 0 ? Number((reward / risk).toFixed(2)) : null;
}
export function normalize(raw: Partial<ExtractedSignal>): ExtractedSignal {
  return { symbol: raw.symbol?.trim().toUpperCase() || null, direction: raw.direction === 'BUY' || raw.direction === 'SELL' ? raw.direction : null,
    entryPrice: numberOrNull(raw.entryPrice), stopLoss: numberOrNull(raw.stopLoss), takeProfits: (raw.takeProfits || []).map(numberOrNull).filter((n): n is number => n !== null),
    lotSize: numberOrNull(raw.lotSize), timeframe: raw.timeframe?.trim() || null, note: raw.note?.trim() || null };
}
function numberOrNull(value: unknown) { const n = typeof value === 'number' ? value : Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
