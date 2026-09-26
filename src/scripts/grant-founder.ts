import { Client, GatewayIntentBits } from 'discord.js';
import { config, requireDiscordConfig } from '../config.js';

requireDiscordConfig();
const target = process.argv[2]?.replace(/^@/, '').toLowerCase();
if (!target) throw new Error('Usage: npm run grant-founder -- @discord-username');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(config.guildId);
    const members = await guild.members.fetch({ query: target, limit: 10 });
    const member = members.find(m => [m.user.username, m.user.globalName, m.displayName].some(value => value?.toLowerCase() === target));
    const founder = guild.roles.cache.find(role => role.name === 'Founder');
    if (!member || !founder) throw new Error('Founder role or matching member was not found.');
    await member.roles.add(founder, 'Server owner granted founder access');
    console.log(`Granted Founder to ${member.user.username}.`);
  } finally { client.destroy(); }
});
await client.login(config.token);
