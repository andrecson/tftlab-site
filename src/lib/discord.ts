/**
 * Discord OAuth + REST helpers used by the subscription flow. The buyer links
 * Discord BEFORE checkout so we can attribute the (hosted) payment to a Discord
 * account; on the OAuth callback we add them to the guild (no role yet, via the
 * `guilds.join` scope), and the payment webhook later grants the subscriber
 * role. Only the bot token is needed at webhook time — no OAuth token is stored.
 *
 * Env: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN,
 *      DISCORD_GUILD_ID, DISCORD_ROLE_ID.
 */

const DISCORD_API = "https://discord.com/api/v10";

/** identify+email → who they are; guilds.join → add them to the server. */
export const DISCORD_SCOPES = ["identify", "email", "guilds.join"] as const;

export function discordConfigured(): boolean {
  return Boolean(
    process.env.DISCORD_CLIENT_ID &&
      process.env.DISCORD_CLIENT_SECRET &&
      process.env.DISCORD_BOT_TOKEN &&
      process.env.DISCORD_GUILD_ID &&
      process.env.DISCORD_ROLE_ID,
  );
}

export function discordAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DISCORD_SCOPES.join(" "),
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

interface DiscordToken {
  access_token: string;
  token_type: string;
  scope: string;
}

export async function exchangeDiscordCode(
  code: string,
  redirectUri: string,
): Promise<DiscordToken | null> {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID ?? "",
      client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as DiscordToken;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  email?: string | null;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as DiscordUser;
}

/** A human-friendly handle for storage/audit (global_name → username). */
export function discordDisplayName(user: DiscordUser): string {
  return user.global_name || user.username;
}

/**
 * Add the user to the guild using their OAuth access token (guilds.join). No
 * role is assigned here — the payment webhook does that. 201 = added, 204 =
 * already a member; both are success.
 */
export async function joinGuild(discordId: string, accessToken: string): Promise<boolean> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: accessToken }),
    },
  );
  return res.status === 201 || res.status === 204;
}

/** Grant the subscriber role (idempotent — 204 whether or not they had it). */
export async function grantRole(discordId: string): Promise<boolean> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}/roles/${process.env.DISCORD_ROLE_ID}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "X-Audit-Log-Reason": "TFTLab: assinatura confirmada",
      },
    },
  );
  return res.ok; // 204 No Content
}

/** Revoke the subscriber role. 404 (not a member / already gone) counts as ok. */
export async function revokeRole(discordId: string): Promise<boolean> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}/roles/${process.env.DISCORD_ROLE_ID}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "X-Audit-Log-Reason": "TFTLab: assinatura encerrada",
      },
    },
  );
  return res.ok || res.status === 404;
}
