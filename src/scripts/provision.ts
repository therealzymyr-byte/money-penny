import { ChannelType, Client, GatewayIntentBits, PermissionFlagsBits, type TextChannel } from 'discord.js';
import { config, requireDiscordConfig } from '../config.js';
import { categories, roles, textChannelOptions } from '../server/blueprint.js';
import { rulesMessage, signalTemplate, welcomeMessage } from '../content/messages.js';
requireDiscordConfig();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', async () => {
  const guild = await client.guilds.fetch(config.guildId);
  await guild.fetch();
  await guild.roles.fetch();
  await guild.channels.fetch();
  if (guild.name !== config.communityName) await guild.setName(config.communityName);
  for (const roleName of roles) {
    if (!guild.roles.cache.find(r => r.name === roleName)) await guild.roles.create({ name: roleName, reason: 'Trading community foundation' });
  }
  const premiumRole = guild.roles.cache.find(r => r.name === 'Premium Member');
  const founderRole = guild.roles.cache.find(r => r.name === 'Founder');
  const adminRole = guild.roles.cache.find(r => r.name === 'Admin');
  const signalProviderRole = guild.roles.cache.find(r => r.name === 'Signal Provider');
  if (founderRole) await founderRole.setPermissions([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages]);
  for (const [categoryName, channelNames] of categories) {
    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === categoryName);
    if (!category) category = await guild.channels.create({ name: categoryName, type: ChannelType.GuildCategory });
    for (const channelName of channelNames) {
      let channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === channelName) as TextChannel | undefined;
      if (!channel) channel = await guild.channels.create(textChannelOptions(channelName, category.id, guild.roles.everyone.id));
      if (channel.parentId !== category.id) await channel.setParent(category.id);
      if (channelName.startsWith('premium-') || channelName === 'live-trading') {
        await channel.permissionOverwrites.edit(client.user!.id, { ViewChannel: true, SendMessages: true });
        await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
        if (premiumRole) await channel.permissionOverwrites.edit(premiumRole, { ViewChannel: true, SendMessages: true });
      }
      if (channelName === 'signal-upload') {
        await channel.permissionOverwrites.edit(client.user!.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false, SendMessages: false });
        if (founderRole) await channel.permissionOverwrites.edit(founderRole, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
        if (adminRole) await channel.permissionOverwrites.edit(adminRole, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
        if (signalProviderRole) await channel.permissionOverwrites.delete(signalProviderRole).catch(() => undefined);
      }
    }
  }
  const post = async (name: string, message: string) => { const ch = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === name); if (ch?.isTextBased() && 'send' in ch && !ch.lastMessageId) await ch.send(message); };
  await post('welcome', welcomeMessage(config.communityName)); await post('rules', rulesMessage); await post('signals', signalTemplate);
  console.log(`Provisioned ${guild.name}. Review role hierarchy and channel permissions in Discord.`); client.destroy();
});
await client.login(config.token);
