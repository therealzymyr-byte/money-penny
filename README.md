# [TRADING COMMUNITY NAME] — Discord Foundation

A transparent, beginner-friendly Discord community bot and provisioner for a trading study group. The community message is deliberately clear: learn together, review wins **and** losses, and never treat shared analysis as guaranteed profit or financial advice.

## What this creates

- The requested seven category structure and all requested text channels.
- The requested roles: Founder, Admin, Moderator, Signal Provider, Learning Together, Premium Member, Member, and New Member.
- Private `PREMIUM` channels that normal members cannot see. Premium access is granted only through the `Premium Member` role.
- Seeded welcome, rules, and standardized signal-format messages.
- A private screenshot-to-signal workflow in `#signal-upload`: AI extraction, private Preview / Edit / Cancel / Publish confirmation, SQLite storage, and non-monetary status tracking.
- Local, non-monetary signal tracking: totals, wins, losses, break-even results, win rate, average R:R, markets, and timeframes. The storage layer is isolated so it can later be replaced with a database/dashboard.
- Join welcome messages and automatic `New Member` assignment (once Discord's Server Members Intent is enabled).

## Requirements

- Node.js 20 or newer. Download it from [nodejs.org](https://nodejs.org/).
- A Discord server where you have **Manage Server** permission.
- A Discord application and bot created in the [Discord Developer Portal](https://discord.com/developers/applications).

## Discord configuration (manual)

1. In the Developer Portal, create an application and add a **Bot**.
2. Under **Bot → Privileged Gateway Intents**, enable **Server Members Intent** and **Message Content Intent**. These power welcome messages and screenshot uploads.
3. Copy the bot token; never post it in chat or commit it to Git.
4. Under **OAuth2 → URL Generator**, select scopes `bot` and `applications.commands`. Give the bot permissions to Manage Roles, Manage Channels, Manage Messages, Send Messages, Embed Links, Read Message History, and View Channels. Open the generated URL and invite it to your server.
5. In Discord, enable Developer Mode (User Settings → Advanced), then right-click your server and choose **Copy Server ID**.
6. Move the bot's highest role above roles it must assign. Confirm the bot is allowed to see and send in the channels it administers.
7. After provisioning, assign yourself the `Founder` role and place it above staff/member roles. Review permissions before inviting members; the provisioner does not change the server owner's permissions.

## Local setup and run

From this project directory:

```bash
cp .env.example .env
# Edit .env: add DISCORD_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID
npm install
npm run register
npm run provision
npm run dev
```

`npm run register` installs slash commands quickly. `npm run provision` safely creates missing roles/channels, including private `#signal-upload`. `npm run start` runs the bot; `npm run check` type-checks it.

## Signal workflow

Only Founder and **Admin** members can access or upload JPG/JPEG/PNG/WebP screenshots in private `#signal-upload`. Money Penny extracts only visibly present fields and sends the uploader a private preview. Nothing posts publicly until they press **Publish**. Every published screenshot signal is assigned `SIGNAL #001` onward and begins `WAITING FOR ENTRY`.

Use `/activate`, `/tp`, `/sl`, `/breakeven`, or `/cancel` with the signal ID to edit the original message. `/history [symbol]` and `/stats` report transparent, non-monetary results. The manual `/signal` command remains as a backup.

Give contributors the **Signal Provider** role to let them publish and update analysis without giving them broad moderation privileges.

## Architecture and extension points

```
src/
  server/blueprint.ts       server categories, channels, roles, access defaults
  content/messages.ts       editable welcome, rules, and signal copy
  commands/signals.ts       slash-command interface
  screenshot/              image extraction, private confirmation, SQLite repository
  signals/types.ts          domain model and allowed statuses
  scripts/provision.ts      idempotent Discord server setup
  scripts/register-commands.ts
```

## Screenshot-only safety

This version has no TradeLocker, broker, or TradingView connection. It does not place, modify, copy, close, or monitor real trades. Screenshots are used only to create a draft signal that the authorized uploader personally confirms.

Future additions fit cleanly behind this layout:

- Stripe webhook → a billing service that adds/removes `Premium Member`.
- TradingView/webhook receiver → signal adapter that validates payloads then calls `SignalStore`.
- PostgreSQL/Prisma → replacement implementation for `SignalStore`.
- Web dashboard/member stats → API module reading the same signal model.
- Scheduled daily watchlists, trade recaps, education courses, competitions, and AI chart review → dedicated services/commands without changing the server blueprint.

## Safety and community positioning

The server copy intentionally frames the organizer as a learner and community founder—not a licensed advisor or a guru. Signals are educational analysis; every member owns their decisions and risk. Keep this language visible in onboarding, signal posts, and any future paid-membership pages.
# OBS → Discord live setup

1. Install or update OBS Studio, then open **Tools → WebSocket Server Settings**.
2. Enable the WebSocket server, use port `4455` (or your chosen port), and set a password.
3. Copy the same values into `.env`: `OBS_WS_HOST`, `OBS_WS_PORT`, and `OBS_WS_PASSWORD`.
4. Set `DISCORD_LIVE_CHANNEL_ID`, `DISCORD_LIVE_NOTIFICATION_CHANNEL_ID` (it may be the same channel), optional `DISCORD_LIVE_ALERT_ROLE_ID`, and `STREAM_DESTINATION_URL`.
5. Start the bot and run `/live status`. The bot remains available if OBS is closed or misconfigured; it retries safely in the background.
6. Click **Start Streaming** in OBS. The persistent panel changes to LIVE and one notification is sent. On stop, it returns to OFFLINE and records the session duration.

`/live refresh` queries OBS and reconciles the panel without sending a duplicate notification. `/live test` changes the panel LIVE → OFFLINE without a real session or role mention. Set `SEND_STREAM_END_NOTIFICATION=true` only if you also want an end notification.
