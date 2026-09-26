import { instruments, sessions, type SessionConfig } from './config.js';
export type SessionStatus={session:SessionConfig; open:boolean; next:Date; minutes:number};
const parts=(date:Date,tz:string)=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
const minutes=(value:string)=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
const business=(d:Date,tz:string)=>{const p=parts(d,tz);return p.weekday!=='Sat'&&p.weekday!=='Sun';};
export class MarketSessionService {
  status(session:SessionConfig, now=new Date()):SessionStatus { const p=parts(now,session.timezone), minute=Number(p.hour)*60+Number(p.minute), open=business(now,session.timezone)&&minute>=minutes(session.open)&&minute<minutes(session.close); const target=this.nextEvent(session,now,open); return {session,open,next:target,minutes:Math.max(0,Math.ceil((target.getTime()-now.getTime())/60000))}; }
  all(now=new Date()){return sessions.filter(s=>s.enabled).map(s=>this.status(s,now));}
  private nextEvent(session:SessionConfig,now:Date,open:boolean){const wantOpen=!open; for(let i=1;i<=60*24*8;i++){const t=new Date(now.getTime()+i*60000), p=parts(t,session.timezone), min=Number(p.hour)*60+Number(p.minute); if(wantOpen?business(t,session.timezone)&&min===minutes(session.open):business(t,session.timezone)&&min===minutes(session.close))return t;} return now;}
  isWeekend(now=new Date()){const p=parts(now,'America/New_York');return p.weekday==='Sat'||p.weekday==='Sun';}
  instrument(symbol:string,now=new Date()){const item=instruments[symbol.toUpperCase()]; if(!item)return undefined; const relevant=this.all(now).filter(s=>item.sessions.includes(s.session.id)); return {item,relevant};}
  overlaps(now=new Date()){const open=this.all(now).filter(s=>s.open); return open.filter((a,i)=>open.slice(i+1).map(b=>[a,b] as const)).flat();}
  format(date:Date,tz='America/New_York'){return new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date);}
}
