import Database from 'better-sqlite3';

export type LiveStatus = 'LIVE' | 'OFFLINE';
export interface LiveState { guildId: string; channelId: string; messageId: string | null; status: LiveStatus; lastUpdated: string; }
export interface StreamSession { id: string; startedAt: string; endedAt: string | null; durationSeconds: number | null; source: string; destinationUrl: string | null; status: string; isTest: number; }

export class LiveRepository {
  private db: any;
  constructor(path: string) {
    this.db = new Database(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS live_stream_state (guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, message_id TEXT, status TEXT NOT NULL DEFAULT 'OFFLINE', last_updated TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS stream_sessions (id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, duration_seconds INTEGER, source TEXT NOT NULL, destination_url TEXT, status TEXT NOT NULL, is_test INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS stream_sessions_active ON stream_sessions(guild_id, status);`);
  }
  get(guildId: string) { return this.db.prepare('SELECT guild_id guildId, channel_id channelId, message_id messageId, status, last_updated lastUpdated FROM live_stream_state WHERE guild_id=?').get(guildId) as LiveState | undefined; }
  save(guildId: string, channelId: string, status: LiveStatus, messageId: string | null) { const now=new Date().toISOString(); this.db.prepare(`INSERT INTO live_stream_state (guild_id,channel_id,message_id,status,last_updated) VALUES (?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET channel_id=excluded.channel_id,message_id=excluded.message_id,status=excluded.status,last_updated=excluded.last_updated`).run(guildId,channelId,messageId,status,now); }
  activeSession(guildId: string) { return this.db.prepare(`SELECT id, started_at startedAt, ended_at endedAt, duration_seconds durationSeconds, source, destination_url destinationUrl, status, is_test isTest FROM stream_sessions WHERE guild_id=? AND status='LIVE' AND is_test=0 ORDER BY started_at DESC LIMIT 1`).get(guildId) as StreamSession | undefined; }
  startSession(guildId: string, source: string, destinationUrl: string | null) { const existing=this.activeSession(guildId); if(existing)return existing; const now=new Date().toISOString(); const count=(this.db.prepare(`SELECT COUNT(*) count FROM stream_sessions WHERE guild_id=? AND is_test=0`).get(guildId) as {count:number}).count+1; const session={id:`LIVE-${String(count).padStart(3,'0')}`,startedAt:now,endedAt:null,durationSeconds:null,source,destinationUrl,status:'LIVE',isTest:0}; this.db.prepare(`INSERT INTO stream_sessions (id,guild_id,started_at,source,destination_url,status,is_test,created_at,updated_at) VALUES (?,?,?,?,?,'LIVE',0,?,?)`).run(session.id,guildId,now,source,destinationUrl,now,now); console.log(`[LIVE] Session ${session.id} started`); return session; }
  endActiveSession(guildId: string) { const session=this.activeSession(guildId); if(!session)return undefined; const end=new Date(); const duration=Math.max(0,Math.round((end.getTime()-new Date(session.startedAt).getTime())/1000)); this.db.prepare(`UPDATE stream_sessions SET ended_at=?,duration_seconds=?,status='OFFLINE',updated_at=? WHERE id=?`).run(end.toISOString(),duration,end.toISOString(),session.id); console.log(`[LIVE] Session ${session.id} ended`); return {...session,endedAt:end.toISOString(),durationSeconds:duration,status:'OFFLINE'}; }
}
