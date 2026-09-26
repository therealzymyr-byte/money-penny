import { Client, GatewayIntentBits } from 'discord.js';
import { config, requireDiscordConfig } from '../config.js';

requireDiscordConfig();
const target = process.argv[2]?.replace(/^@/, '').toLowerCase();
if (!target) throw new Error('Usage: npm run grant-admin -- @discord-username');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(config.guildId);
    const members = await guild.members.fetch({ query: target, limit: 10 });
    const member = members.find(m => [m.user.username, m.user.globalName, m.displayName].some(value => value?.toLowerCase() === target));
    if (!member) throw new Error(`No server member matched @${target}.`);
    const admin = guild.roles.cache.find(role => role.name === 'Admin');
    if (!admin) throw new Error('Admin role does not exist. Run npm run provision first.');
    await member.roles.add(admin, 'Server owner granted admin access');
    console.log(`Granted Admin to ${member.user.username}.`);
  } finally { client.destroy(); }
});
await client.login(config.token);
