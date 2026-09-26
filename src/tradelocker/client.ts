import type { TlOrder, TlPosition, TlSnapshot } from './types.js';

const asNumber = (value: unknown) => value === undefined || value === null || value === '' ? undefined : Number(value);
const upper = (value: unknown) => String(value ?? '').toUpperCase();
type ApiData = { s?: string; d?: Record<string, unknown> };

export class TradeLockerClient {
  private token?: string;
  private tokenExpiresAt = 0;
  private accNum?: string;
  readonly enabled: boolean;
  readonly baseUrl: string;
  constructor(private env = process.env) {
    this.enabled = Boolean(env.TRADELOCKER_EMAIL && env.TRADELOCKER_PASSWORD && env.TRADELOCKER_SERVER && env.TRADELOCKER_ACCOUNT_ID);
    const host = env.TRADELOCKER_ENVIRONMENT === 'demo' ? 'https://demo.tradelocker.com/backend-api' : 'https://live.tradelocker.com/backend-api';
    this.baseUrl = host;
  }
  private async request<T>(path: string, init: RequestInit = {}, needsAccount = false): Promise<T> {
    if (!this.enabled) throw new Error('TradeLocker credentials are not configured.');
    await this.authenticate();
    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}`, Accept: 'application/json', ...(init.headers as Record<string, string> || {}) };
    if (needsAccount) headers.accNum = await this.accountNumber();
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) throw new Error(`TradeLocker ${response.status}: ${await response.text()}`);
    return response.json() as Promise<T>;
  }
  private async authenticate() {
    if (this.token && Date.now() < this.tokenExpiresAt - 60_000) return;
    const response = await fetch(`${this.baseUrl}/auth/jwt/token`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: this.env.TRADELOCKER_EMAIL, password: this.env.TRADELOCKER_PASSWORD, server: this.env.TRADELOCKER_SERVER }) });
    if (!response.ok) throw new Error(`TradeLocker authentication failed: ${response.status}`);
    const payload = await response.json() as { accessToken?: string; expiresIn?: number; expiresAt?: string; d?: { accessToken?: string; expireDate?: string } };
    this.token = payload.accessToken ?? payload.d?.accessToken;
    if (!this.token) throw new Error('TradeLocker did not return an access token.');
    this.tokenExpiresAt = payload.expiresAt ? Date.parse(payload.expiresAt) : payload.d?.expireDate ? Date.parse(payload.d.expireDate) : Date.now() + (payload.expiresIn ?? 900) * 1000;
  }
  private async accountNumber() {
    if (this.accNum) return this.accNum;
    if (this.env.TRADELOCKER_ACC_NUM) return this.accNum = this.env.TRADELOCKER_ACC_NUM;
    const accounts = await this.request<ApiData>('/auth/jwt/all-accounts');
    const collect = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value.flatMap(collect) : value && typeof value === 'object' ? [value as Record<string, unknown>, ...Object.values(value as Record<string, unknown>).flatMap(collect)] : [];
    const match = collect(accounts).find(a => String(a.accountId ?? a.id ?? a.accountNumber) === this.env.TRADELOCKER_ACCOUNT_ID);
    const value = match?.accNum ?? match?.accountNumber;
    if (value === undefined) throw new Error('Could not resolve TradeLocker accNum; set TRADELOCKER_ACC_NUM.');
    return this.accNum = String(value);
  }
  private async config() { return this.request<ApiData>('/trade/config', {}, true); }
  private rows(payload: ApiData, key: string, config: ApiData, configKey: string) {
    const rows = (payload.d?.[key] ?? []) as unknown[][];
    const schema = config.d?.[configKey] as unknown;
    const definitions = Array.isArray(schema) ? schema : Array.isArray((schema as { columns?: unknown[] } | undefined)?.columns) ? (schema as { columns: unknown[] }).columns : [];
    const fields = (definitions as Array<{ id?: string; name?: string }>).map(f => f.id ?? f.name ?? '');
    return rows.map(row => Object.fromEntries(fields.map((field, i) => [field, row[i]])));
  }
  private order(row: Record<string, unknown>): TlOrder { return { orderId: String(row.orderId ?? row.id), positionId: row.positionId ? String(row.positionId) : undefined, instrumentId: row.tradableInstrumentId ? String(row.tradableInstrumentId) : undefined, symbol: String(row.symbol ?? row.instrument ?? row.tradableInstrumentName ?? 'UNKNOWN'), side: upper(row.side) === 'SELL' ? 'SELL' : 'BUY', orderType: upper(row.type ?? row.orderType ?? 'MARKET'), status: upper(row.status), entry: asNumber(row.avgPrice ?? row.price ?? row.stopPrice ?? row.limitPrice), fillPrice: asNumber(row.avgPrice ?? row.filledPrice), stopLoss: asNumber(row.stopLoss), takeProfit: asNumber(row.takeProfit), volume: asNumber(row.qty ?? row.amount ?? row.lots), createdAt: row.createdDate ? String(row.createdDate) : undefined, updatedAt: row.lastModified ? String(row.lastModified) : undefined }; }
  private position(row: Record<string, unknown>): TlPosition { return { positionId: String(row.positionId ?? row.id), openOrderId: row.openOrderId ? String(row.openOrderId) : undefined, symbol: String(row.symbol ?? row.instrument ?? row.tradableInstrumentName ?? 'UNKNOWN'), side: upper(row.side) === 'SELL' ? 'SELL' : 'BUY', entry: asNumber(row.openPrice ?? row.price) ?? 0, stopLoss: asNumber(row.stopLoss ?? row.stopLossLimit), takeProfit: asNumber(row.takeProfit ?? row.takeProfitLimit), volume: asNumber(row.lots ?? row.qty ?? row.amount), openedAt: row.openDateTime ? String(row.openDateTime) : undefined, realizedPnl: asNumber(row.realizedPnl ?? row.pnl), closePrice: asNumber(row.closePrice), closedAt: row.closeDateTime ? String(row.closeDateTime) : undefined, closeReason: row.closeReason ? String(row.closeReason) : undefined }; }
  async snapshot(): Promise<TlSnapshot> {
    const accountId = this.env.TRADELOCKER_ACCOUNT_ID!;
    const [config, orders, positions, history, instruments] = await Promise.all([this.config(), this.request<ApiData>(`/trade/accounts/${accountId}/orders`, {}, true), this.request<ApiData>(`/trade/accounts/${accountId}/positions`, {}, true), this.request<ApiData>(`/trade/accounts/${accountId}/ordersHistory?from=${Date.now() - 30 * 86_400_000}`, {}, true), this.request<ApiData>(`/trade/accounts/${accountId}/instruments`, {}, true)]);
    const instrumentRows = (instruments.d?.instruments ?? []) as Array<Record<string, unknown>>;
    const names = new Map(instrumentRows.map(i => [String(i.tradableInstrumentId ?? i.id), String(i.name ?? i.symbol ?? i.description ?? 'UNKNOWN')]));
    const mapSymbols = (items: TlOrder[]) => items.map(item => ({ ...item, symbol: item.symbol === 'UNKNOWN' ? names.get(item.instrumentId ?? '') ?? 'UNKNOWN' : item.symbol }));
    return { orders: mapSymbols(this.rows(orders, 'orders', config, 'ordersConfig').map(r => this.order(r))), positions: this.rows(positions, 'positions', config, 'positionsConfig').map(r => this.position(r)), closedOrders: mapSymbols(this.rows(history, 'orders', config, 'ordersHistoryConfig').map(r => this.order(r))) };
  }
}
