import OBSWebSocket from 'obs-websocket-js';
import { config } from '../config.js';

export type ObsConnectionStatus = 'CONNECTED' | 'DISCONNECTED';
export type ObservedStreamStatus = 'LIVE' | 'OFFLINE' | 'UNKNOWN';
export interface StreamingSource { getStatus(): Promise<ObservedStreamStatus>; getStreamUrl(): string | null; getPlatformName(): string; isLive(): boolean; }

/** Modern OBS WebSocket v5 source. It is intentionally the only platform source for now. */
export class ObsService implements StreamingSource {
  private readonly obs = new OBSWebSocket();
  private connected = false;
  private streaming: ObservedStreamStatus = 'UNKNOWN';
  private retryMs = 1_000;
  private retryTimer: NodeJS.Timeout | null = null;
  private connecting: Promise<void> | null = null;
  onConnectionChange?: (status: ObsConnectionStatus) => void;
  onStreamChange?: (status: ObservedStreamStatus) => void;

  constructor() {
    this.obs.on('ConnectionClosed', () => this.handleDisconnected());
    this.obs.on('StreamStateChanged', (event: { outputActive?: boolean }) => this.setStreaming(event.outputActive ? 'LIVE' : 'OFFLINE'));
  }

  get connectionStatus(): ObsConnectionStatus { return this.connected ? 'CONNECTED' : 'DISCONNECTED'; }
  getPlatformName() { return 'OBS'; }
  getStreamUrl() { return config.streamDestinationUrl || null; }
  isLive() { return this.streaming === 'LIVE'; }
  async getStatus() { return this.streaming; }

  start() { void this.connect(); }
  async refresh() { await this.connect(); if (!this.connected) return 'UNKNOWN' as const; return this.readStreamStatus(); }
  stop() { if (this.retryTimer) clearTimeout(this.retryTimer); this.retryTimer = null; void this.obs.disconnect().catch(() => undefined); }

  private async connect(): Promise<void> {
    if (this.connected) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      console.log('[OBS] Connecting...');
      try {
        await this.obs.connect(`ws://${config.obsHost}:${config.obsPort}`, config.obsPassword || undefined);
        this.connected = true; this.retryMs = 1_000;
        console.log('[OBS] Connected'); this.onConnectionChange?.('CONNECTED');
        await this.readStreamStatus();
      } catch (error) {
        console.warn(`[OBS] unavailable (${error instanceof Error ? error.message : 'connection failed'})`);
        this.handleDisconnected();
      } finally { this.connecting = null; }
    })();
    return this.connecting;
  }

  private async readStreamStatus(): Promise<ObservedStreamStatus> {
    try { const state = await this.obs.call('GetStreamStatus'); this.setStreaming(state.outputActive ? 'LIVE' : 'OFFLINE'); }
    catch { this.setStreaming('UNKNOWN'); }
    return this.streaming;
  }
  private setStreaming(next: ObservedStreamStatus) {
    if (next === this.streaming) return;
    this.streaming = next;
    console.log(`[OBS] Streaming ${next.toLowerCase()}`);
    this.onStreamChange?.(next);
  }
  private handleDisconnected() {
    const wasConnected = this.connected; this.connected = false;
    if (wasConnected) { console.log('[OBS] Disconnected'); this.onConnectionChange?.('DISCONNECTED'); }
    if (!this.retryTimer) {
      const delay = this.retryMs; this.retryMs = Math.min(this.retryMs * 2, 60_000);
      console.log(`[OBS] Reconnecting in ${Math.round(delay / 1000)}s...`);
      this.retryTimer = setTimeout(() => { this.retryTimer = null; void this.connect(); }, delay);
    }
  }
}
