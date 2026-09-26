import { Client, Events, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config, requireDiscordConfig } from './config.js';
import { SignalStore } from './signals/store.js';
import { handleSignal } from './commands/signals.js';
import { ScreenshotSignalRepository } from './screenshot/repository.js';
import { setupScreenshotWorkflow, updateStatus, authorized } from './screenshot/discord.js';
import { MarketRepository } from './markets/repository.js';
import { marketEmbed, marketsEmbed, sessionsEmbed, startMarketScheduler } from './markets/discord.js';
import { LiveRepository } from './live/repository.js';
import { refreshLiveMessage, setLiveStatus, staff, toggleLiveAlerts } from './live/discord.js';
import { ObsService } from './live/obs.js';
import { PremiumRepository } from './premium/repository.js';
import { analyzeChart } from './premium/analyzer.js';
import { createCheckout, startStripeWebhook } from './premium/stripe.js';

requireDiscordConfig();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const signals = new SignalStore();
const screenshotSignals = new ScreenshotSignalRepository(config.databasePath);
const marketRepo = new MarketRepository(config.databasePath);
const liveRepo = new LiveRepository(config.databasePath);
const obs = new ObsService();
const premiumRepo = new PremiumRepository(config.databasePath);
await signals.load();
client.once(Events.ClientReady, ready => {
  console.log(`Connected as ${ready.user.tag} for ${config.communityName}`); startMarketScheduler(client, marketRepo); startStripeWebhook(premiumRepo,client);
  void refreshLiveMessage(client, liveRepo).catch(error => console.error('Live status refresh failed:', error.message));
  obs.start();
});
obs.onStreamChange = status => {
  if (status === 'UNKNOWN') return;
  void setLiveStatus(client, liveRepo, status, { notify: true }).catch(error => console.error('OBS live-state update failed:', error.message));
};
setupScreenshotWorkflow(client, screenshotSignals);
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'signal') return void await handleSignal(interaction, signals);
  if (interaction.commandName === 'markets') return void await interaction.reply({embeds:[marketsEmbed()]});
  if (interaction.commandName === 'sessions') return void await interaction.reply({embeds:[sessionsEmbed()]});
  if (interaction.commandName === 'market') return void await interaction.reply({embeds:[marketEmbed(interaction.options.getString('symbol',true))]});
  if (interaction.commandName === 'timezone') { const tz=interaction.options.getString('zone',true); marketRepo.timezone(interaction.user.id,tz); return void await interaction.reply({content:`Your market-timezone preference is set to **${tz}**.`,ephemeral:true}); }
  if (interaction.commandName === 'alerts') { const p=marketRepo.preferences(interaction.user.id); return void await interaction.reply({content:`🔔 Your market alerts\nForex: ${p.forex_alerts_enabled?'ON':'OFF'} • Open: ${p.open_alerts_enabled?'ON':'OFF'} • Close: ${p.close_alerts_enabled?'ON':'OFF'} • 60/30/15: ${p.alert_60_enabled?'ON':'OFF'}/${p.alert_30_enabled?'ON':'OFF'}/${p.alert_15_enabled?'ON':'OFF'}\nTimezone: ${p.timezone}`,ephemeral:true}); }
  if (interaction.commandName === 'premium') { const m=premiumRepo.membership(interaction.user.id), active=premiumRepo.active(interaction.user.id); if(active)return void await interaction.reply({content:`💎 **PREMIUM MEMBERSHIP**\n🟢 Active${m?.current_period_end?` until <t:${Math.floor(new Date(m.current_period_end).getTime()/1000)}:D>`:''}\n\nUse /mychart to receive a private educational chart analysis.`,ephemeral:true});try{const url=await createCheckout(interaction.user.id);return void await interaction.reply({content:'💎 **PREMIUM MEMBERSHIP**\nUnlock private educational chart analysis. Payment is handled securely by Stripe.',components:[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel('💎 GET PREMIUM'))],ephemeral:true});}catch{return void await interaction.reply({content:'💎 **PREMIUM MEMBERSHIP**\n🔒 Checkout is being configured. Please try again shortly.',ephemeral:true});} }
  if (interaction.commandName === 'myanalysis') { const rows=premiumRepo.history(interaction.user.id); return void await interaction.reply({content:rows.length?`🤖 **MY PRIVATE ANALYSIS HISTORY**\n${rows.map(r=>`#${r.id} • ${r.symbol||'Chart'} • ${r.timeframe||'Timeframe not detected'} • <t:${Math.floor(new Date(r.created_at).getTime()/1000)}:d>`).join('\n')}`:'🤖 No private analyses yet. Use `/mychart` with a chart screenshot.',ephemeral:true}); }
  if (interaction.commandName === 'mychart') { if(!premiumRepo.active(interaction.user.id)) return void await interaction.reply({content:'🔒 **PREMIUM FEATURE**\nPersonal AI Chart Analyzer is available only to active Premium members.',ephemeral:true}); const use=premiumRepo.canAnalyze(interaction.user.id); if(!use.ok)return void await interaction.reply({content:use.message,ephemeral:true}); const images=['chart','chart2','chart3'].map(n=>interaction.options.getAttachment(n)).filter((a):a is NonNullable<typeof a>=>Boolean(a)); if(images.some(a=>!['image/png','image/jpeg','image/webp'].includes(a.contentType||'')||a.size>config.maxChartImageMb*1024*1024))return void await interaction.reply({content:`Upload only PNG, JPG, JPEG, or WEBP images up to ${config.maxChartImageMb}MB.`,ephemeral:true}); await interaction.deferReply({ephemeral:true}); try{const text=await analyzeChart(images,interaction.options.getString('question'));premiumRepo.saveAnalysis(interaction.user.id,text);return void await interaction.editReply({content:`🤖 **PERSONAL AI CHART ANALYSIS**\n🔒 Private analysis\n\n${text}`.slice(0,1990)});}catch(error){console.error('Private chart analysis failed:',error instanceof Error?error.message:'unknown');return void await interaction.editReply('⚠️ I could not analyze that chart right now. Please try again.');} }
  const member = interaction.guild ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null) : null;
  if (interaction.commandName === 'livealerts') { if (!member) return void await interaction.reply({content:'Use this command inside the server.',ephemeral:true}); try { const enabled=await toggleLiveAlerts(member); return void await interaction.reply({content:enabled?'🔴 Live Alerts enabled. You will receive live notifications when the server uses that alert role.':'Live Alerts disabled.',ephemeral:true}); } catch (error) { return void await interaction.reply({content:`Could not update Live Alerts: ${error instanceof Error ? error.message : 'unknown error'}`,ephemeral:true}); } }
  if (interaction.commandName === 'live') { const action=interaction.options.getSubcommand(); if (!staff(member)) return void await interaction.reply({content:'Administrator or stream-manager role required.',ephemeral:true}); try { if (action==='status') { const state=liveRepo.get(config.guildId); const session=liveRepo.activeSession(config.guildId); const duration=session ? Math.max(0,Math.round((Date.now()-new Date(session.startedAt).getTime())/60000)) : null; const obsState=obs.connectionStatus==='CONNECTED' ? (obs.isLive()?'🔴 LIVE':'⚫ OFFLINE') : '⚪ Unknown'; return void await interaction.reply({content:`🎥 **LIVE STATUS**\nOBS Connection: ${obs.connectionStatus==='CONNECTED'?'🟢 Connected':'🔴 Disconnected'}\nOBS Streaming: ${obsState}\nDiscord Status: **${state?.status || 'OFFLINE'}**${session?`\nStream Started: <t:${Math.floor(new Date(session.startedAt).getTime()/1000)}:F>\nDuration: ${duration} minutes`:''}\nDestination: ${config.streamDestinationUrl?'Configured':'Not configured'}`,ephemeral:true}); } if(action==='test') { await setLiveStatus(client,liveRepo,'LIVE',{test:true,notify:config.liveTestMode}); await setLiveStatus(client,liveRepo,'OFFLINE',{test:true,notify:false}); return void await interaction.reply({content:'Safe live-panel test completed. No stream session or alert-role mention was created by default.',ephemeral:true}); } const observed=await obs.refresh(); if(observed!=='UNKNOWN') await setLiveStatus(client,liveRepo,observed,{notify:false}); else await refreshLiveMessage(client,liveRepo); return void await interaction.reply({content:`OBS checked and persistent LIVE panel reconciled. OBS is ${observed}.`,ephemeral:true}); } catch (error) { return void await interaction.reply({content:`Could not refresh live status: ${error instanceof Error ? error.message : 'unknown error'}`,ephemeral:true}); } }
  if (interaction.commandName === 'livetest') { if (!staff(member)) return void await interaction.reply({content:'Administrator or stream-manager role required.',ephemeral:true}); try { await setLiveStatus(client,liveRepo,'LIVE',{test:true,notify:config.liveTestMode}); await setLiveStatus(client,liveRepo,'OFFLINE',{test:true,notify:false}); return void await interaction.reply({content:'Safe live-panel test completed. No stream session or alert-role mention was created.',ephemeral:true}); } catch (error) { return void await interaction.reply({content:`Live test failed: ${error instanceof Error ? error.message : 'unknown error'}`,ephemeral:true}); } }
  if (['activate','tp','sl','breakeven','cancel','testsignal'].includes(interaction.commandName) && !authorized(member)) return void await interaction.reply({content:'Founder or Admin role required.',ephemeral:true});
  if (['activate','tp','sl','breakeven','cancel'].includes(interaction.commandName)) { const id=interaction.options.getInteger('id',true); const statuses={activate:'ACTIVE',tp:'TAKE PROFIT',sl:'STOP LOSS',breakeven:'BREAK EVEN',cancel:'CANCELLED'} as const; const status=statuses[interaction.commandName as keyof typeof statuses]; const ok=await updateStatus(screenshotSignals,id,status,client); return void await interaction.reply({content:ok?`SIGNAL #${String(id).padStart(3,'0')} is now ${status}.`:'Signal not found.',ephemeral:true}); }
  if (interaction.commandName === 'history') { const symbol=interaction.options.getString('symbol') || undefined; const rows=screenshotSignals.recent(symbol); return void await interaction.reply({embeds:[new EmbedBuilder().setColor(0x2b6cb0).setTitle(symbol?`${symbol.toUpperCase()} signal history`:'Signal history').setDescription(rows.length?rows.map((s) => `#${String(s.id).padStart(3,'0')} • ${s.symbol||'Unknown'} • ${s.direction||'?'} • ${s.status}`).join('\n'):'No signals yet.')]}); }
  if (interaction.commandName === 'stats') { const s=screenshotSignals.stats(), rate=s.total?((s.wins/s.total)*100).toFixed(1):'0.0'; return void await interaction.reply({embeds:[new EmbedBuilder().setColor(0x2b6cb0).setTitle('Signal statistics').setDescription('Educational outcome tracking only — no monetary-profit claims.').addFields({name:'Total / wins / losses / break-even',value:`${s.total} / ${s.wins||0} / ${s.losses||0} / ${s.breakeven||0}`},{name:'Win rate',value:`${rate}%`})]}); }
  if (interaction.commandName === 'testsignal') return void await interaction.reply({content:'Test signal command is installed. Upload a sample screenshot in #signal-upload to preview the exact workflow.',ephemeral:true});
});
client.on(Events.GuildMemberAdd, async member => {
  const newMember = member.guild.roles.cache.find(role => role.name === 'New Member');
  if (newMember) await member.roles.add(newMember).catch(() => undefined);
  const welcome = member.guild.channels.cache.find(channel => channel.name === 'welcome' && channel.isTextBased());
  if (welcome?.isTextBased()) await welcome.send(`Welcome ${member}! Please read #rules, then introduce yourself in #introductions.`).catch(() => undefined);
});
await client.login(config.token);
