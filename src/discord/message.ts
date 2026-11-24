/**
 * Rich message builder for Discord webhooks.
 *
 * Turns simple inputs (content, embed title, color, fields...) into the JSON
 * body Discord expects, and checks the documented limits before any request:
 * 2000 characters of content, 10 embeds, 256 for titles and field names,
 * 4096 for descriptions, 25 fields, 1024 per field value, 2048 for footers
 * and 6000 characters across all embeds. Mentions are disabled by default
 * (`allowed_mentions.parse = []`), so a message never pings @everyone,
 * roles or users unless the caller opts in.
 */
import { error } from "../app/errors.ts";

/** Embed field. */
export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/** Discord embed object (subset used by Discordfy). */
export interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  author?: { name: string; url?: string; icon_url?: string };
  footer?: { text: string; icon_url?: string };
  image?: { url: string };
  thumbnail?: { url: string };
  fields?: EmbedField[];
}

/** Body sent to `POST /webhooks/<id>/<token>`. */
export interface WebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  tts?: boolean;
  embeds?: Embed[];
  thread_name?: string;
  /** Message flags: 4 SUPPRESS_EMBEDS, 4096 SUPPRESS_NOTIFICATIONS. */
  flags?: number;
  allowed_mentions?: { parse: Array<"everyone" | "roles" | "users"> };
}

/** Flat inputs accepted by the CLI, the TUI and the MCP tool. */
export interface MessageInput {
  content?: string;
  username?: string;
  avatarUrl?: string;
  tts?: boolean;
  title?: string;
  description?: string;
  url?: string;
  color?: string | number;
  timestamp?: string;
  author?: string;
  authorUrl?: string;
  authorIcon?: string;
  footer?: string;
  footerIcon?: string;
  image?: string;
  thumbnail?: string;
  fields?: EmbedField[];
  /** Extra embeds appended after the one built from the flat inputs. */
  embeds?: Embed[];
  threadName?: string;
  allowMentions?: boolean;
  /** Deliver without push notification (SUPPRESS_NOTIFICATIONS). */
  silent?: boolean;
  /** Hide the link previews of the content (SUPPRESS_EMBEDS). */
  suppressEmbeds?: boolean;
}

/** Named colors accepted by --color, besides #RRGGBB and decimal integers. */
export const NAMED_COLORS: Readonly<Record<string, number>> = Object.freeze({
  blurple: 0x5865f2,
  green: 0x57f287,
  success: 0x57f287,
  yellow: 0xfee75c,
  warning: 0xfee75c,
  red: 0xed4245,
  error: 0xed4245,
  fuchsia: 0xeb459e,
  white: 0xffffff,
  black: 0x23272a,
  info: 0x3498db,
  blue: 0x3498db,
  orange: 0xe67e22,
  grey: 0x95a5a6,
});

/** Parses a color given as name, #RRGGBB, 0xRRGGBB or decimal integer. */
export function parseColor(value: string | number): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffffff) return value;
  const text = String(value).trim().toLowerCase();
  if (text in NAMED_COLORS) return NAMED_COLORS[text] as number;
  const hex = /^(?:#|0x)?([0-9a-f]{6})$/.exec(text);
  if (hex && (text.startsWith("#") || text.startsWith("0x") || /[a-f]/.test(text))) return parseInt(hex[1] as string, 16);
  if (/^\d{1,8}$/.test(text) && Number(text) <= 0xffffff) return Number(text);
  throw error.usage(`Invalid color: "${value}". Use #RRGGBB, a decimal integer or one of: ${Object.keys(NAMED_COLORS).join(", ")}.`);
}

/** Parses `Name=Value` (or `Name|Value`) into a field. */
export function parseField(spec: string, inline = false): EmbedField {
  const index = spec.search(/[=|]/);
  if (index <= 0) throw error.usage(`Invalid field "${spec}". Use "Name=Value".`);
  const name = spec.slice(0, index).trim();
  const value = spec.slice(index + 1).trim().replace(/\\n/g, "\n");
  if (!name || !value) throw error.usage(`Invalid field "${spec}". Name and value cannot be empty.`);
  return { name, value, inline };
}

/** Resolves `now` or an ISO date into an ISO 8601 timestamp. */
export function parseTimestamp(value: string): string {
  if (value === "now" || value === "") return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw error.usage(`Invalid timestamp "${value}". Use "now" or an ISO 8601 date.`);
  return date.toISOString();
}

function httpUrl(value: string | undefined, label: string): string | undefined {
  if (value === undefined || value === "") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    /* falls through */
  }
  throw error.usage(`Invalid ${label}: "${value}". Use an http(s) URL.`);
}

/** Builds the webhook payload from flat inputs and validates it. */
export function buildPayload(input: MessageInput): WebhookPayload {
  const embed: Embed = {};
  if (input.title) embed.title = input.title;
  if (input.description) embed.description = input.description.replace(/\\n/g, "\n");
  const url = httpUrl(input.url, "embed URL");
  if (url) embed.url = url;
  if (input.color !== undefined && input.color !== "") embed.color = parseColor(input.color);
  if (input.timestamp !== undefined) embed.timestamp = parseTimestamp(input.timestamp);
  if (input.author) {
    embed.author = { name: input.author };
    const a = httpUrl(input.authorUrl, "author URL");
    const i = httpUrl(input.authorIcon, "author icon URL");
    if (a) embed.author.url = a;
    if (i) embed.author.icon_url = i;
  }
  if (input.footer) {
    embed.footer = { text: input.footer };
    const i = httpUrl(input.footerIcon, "footer icon URL");
    if (i) embed.footer.icon_url = i;
  }
  const image = httpUrl(input.image, "image URL");
  if (image) embed.image = { url: image };
  const thumbnail = httpUrl(input.thumbnail, "thumbnail URL");
  if (thumbnail) embed.thumbnail = { url: thumbnail };
  if (input.fields?.length) embed.fields = input.fields;

  const embeds: Embed[] = [];
  if (Object.keys(embed).length) {
    if (!embed.title && !embed.description && !embed.fields && !embed.image && !embed.author) {
      throw error.usage("An embed needs at least a title, description, field, author or image. Add --title or --description.");
    }
    embeds.push(embed);
  }
  for (const extra of input.embeds ?? []) embeds.push(extra);

  const payload: WebhookPayload = {};
  if (input.content) payload.content = input.content.replace(/\\n/g, "\n");
  if (input.username) payload.username = input.username;
  const avatar = httpUrl(input.avatarUrl, "avatar URL");
  if (avatar) payload.avatar_url = avatar;
  if (input.tts) payload.tts = true;
  if (embeds.length) payload.embeds = embeds;
  if (input.threadName) payload.thread_name = input.threadName;
  const flags = (input.silent ? 4096 : 0) | (input.suppressEmbeds ? 4 : 0);
  if (flags) payload.flags = flags;
  payload.allowed_mentions = { parse: input.allowMentions ? ["everyone", "roles", "users"] : [] };
  validatePayload(payload);
  return payload;
}

function limit(value: string | undefined, max: number, label: string): number {
  const size = value?.length ?? 0;
  if (size > max) throw error.usage(`${label} has ${size} characters; Discord accepts up to ${max}.`, { field: label, size, max });
  return size;
}

/** Checks a payload against the Discord webhook limits. */
export function validatePayload(payload: WebhookPayload): void {
  const embeds = payload.embeds ?? [];
  if (!payload.content && embeds.length === 0) {
    throw error.usage("Nothing to send. Give a message, --title, --description or an embed.");
  }
  limit(payload.content, 2000, "content");
  limit(payload.username, 80, "username");
  if (payload.username && /discord|clyde/i.test(payload.username)) {
    throw error.usage('Discord rejects usernames containing "discord" or "clyde".');
  }
  if (embeds.length > 10) throw error.usage(`Discord accepts up to 10 embeds per message; got ${embeds.length}.`);
  let total = 0;
  embeds.forEach((embed, index) => {
    const at = `embeds[${index}]`;
    total += limit(embed.title, 256, `${at}.title`);
    total += limit(embed.description, 4096, `${at}.description`);
    total += limit(embed.author?.name, 256, `${at}.author.name`);
    total += limit(embed.footer?.text, 2048, `${at}.footer.text`);
    const fields = embed.fields ?? [];
    if (fields.length > 25) throw error.usage(`${at} has ${fields.length} fields; Discord accepts up to 25.`);
    fields.forEach((field, f) => {
      if (!field.name || !field.value) throw error.usage(`${at}.fields[${f}] needs a name and a value.`);
      total += limit(field.name, 256, `${at}.fields[${f}].name`);
      total += limit(field.value, 1024, `${at}.fields[${f}].value`);
    });
  });
  if (total > 6000) throw error.usage(`The embeds add up to ${total} characters; Discord accepts up to 6000 per message.`);
}

/** Read-only or bot-only embed keys that webhooks cannot set; dropped on normalization. */
const READ_ONLY_EMBED_KEYS = ["type", "provider", "video", "proxy_url"] as const;

/**
 * Normalizes a raw Discord body given by a person or an agent.
 * Accepts the legacy single `embed` object (used by the Embed Visualizer and
 * old bot examples) and merges it into `embeds`, drops keys webhooks cannot
 * set (`type`, `provider`, `video`, image `width`/`height`/`proxy_url`) and
 * keeps everything else as given.
 */
export function normalizePayload(raw: Record<string, unknown>): WebhookPayload {
  const { embed, embeds, ...rest } = raw as { embed?: unknown; embeds?: unknown } & Record<string, unknown>;
  const list: unknown[] = [];
  if (embed && typeof embed === "object") list.push(embed);
  if (Array.isArray(embeds)) list.push(...embeds);
  else if (embeds !== undefined) throw error.usage("`embeds` must be an array of embed objects.");
  const clean = list.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw error.usage(`embeds[${index}] must be an object.`);
    const copy: Record<string, unknown> = { ...(item as Record<string, unknown>) };
    for (const key of READ_ONLY_EMBED_KEYS) delete copy[key];
    for (const media of ["image", "thumbnail"]) {
      const value = copy[media] as Record<string, unknown> | undefined;
      if (value && typeof value === "object") copy[media] = { url: value.url, ...(value.description ? { description: value.description } : {}) };
    }
    if (typeof copy.color === "string") copy.color = parseColor(copy.color);
    return copy as Embed;
  });
  const payload = { ...rest } as WebhookPayload;
  if (clean.length) payload.embeds = clean;
  return payload;
}

/** Parses an embed given on the command line as JSON text or `@file.json`. */
export function parseEmbedArgument(value: string, read: (path: string) => string): Embed {
  const text = value.startsWith("@") ? read(value.slice(1)) : value;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw error.usage(`--embed expects a JSON object or @file.json; could not parse "${value.slice(0, 40)}".`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw error.usage("--embed expects a JSON object.");
  const normalized = normalizePayload({ embeds: [data] });
  return normalized.embeds![0]!;
}
