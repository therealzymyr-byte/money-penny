import Database from 'better-sqlite3';
import type { SignalStatus, StoredSignal } from './types.js';

export class ScreenshotSignalRepository {
  private db: any;
  constructor(path: string) { this.db = new Database(path); this.db.exec(`CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT, direction TEXT, entry_price REAL, stop_loss REAL, take_profits TEXT NOT NULL,
    lot_size REAL, timeframe TEXT, status TEXT NOT NULL, screenshot_urls TEXT NOT NULL, author_id TEXT NOT NULL,
    message_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, is_test INTEGER NOT NULL DEFAULT 0, note TEXT)`); }
  create(signal: Omit<StoredSignal, 'id' | 'createdAt' | 'updatedAt'>): StoredSignal { const now = new Date().toISOString();
    const r = this.db.prepare(`INSERT INTO signals (symbol,direction,entry_price,stop_loss,take_profits,lot_size,timeframe,status,screenshot_urls,author_id,message_id,created_at,updated_at,is_test,note) VALUES (@symbol,@direction,@entryPrice,@stopLoss,@takeProfits,@lotSize,@timeframe,@status,@screenshotUrls,@authorId,@messageId,@createdAt,@updatedAt,@isTest,@note)`).run({...signal, messageId: signal.messageId ?? null, takeProfits: JSON.stringify(signal.takeProfits), screenshotUrls: JSON.stringify(signal.screenshotUrls), createdAt: now, updatedAt: now, isTest: signal.isTest ? 1 : 0}); return this.get(Number(r.lastInsertRowid))!; }
  get(id: number): StoredSignal | undefined { return this.hydrate(this.db.prepare('SELECT * FROM signals WHERE id=?').get(id)); }
  update(id: number, status: SignalStatus, messageId?: string) { this.db.prepare('UPDATE signals SET status=?, message_id=COALESCE(?,message_id), updated_at=? WHERE id=?').run(status, messageId || null, new Date().toISOString(), id); return this.get(id); }
  recent(symbol?: string) { const rows: any[] = symbol ? this.db.prepare('SELECT * FROM signals WHERE symbol=? ORDER BY id DESC LIMIT 25').all(symbol.toUpperCase()) : this.db.prepare('SELECT * FROM signals ORDER BY id DESC LIMIT 25').all(); return rows.map((r: any) => this.hydrate(r)!); }
  stats() { return this.db.prepare(`SELECT COUNT(*) total, SUM(status='TAKE PROFIT') wins, SUM(status='STOP LOSS') losses, SUM(status='BREAK EVEN') breakeven FROM signals WHERE is_test=0`).get() as {total:number;wins:number;losses:number;breakeven:number}; }
  private hydrate(row: any): StoredSignal | undefined { if (!row) return undefined; return { id:row.id, symbol:row.symbol, direction:row.direction, entryPrice:row.entry_price, stopLoss:row.stop_loss, takeProfits:JSON.parse(row.take_profits), lotSize:row.lot_size, timeframe:row.timeframe, status:row.status, screenshotUrls:JSON.parse(row.screenshot_urls), authorId:row.author_id, messageId:row.message_id, createdAt:row.created_at, updatedAt:row.updated_at, isTest:Boolean(row.is_test), note:row.note }; }
}
