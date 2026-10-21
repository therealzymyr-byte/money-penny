import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Events, PermissionFlagsBits, type Client } from 'discord.js';
import { config } from '../config.js';

const OPEN = 'private_ticket_open_v1';
const CLOSE = 'private_ticket_close_v1';
const prefix = 'Private question ticket for Discord user ';
const pending = new Set<string>();

export function setupPrivateTickets(client: Client) {
  client.once(Events.ClientReady, () => { void ensurePanel(client).catch(error => console.error('Ticket panel setup failed:', error)); });
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() || ![OPEN, CLOSE].includes(interaction.customId) || !interaction.guild) return;
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const key = guild.id + ':' + interaction.user.id;
    if (interaction.customId === OPEN && pending.has(key)) { await interaction.editReply('Your ticket is being created. Please wait.'); return; }
    if (interaction.customId === OPEN) pending.add(key);
    try {
      if (interaction.customId === CLOSE) {
        const channel = interaction.channel;
        if (interaction.user.id !== guild.ownerId || !channel || channel.type !== ChannelType.GuildText || !channel.topic?.startsWith(prefix)) {
          await interaction.editReply('Only the server owner can close a ticket.'); return;
        }
        const requester = channel.topic.slice(prefix.length);
        if (!/^\d{17,20}$/.test(requester)) { await interaction.editReply('Could not identify the ticket owner.'); return; }
        await channel.permissionOverwrites.edit(requester, { ViewChannel: false });
        await channel.send('This ticket has been closed by the server owner.');
        await interaction.editReply('Ticket closed. The conversation is retained for the server owner.'); return;
      }
      const existing = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText && channel.topic === prefix + interaction.user.id && channel.permissionOverwrites.cache.get(interaction.user.id)?.allow.has(PermissionFlagsBits.ViewChannel));
      if (existing) { await interaction.editReply('You already have an open ticket: <#' + existing.id + '>'); return; }
      const panel = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText && channel.name === 'ask-privately');
      if (!panel) { await interaction.editReply('Ticket channel is not configured yet.'); return; }
      const channel = await guild.channels.create({
        name: 'ticket-' + interaction.user.id.slice(-6), type: ChannelType.GuildText, parent: panel.parentId,
        topic: prefix + interaction.user.id,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: client.user!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
        ], reason: 'Private member question',
      });
      const close = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(CLOSE).setLabel('Close ticket (owner)').setStyle(ButtonStyle.Secondary));
      await channel.send({ content: '<@' + guild.ownerId + '> <@' + interaction.user.id + '>\nPlease type your question here. Server administrators can also access private channels. Never share passwords, API keys, or account credentials.', components: [close], allowedMentions: { users: [guild.ownerId, interaction.user.id] } });
      await interaction.editReply('Your private ticket is ready: <#' + channel.id + '>');
    } catch (error) {
      console.error('Ticket interaction failed:', error);
      await interaction.editReply('Could not complete the ticket. Please contact the server owner directly.');
    } finally { if (interaction.customId === OPEN) pending.delete(key); }
  });
}

async function ensurePanel(client: Client) {
  const guild = client.guilds.cache.get(config.guildId);
  const channel = guild?.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === 'ask-privately');
  if (!channel || channel.type !== ChannelType.GuildText) return;
  const recent = await channel.messages.fetch({ limit: 50 });
  if (recent.some(message => message.author.id === client.user?.id && message.components.some(row => 'components' in row && row.components.some(component => 'customId' in component && component.customId === OPEN)))) return;
  const panel = new EmbedBuilder().setTitle('Ask a private question').setDescription('Press the button to open a private conversation with the server owner. Server administrators may also have access. Never share passwords, API keys, or account credentials.');
  const button = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(OPEN).setLabel('Open private ticket').setStyle(ButtonStyle.Primary));
  await channel.send({ embeds: [panel], components: [button] });
}
