import { ChannelType, PermissionFlagsBits } from 'discord.js';

export const roles = ['Founder', 'Admin', 'Moderator', 'Signal Provider', 'Learning Together', 'Premium Member', 'Live Alerts', 'Member', 'New Member'] as const;
export const premiumChannels = ['premium-signals', 'premium-market-analysis', 'live-trading', 'premium-q-and-a'];

export const categories = [
  ['START HERE', ['welcome', 'rules', 'announcements', 'introductions', 'trading-goals']],
  ['MARKETS', ['daily-watchlist', 'market-alerts', 'xauusd', 'forex', 'crypto', 'chart-analysis', 'trade-ideas']],
  ['SIGNALS', ['signals', 'signal-upload', 'signal-updates', 'signal-results', 'trade-recaps']],
  ['JOURNAL', ['my-trades', 'winning-trades', 'losing-trades', 'lessons-learned']],
  ['COMMUNITY', ['general', 'beginner-questions', 'chart-check', 'off-topic']],
  ['LIVE STREAM', ['live-stream']],
  ['PREMIUM', premiumChannels],
] as const;

export const channelTopics: Record<string, string> = {
  welcome: 'Start here: community purpose, expectations, and risk disclosure.', rules: 'Read before participating.', announcements: 'Community updates from the team.', introductions: 'Introduce yourself and your learning goals.', 'trading-goals': 'Set goals and keep each other accountable.',
  signals: 'Analysis shared for education only — never financial advice or guaranteed outcomes.', 'signal-upload': 'Private screenshot uploads for Founder and Admin only. Money Penny asks for confirmation before publishing.', 'signal-updates': 'Status changes for published analyses.', 'signal-results': 'Transparent outcomes and statistics, including losses.', 'trade-recaps': 'What worked, what did not, and what we learned.',
  'daily-watchlist': 'Markets and levels to study today.', 'my-trades': 'Personal trade journals — process over profit.',
  'market-alerts': 'Timezone-aware session status and market alerts. Informational only; broker hours can differ.',
  'live-stream': 'TikTok live-stream status and link. Live sessions are for education and community discussion only.',
};

export const premiumOverwrites = (everyoneId: string) => [{ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] }];
export const textChannelOptions = (name: string, parent: string, _everyoneId: string) => ({ name, type: ChannelType.GuildText as const, parent, topic: channelTopics[name] || `${name.replaceAll('-', ' ')} discussion.` });
