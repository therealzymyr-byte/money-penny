import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle, type Client, type GuildMember, type Message, type ButtonInteraction, type ModalSubmitInteraction } from 'discord.js';
import { config } from '../config.js';
import { riskReward } from './math.js';
import { ScreenshotSignalRepository } from './repository.js';
import { analyzeScreenshots } from './vision.js';
import type { ExtractedSignal, SignalStatus, StoredSignal } from './types.js';

const drafts = new Map<string, { authorId:string; fields:ExtractedSignal; urls:string[] }>();
const allowed = new Set(['image/jpeg','image/png','image/webp']);
export function authorized(member: GuildMember | null) { return Boolean(member?.roles.cache.some(r => r.name === 'Founder' || r.name === 'Admin')); }
const display = (s: ExtractedSignal, label='PREVIEW') => new EmbedBuilder().setColor(0x1f8b4c).setTitle(`Money Penny • ${label}`).setDescription('Analysis only — not financial advice. You are responsible for your own risk.')
  .addFields({name:'Symbol',value:s.symbol || 'Not detected',inline:true},{name:'Direction',value:s.direction || 'Not detected',inline:true},{name:'Timeframe',value:s.timeframe || 'Not detected',inline:true},{name:'Entry',value:s.entryPrice?.toString() || 'Not detected',inline:true},{name:'Stop Loss',value:s.stopLoss?.toString() || 'Not detected',inline:true},{name:'Lot Size',value:s.lotSize?.toString() || 'Not detected',inline:true},{name:'Take Profits',value:s.takeProfits.length ? s.takeProfits.map((t,i)=>`TP${i+1}: ${t}`).join('\n') : 'Not detected',inline:true},{name:'Risk / Reward',value:(riskReward(s.entryPrice,s.stopLoss,s.takeProfits[0] ?? null,s.direction)?.toString() || 'Not available'),inline:true},{name:'Note',value:s.note || 'No extra note detected'});
const buttons = (id:string) => new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`publish:${id}`).setLabel('Publish').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId(`edit:${id}`).setLabel('Edit').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId(`cancel:${id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger));

export function setupScreenshotWorkflow(client: Client, repo: ScreenshotSignalRepository) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.channel.isTextBased() || !('name' in message.channel) || message.channel.name !== 'signal-upload' || !message.guild) return;
    if (!authorized(message.member)) { await message.reply('Only the Founder or an Admin can upload and publish signals here.'); return; }
    const images = [...message.attachments.values()].filter(a => allowed.has(a.contentType || '') || /\.(jpe?g|png|webp)$/i.test(a.name || ''));
    if (!images.length) { await message.reply('Upload a JPG, JPEG, PNG, or WebP screenshot.'); return; }
    try { await message.react('⏳'); const fields = await analyzeScreenshots(config.openaiApiKey || '', config.visionModel, images); const id = crypto.randomUUID(); drafts.set(id,{authorId:message.author.id,fields,urls:images.map(a=>a.url)}); const dm=await message.author.createDM(); await dm.send({content:'Your private signal preview is ready. Nothing has been posted publicly.',embeds:[display(fields)],components:[buttons(id)]}); await message.react('✅'); }
    catch (error) { await message.reply(`I could not analyse that screenshot: ${error instanceof Error ? error.message : 'unknown error'}`); }
  });
  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (interaction.isButton()) await handleButton(interaction,repo);
      if (interaction.isModalSubmit()) await handleModal(interaction);
    } catch (error) {
      console.error('Screenshot workflow interaction failed:', error);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) await interaction.reply({ content: 'I could not publish that signal. Please upload the screenshot again and retry.', ephemeral: true }).catch(() => undefined);
    }
  });
}
async function handleButton(i: ButtonInteraction, repo: ScreenshotSignalRepository) { const [action,id]=i.customId.split(':'); const draft=drafts.get(id); if (!draft || draft.authorId!==i.user.id) return void await i.reply({content:'This preview is no longer available.',ephemeral:true});
  if(action==='cancel'){drafts.delete(id); return void await i.update({content:'Cancelled. Nothing was published.',embeds:[],components:[]});}
  if(action==='edit'){const m=new ModalBuilder().setCustomId(`editmodal:${id}`).setTitle('Edit signal'); const data=[['symbol','Symbol',draft.fields.symbol||''],['direction','Direction (BUY/SELL)',draft.fields.direction||''],['entry','Entry',String(draft.fields.entryPrice||'')],['sl','Stop loss',String(draft.fields.stopLoss||'')],['tp','Take profits (comma-separated)',draft.fields.takeProfits.join(',')]]; m.addComponents(...data.map(([key,label,value])=>new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId(key).setLabel(label).setValue(value).setStyle(TextInputStyle.Short).setRequired(false)))); return void await i.showModal(m);}
  const signal=repo.create({...draft.fields,status:'WAITING FOR ENTRY',screenshotUrls:draft.urls,authorId:i.user.id,isTest:false}); const guild=clientGuild(i); const channel=guild?.channels.cache.find(c=>c.name==='signals' && c.isTextBased()); if(!channel?.isTextBased() || !('send' in channel)) return void await i.reply({content:'Could not find #signals.',ephemeral:true}); const payload:any={embeds:[display(signal,`SIGNAL #${String(signal.id).padStart(3,'0')} • WAITING FOR ENTRY`)]}; if(config.showScreenshotWithSignal) payload.files=signal.screenshotUrls.map(u=>new AttachmentBuilder(u)); const posted=await channel.send(payload); repo.update(signal.id,'WAITING FOR ENTRY',posted.id); drafts.delete(id); await i.update({content:`Published as SIGNAL #${String(signal.id).padStart(3,'0')}.`,embeds:[],components:[]}); }
function clientGuild(i: ButtonInteraction){return i.client.guilds.cache.get(config.guildId);}
async function handleModal(i: ModalSubmitInteraction){const id=i.customId.split(':')[1],d=drafts.get(id); if(!d||d.authorId!==i.user.id)return void await i.reply({content:'Preview expired.',ephemeral:true}); const f=i.fields; d.fields={...d.fields,symbol:f.getTextInputValue('symbol').trim().toUpperCase()||null,direction:(f.getTextInputValue('direction').trim().toUpperCase() as any)||null,entryPrice:num(f.getTextInputValue('entry')),stopLoss:num(f.getTextInputValue('sl')),takeProfits:f.getTextInputValue('tp').split(',').map(num).filter((n):n is number=>n!==null)}; await i.reply({content:'Updated preview — use the original buttons to publish, edit again, or cancel.',embeds:[display(d.fields)],ephemeral:true});}
function num(v:string){const n=Number(v.trim()); return Number.isFinite(n)&&n>0?n:null;}
export async function updateStatus(repo: ScreenshotSignalRepository,id:number,status:SignalStatus,client:Client){const s=repo.update(id,status); if(!s) return false; const ch=client.guilds.cache.get(config.guildId)?.channels.cache.find(c=>c.name==='signals'&&c.isTextBased()); if(ch?.isTextBased()&&'messages'in ch&&s.messageId){const m=await ch.messages.fetch(s.messageId).catch(()=>null); await m?.edit({embeds:[display(s,`SIGNAL #${String(id).padStart(3,'0')} • ${status}`)]});} return true;}
