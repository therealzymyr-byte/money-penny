export type Direction = 'BUY' | 'SELL' | null;
export type SignalStatus = 'WAITING FOR ENTRY' | 'ACTIVE' | 'TAKE PROFIT' | 'STOP LOSS' | 'BREAK EVEN' | 'CANCELLED';

export interface ExtractedSignal {
  symbol: string | null; direction: Direction; entryPrice: number | null; stopLoss: number | null;
  takeProfits: number[]; lotSize: number | null; timeframe: string | null; note: string | null;
}
export interface StoredSignal extends ExtractedSignal {
  id: number; status: SignalStatus; screenshotUrls: string[]; authorId: string; messageId?: string; createdAt: string; updatedAt: string; isTest: boolean;
}
