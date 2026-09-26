import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN ?? '',
  clientId: process.env.DISCORD_CLIENT_ID ?? '',
  guildId: process.env.DISCORD_GUILD_ID ?? '',
  communityName: process.env.COMMUNITY_NAME || '[TRADING COMMUNITY NAME]',
  signalStorePath: process.env.SIGNAL_STORE_PATH || './data/signals.json',
  databasePath: process.env.SIGNAL_DATABASE_PATH || './data/signals.sqlite',
  openaiApiKey: process.env.OPENAI_API_KEY,
  visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
  showScreenshotWithSignal: process.env.SHOW_SCREENSHOT_WITH_SIGNAL === 'true',
  // LIVE_CHANNEL_ID aliases are retained for existing installations.
  liveChannelId: process.env.DISCORD_LIVE_CHANNEL_ID || process.env.LIVE_CHANNEL_ID || '',
  liveAlertChannelId: process.env.DISCORD_LIVE_NOTIFICATION_CHANNEL_ID || process.env.LIVE_ALERT_CHANNEL_ID || '',
  liveAlertRoleId: process.env.DISCORD_LIVE_ALERT_ROLE_ID || process.env.LIVE_ALERT_ROLE_ID || '',
  streamDestinationUrl: process.env.STREAM_DESTINATION_URL || '',
  streamManagerRoleId: process.env.DISCORD_STREAM_MANAGER_ROLE_ID || '',
  sendStreamEndNotification: process.env.SEND_STREAM_END_NOTIFICATION === 'true',
  liveTestMode: process.env.LIVE_TEST_MODE === 'true',
  obsHost: process.env.OBS_WS_HOST || '127.0.0.1',
  obsPort: Number(process.env.OBS_WS_PORT || 4455),
  obsPassword: process.env.OBS_WS_PASSWORD || '',
  premiumRoleId: process.env.PREMIUM_ROLE_ID || '', premiumRoleName: process.env.PREMIUM_ROLE_NAME || 'Premium Member',
  premiumDailyLimit: Number(process.env.PREMIUM_DAILY_ANALYSIS_LIMIT || 10), premiumMonthlyLimit: Number(process.env.PREMIUM_MONTHLY_ANALYSIS_LIMIT || 200), premiumCooldownSeconds: Number(process.env.AI_ANALYSIS_COOLDOWN_SECONDS || 30), maxChartImageMb: Number(process.env.MAX_CHART_IMAGE_MB || 10),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '', stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '', stripePremiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID || '', stripeSuccessUrl: process.env.STRIPE_SUCCESS_URL || '', stripeCancelUrl: process.env.STRIPE_CANCEL_URL || '',
  // Hosting providers such as Render provide PORT; use it for the webhook server.
  stripeWebhookPort: Number(process.env.PORT || process.env.STRIPE_WEBHOOK_PORT || 8787),
};

export function requireDiscordConfig() {
  const absent = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'].filter((key) => !process.env[key]);
  if (absent.length) throw new Error(`Missing required environment variables: ${absent.join(', ')}`);
}
