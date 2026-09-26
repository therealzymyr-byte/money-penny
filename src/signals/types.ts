export type SignalStatus = 'ACTIVE' | 'TP1 HIT' | 'TP2 HIT' | 'STOP LOSS HIT' | 'BREAK-EVEN' | 'CANCELLED';
export interface Signal { id: number; market: string; direction: 'BUY' | 'SELL'; entry: number; stopLoss: number; tp1: number; tp2?: number; rr: number; timeframe: string; reason: string; status: SignalStatus; createdAt: string; updatedAt: string; }
