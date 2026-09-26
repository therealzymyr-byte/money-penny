import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Client, type GuildMember, type TextChannel } from 'discord.js';
import { config } from '../config.js';
import { LiveRepository, type LiveStatus } from './repository.js';

const staff = (member: GuildMember | null) => Boolean(member?.permissions.has('Administrator') || member?.roles.cache.some(role => ['Founder', 'Admin', 'Signal Provider'].includes(role.name) || role.id === config.streamManagerRoleId));
const liveChannel = (client: Client) => { const guild=client.guilds.cache.get(config.guildId); const configured=config.liveChannelId ? guild?.channels.cache.get(config.liveChannelId) : undefined; const channel=configured || guild?.channels.cache.find(item=>item.name==='live-stream'); return channel?.isTextBased() && 'send' in channel ? channel as TextChannel : null; };
const joinButton = () => config.streamDestinationUrl ? [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(config.streamDestinationUrl).setLabel('🔗 JOIN LIVE'))] : [];
function payload(status: LiveStatus) { const live=status==='LIVE'; return { embeds:[new EmbedBuilder().setColor(live?0xe53e3e:0x5865f2).setTitle(live?'🔴 WE’RE LIVE!':'🎥 LIVE STREAM').setDescription(live?'The trading session is now live.\n\nCome watch the session and learn together.':'⚫ **CURRENTLY OFFLINE**\n\nThe stream isn’t live right now. When the stream starts, this panel will automatically update.\n\n🔔 **LIVE ALERTS**').setFooter({text:'OBS-powered stream status • Education only'}).setTimestamp()], components: joinButton() }; }

export async function refreshLiveMessage(client: Client, repo: LiveRepository, status?: LiveStatus) {
  const channel=liveChannel(client); if(!channel) throw new Error('Could not find the configured live channel. Set DISCORD_LIVE_CHANNEL_ID.');
  const old=repo.get(config.guildId); const next=status || old?.status || 'OFFLINE'; const existing=old?.messageId ? await channel.messages.fetch(old.messageId).catch(()=>null) : null; const data=payload(next); const message=existing ? await existing.edit(data) : await channel.send(data);
  repo.save(config.guildId,channel.id,next,message.id); return {previous:old?.status||'OFFLINE',status:next};
}
export async function setLiveStatus(client: Client, repo: LiveRepository, status: LiveStatus, options: {notify?:boolean; test?:boolean} = {}) {
  const previous=repo.get(config.guildId)?.status || 'OFFLINE'; const changed=previous!==status;
  if(changed && status==='LIVE' && !options.test) repo.startSession(config.guildId,'OBS',config.streamDestinationUrl||null);
  if(changed && status==='OFFLINE' && !options.test) repo.endActiveSession(config.guildId);
  const result=await refreshLiveMessage(client,repo,status);
  if(changed && status==='LIVE' && options.notify) await sendLiveNotification(client);
  if(changed && status==='OFFLINE' && options.notify && config.sendStreamEndNotification) await sendEndNotification(client);
  console.log(`[LIVE] Discord status changed to ${status}`); return result;
}
async function notificationChannel(client: Client) { const guild=client.guilds.cache.get(config.guildId); const channel=config.liveAlertChannelId ? guild?.channels.cache.get(config.liveAlertChannelId) : undefined; return channel?.isTextBased() && 'send' in channel ? channel as TextChannel : null; }
async function sendLiveNotification(client: Client) { const channel=await notificationChannel(client); if(!channel) return; const mention=config.liveAlertRoleId?`<@&${config.liveAlertRoleId}> `:''; await channel.send({content:`${mention}🔴 **WE'RE LIVE!**\nThe trading session has started. Come join us:`,components:joinButton(),allowedMentions:{roles:config.liveAlertRoleId?[config.liveAlertRoleId]:[]}}); console.log('[LIVE] Notification sent'); }
async function sendEndNotification(client: Client) { const channel=await notificationChannel(client); if(channel) await channel.send('⚫ **STREAM ENDED**\nThe live session has ended. Thanks for watching!'); }
export async function toggleLiveAlerts(member: GuildMember) { const role=member.guild.roles.cache.find(item=>item.name==='Live Alerts'); if(!role) throw new Error('Live Alerts role is missing. Run provisioning.'); if(member.roles.cache.has(role.id)){await member.roles.remove(role);return false;} await member.roles.add(role);return true; }
export { staff };
