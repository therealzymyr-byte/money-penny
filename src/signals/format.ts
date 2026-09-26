import { EmbedBuilder } from 'discord.js';
import type { Signal } from './types.js';

export const signalEmbed = (signal: Signal) => new EmbedBuilder()
  .setTitle(`${signal.market.toUpperCase()} · ${signal.direction} · #${signal.id}`)
  .setColor(signal.status === 'ACTIVE' ? 0x2b6cb0 : signal.status.includes('HIT') && !signal.status.includes('LOSS') ? 0x2f855a : 0x718096)
  .addFields(
    { name: 'Entry', value: String(signal.entry), inline: true }, { name: 'Stop Loss', value: String(signal.stopLoss), inline: true },
    { name: 'TP1', value: String(signal.tp1), inline: true }, { name: 'TP2', value: signal.tp2 ? String(signal.tp2) : '—', inline: true },
    { name: 'Risk/Reward', value: `1:${signal.rr}`, inline: true }, { name: 'Timeframe', value: signal.timeframe.toUpperCase(), inline: true },
    { name: 'Reason', value: signal.reason }, { name: 'Status', value: signal.status }
  )
  .setFooter({ text: 'Educational analysis only · Not financial advice · Outcomes are not guaranteed' })
  .setTimestamp(new Date(signal.updatedAt));
