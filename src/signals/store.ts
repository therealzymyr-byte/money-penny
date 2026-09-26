import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { config } from '../config.js';
import type { Signal, SignalStatus } from './types.js';

export class SignalStore {
  private signals: Signal[] = [];
  async load() { try { this.signals = JSON.parse(await readFile(config.signalStorePath, 'utf8')); } catch { this.signals = []; } }
  async save() { await mkdir(dirname(config.signalStorePath), { recursive: true }); await writeFile(config.signalStorePath, JSON.stringify(this.signals, null, 2)); }
  list() { return [...this.signals]; }
  add(signal: Omit<Signal, 'id' | 'createdAt' | 'updatedAt' | 'status'>) { const now = new Date().toISOString(); const item: Signal = { ...signal, id: Math.max(0, ...this.signals.map(s => s.id)) + 1, status: 'ACTIVE', createdAt: now, updatedAt: now }; this.signals.push(item); return item; }
  update(id: number, status: SignalStatus) { const item = this.signals.find(s => s.id === id); if (!item) return undefined; item.status = status; item.updatedAt = new Date().toISOString(); return item; }
  stats() { const all = this.signals; const wins = all.filter(s => ['TP1 HIT', 'TP2 HIT'].includes(s.status)); const losses = all.filter(s => s.status === 'STOP LOSS HIT'); const breakeven = all.filter(s => s.status === 'BREAK-EVEN'); const resolved = wins.length + losses.length + breakeven.length; return { total: all.length, wins: wins.length, losses: losses.length, breakeven: breakeven.length, winRate: resolved ? wins.length / resolved * 100 : 0, avgRR: all.length ? all.reduce((n, s) => n + s.rr, 0) / all.length : 0, markets: [...new Set(all.map(s => s.market.toUpperCase()))], timeframes: [...new Set(all.map(s => s.timeframe.toUpperCase()))] }; }
}
