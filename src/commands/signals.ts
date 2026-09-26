import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { SignalStore } from '../signals/store.js';
import { signalEmbed } from '../signals/format.js';
import type { SignalStatus } from '../signals/types.js';

const statusChoices = ['TP1 HIT', 'TP2 HIT', 'STOP LOSS HIT', 'BREAK-EVEN', 'CANCELLED'] as const;
export const signalCommand = new SlashCommandBuilder().setName('signal').setDescription('Create, update, or review educational trade analyses')
  .addSubcommand(s => s.setName('create').setDescription('Post a new analysis').addStringOption(o => o.setName('market').setDescription('e.g. XAUUSD').setRequired(true)).addStringOption(o => o.setName('direction').setDescription('BUY or SELL').setRequired(true).addChoices({ name: 'BUY', value: 'BUY' }, { name: 'SELL', value: 'SELL' })).addNumberOption(o => o.setName('entry').setDescription('Entry').setRequired(true)).addNumberOption(o => o.setName('stop_loss').setDescription('Stop loss').setRequired(true)).addNumberOption(o => o.setName('tp1').setDescription('Take profit 1').setRequired(true)).addNumberOption(o => o.setName('rr').setDescription('Risk/reward number, e.g. 2').setRequired(true)).addStringOption(o => o.setName('timeframe').setDescription('e.g. 15M').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Why this setup exists').setRequired(true)).addNumberOption(o => o.setName('tp2').setDescription('Take profit 2')))
  .addSubcommand(s => s.setName('update').setDescription('Update a signal status').addIntegerOption(o => o.setName('id').setDescription('Signal number').setRequired(true)).addStringOption(o => o.setName('status').setDescription('New status').setRequired(true).addChoices(...statusChoices.map(value => ({ name: value, value })))))
  .addSubcommand(s => s.setName('stats').setDescription('View non-monetary signal statistics'));

async function canManageSignals(interaction: ChatInputCommandInteraction) {
  if (interaction.memberPermissions?.has('ManageMessages')) return true;
  const member = interaction.guild ? await interaction.guild.members.fetch(interaction.user.id).catch(() => undefined) : undefined;
  return member?.roles.cache.some(role => role.name === 'Signal Provider') ?? false;
}

export async function handleSignal(interaction: ChatInputCommandInteraction, store: SignalStore) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'create') {
    if (!await canManageSignals(interaction)) return interaction.reply({ content: 'Only staff or Signal Providers may publish analyses.', ephemeral: true });
    const signal = store.add({ market: interaction.options.getString('market', true), direction: interaction.options.getString('direction', true) as 'BUY' | 'SELL', entry: interaction.options.getNumber('entry', true), stopLoss: interaction.options.getNumber('stop_loss', true), tp1: interaction.options.getNumber('tp1', true), tp2: interaction.options.getNumber('tp2') ?? undefined, rr: interaction.options.getNumber('rr', true), timeframe: interaction.options.getString('timeframe', true), reason: interaction.options.getString('reason', true) }); await store.save(); return interaction.reply({ embeds: [signalEmbed(signal)] });
  }
  if (sub === 'update') { if (!await canManageSignals(interaction)) return interaction.reply({ content: 'Only staff or Signal Providers may update analyses.', ephemeral: true }); const item = store.update(interaction.options.getInteger('id', true), interaction.options.getString('status', true) as SignalStatus); if (!item) return interaction.reply({ content: 'Signal not found.', ephemeral: true }); await store.save(); return interaction.reply({ content: `Signal #${item.id} updated.`, embeds: [signalEmbed(item)] }); }
  const s = store.stats(); return interaction.reply({ embeds: [{ title: 'Signal Statistics', color: 0x2b6cb0, description: 'Outcome tracking only — no monetary-profit claims.', fields: [{ name: 'Total / Wins / Losses / BE', value: `${s.total} / ${s.wins} / ${s.losses} / ${s.breakeven}` }, { name: 'Win rate / Average R:R', value: `${s.winRate.toFixed(1)}% / 1:${s.avgRR.toFixed(2)}` }, { name: 'Markets', value: s.markets.join(', ') || 'No signals yet' }, { name: 'Timeframes', value: s.timeframes.join(', ') || 'No signals yet' }] }] });
}
