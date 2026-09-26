import { ChannelType, Client, GatewayIntentBits } from 'discord.js';
import { config, requireDiscordConfig } from '../config.js';

requireDiscordConfig();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(config.guildId);
    const channels = await guild.channels.fetch();
    const category = channels.find(
      (channel) => channel?.type === ChannelType.GuildCategory && channel.name === 'LEARN TOGETHER',
    );

    if (!category) {
      console.log('LEARN TOGETHER category was already absent.');
      return;
    }

    const children = channels.filter((channel) => channel?.parentId === category.id);
    for (const channel of children.values()) {
      await channel?.delete('Removing retired LEARN TOGETHER category');
    }
    await category.delete('Removing retired LEARN TOGETHER category');
    console.log(`Removed LEARN TOGETHER and ${children.size} channel(s).`);
  } finally {
    client.destroy();
  }
});

await client.login(config.token);
