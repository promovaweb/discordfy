/**
 * Webhook store: one Discord webhook per channel name.
 *
 * A webhook URL carries its own token, so it is a secret. Each URL is kept
 * in the encrypted vault (`~/.discordfy/credentials.json`) under the
 * credential name `webhook.<channel>`. The channel name is the handle people
 * and agents use to pick the destination of a message; it is never derived
 * from Discord, so it can differ from the real channel name.
 *
 * Masked addresses (`https://discord.com/api/webhooks/<id>/abcd…yz`) keep the
 * webhook id visible and hide the token. Only the CLI with `--reveal` and the
 * TUI reveal toggle show the full URL.
 */
import { readVault, writeVault } from "../config/credentials.ts";
import { exists, paths } from "../config/paths.ts";
import { error } from "../app/errors.ts";
import { manifest } from "../app/manifest.ts";

/** Prefix of the vault entries that hold webhooks. */
export const WEBHOOK_PREFIX = "webhook.";

const CHANNEL_PATTERN = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const HOSTS = new Set(["discord.com", "discordapp.com", "ptb.discord.com", "canary.discord.com"]);
const PATH_PATTERN = /^\/api(?:\/v\d+)?\/webhooks\/(\d{15,22})\/([A-Za-z0-9_-]{20,})\/?$/;

/** Stored webhook as shown to people and agents. */
export interface WebhookEntry {
  /** Channel name chosen by the user. */
  channel: string;
  /** Discord webhook id (public part of the URL). */
  id: string;
  /** Address with the token masked. */
  masked: string;
}

/** Normalizes and validates a channel name. */
export function validateChannel(name: string): string {
  const clean = String(name ?? "").trim().toLowerCase().replace(/^#/, "");
  if (!CHANNEL_PATTERN.test(clean)) {
    throw error.usage(
      `Invalid channel name: "${name}". Use lower-case letters, digits, hyphen or underscore (up to 48 characters), e.g. deploys or alerts-prod.`,
      { channel: name },
    );
  }
  return clean;
}

/**
 * Parses and normalizes a Discord webhook URL.
 * Accepts discord.com, discordapp.com, ptb and canary hosts, with or without
 * an API version, and returns the canonical `https://discord.com/api/webhooks/<id>/<token>`.
 */
export function parseWebhookUrl(raw: string): { url: string; id: string; token: string } {
  let parsed: URL;
  try {
    parsed = new URL(String(raw ?? "").trim());
  } catch {
    throw error.usage("Invalid webhook URL. Copy it from Discord: Channel settings > Integrations > Webhooks > Copy webhook URL.");
  }
  const match = PATH_PATTERN.exec(parsed.pathname);
  if (parsed.protocol !== "https:" || !HOSTS.has(parsed.hostname) || !match) {
    throw error.usage("This is not a Discord webhook URL. Expected https://discord.com/api/webhooks/<id>/<token>.");
  }
  const [, id, token] = match as unknown as [string, string, string];
  return { url: `https://discord.com/api/webhooks/${id}/${token}`, id, token };
}

/** Masks the token of a webhook URL, keeping the id and the last two characters. */
export function maskWebhookUrl(url: string): string {
  try {
    const { id, token } = parseWebhookUrl(url);
    return `https://discord.com/api/webhooks/${id}/${token.slice(0, 4)}${"•".repeat(8)}${token.slice(-2)}`;
  } catch {
    return "•".repeat(12);
  }
}

function vault(): Record<string, string> {
  return exists(paths.credentials()) ? readVault() : {};
}

/** Lists stored webhooks in alphabetical order, without tokens. */
export function listWebhooks(): WebhookEntry[] {
  return Object.entries(vault())
    .filter(([name]) => name.startsWith(WEBHOOK_PREFIX))
    .map(([name, url]) => ({ channel: name.slice(WEBHOOK_PREFIX.length), id: idOf(url), masked: maskWebhookUrl(url) }))
    .sort((a, b) => a.channel.localeCompare(b.channel));
}

function idOf(url: string): string {
  try {
    return parseWebhookUrl(url).id;
  } catch {
    return "";
  }
}

/** Tells whether a channel already has a webhook. */
export function hasWebhook(channel: string): boolean {
  return `${WEBHOOK_PREFIX}${validateChannel(channel)}` in vault();
}

/**
 * Returns the full webhook URL of a channel. A missing channel raises
 * NOT_FOUND (exit 6) with the list of known channels in the details.
 */
export function getWebhookUrl(channel: string): string {
  const name = validateChannel(channel);
  const all = vault();
  const url = all[`${WEBHOOK_PREFIX}${name}`];
  if (url === undefined) {
    const known = Object.keys(all).filter((k) => k.startsWith(WEBHOOK_PREFIX)).map((k) => k.slice(WEBHOOK_PREFIX.length)).sort();
    throw error.notFound(
      `No webhook saved for channel "${name}". ${known.length ? `Known channels: ${known.join(", ")}.` : "No channel saved yet."} Add one with: ${manifest.bin} webhooks add ${name}`,
      { channel: name, known },
    );
  }
  return url;
}

/** Saves a webhook. Refuses to overwrite unless `replace` is true. Returns the masked entry. */
export function saveWebhook(channel: string, rawUrl: string, replace = false): WebhookEntry & { replaced: boolean } {
  const name = validateChannel(channel);
  const { url, id } = parseWebhookUrl(rawUrl);
  const all = vault();
  const key = `${WEBHOOK_PREFIX}${name}`;
  const replaced = key in all;
  if (replaced && !replace) {
    throw error.usage(`Channel "${name}" already has a webhook. Use --force to replace it.`, { channel: name });
  }
  all[key] = url;
  writeVault(all);
  return { channel: name, id, masked: maskWebhookUrl(url), replaced };
}

/** Removes a webhook. Returns false when the channel did not exist. */
export function removeWebhook(channel: string): boolean {
  const name = validateChannel(channel);
  const all = vault();
  const key = `${WEBHOOK_PREFIX}${name}`;
  if (!(key in all)) return false;
  delete all[key];
  writeVault(all);
  return true;
}

/** Renames a channel, keeping its webhook. */
export function renameWebhook(from: string, to: string): { from: string; to: string } {
  const source = validateChannel(from);
  const target = validateChannel(to);
  const all = vault();
  const url = all[`${WEBHOOK_PREFIX}${source}`];
  if (url === undefined) {
    const known = Object.keys(all).filter((k) => k.startsWith(WEBHOOK_PREFIX)).map((k) => k.slice(WEBHOOK_PREFIX.length)).sort();
    throw error.notFound(`No webhook saved for channel "${source}".`, { channel: source, known });
  }
  if (`${WEBHOOK_PREFIX}${target}` in all) throw error.usage(`Channel "${target}" already exists.`, { channel: target });
  delete all[`${WEBHOOK_PREFIX}${source}`];
  all[`${WEBHOOK_PREFIX}${target}`] = url;
  writeVault(all);
  return { from: source, to: target };
}
