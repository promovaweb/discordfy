/**
 * `send` command: posts a rich message to a saved channel.
 *
 * The channel name is mandatory and always comes first, so a message never
 * goes to an implicit destination. The text comes from the remaining
 * arguments, `--stdin` or a JSON payload (`--payload file.json` or `-`).
 * Embed options (`--title`, `--description`, `--color`, `--field`...) build
 * one embed; the payload file may carry up to 10. `--dry-run` prints the
 * JSON body without calling Discord.
 */
import { readFileSync } from "node:fs";
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { error } from "../../app/errors.ts";
import { getWebhookUrl, validateChannel } from "../../discord/webhooks.ts";
import { sendMessage } from "../../discord/api.ts";
import { composePayload, normalizePayload, parseEmbedArgument, parseField, type EmbedField, type MessageInput, type WebhookPayload } from "../../discord/message.ts";
import { getPath, readSettings } from "../../config/settings.ts";
import { readStdin } from "../input.ts";
import { color } from "../format.ts";
import type { Command, Options } from "../registry.ts";

function str(options: Options, key: string): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
}

function list(options: Options, key: string): string[] {
  const value = options[key];
  return Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
}

/** Reads the defaults from settings.json (send.username, send.avatarUrl). */
export function sendDefaults(): { username?: string; avatarUrl?: string } {
  const settings = readSettings();
  const username = getPath(settings, "send.username");
  const avatarUrl = getPath(settings, "send.avatarUrl");
  return {
    ...(typeof username === "string" && username ? { username } : {}),
    ...(typeof avatarUrl === "string" && avatarUrl ? { avatarUrl } : {}),
  };
}

async function loadPayload(source: string): Promise<WebhookPayload> {
  let text: string;
  try {
    text = source === "-" ? await readStdin() : readFileSync(source, "utf8");
  } catch {
    throw error.notFound(`Could not read the payload file "${source}".`, { file: source });
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw error.usage(`The payload "${source}" is not valid JSON.`, { file: source });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw error.usage(`The payload "${source}" must be a JSON object with Discord webhook fields (content, embeds...).`, { file: source });
  }
  return normalizePayload(data as Record<string, unknown>);
}

export const sendCommand: Command = {
  name: "send",
  description: "Send a rich message (text and embed) to a saved channel.",
  longDescription:
    "The first argument is the channel name saved with `webhooks add`; the rest is the message text.\n" +
    "Use \\n for line breaks. Mentions (@everyone, roles, users) are disabled unless --allow-mentions.\n" +
    "Fields: --field \"Name=Value\" (repeatable) stacks them; --inline-field puts them side by side.",
  arguments: [
    { name: "channel", description: "Saved channel name (see `webhooks list`).", required: true },
    { name: "message", description: "Message text (up to 2000 characters). Optional when an embed or payload is given.", variadic: true },
  ],
  options: [
    { name: "--stdin", description: "Read the message text from stdin." },
    { name: "--title", aliases: ["-t"], argument: { name: "text" }, description: "Embed title (up to 256 characters)." },
    { name: "--description", aliases: ["-d"], argument: { name: "text" }, description: "Embed description (up to 4096 characters, Markdown accepted)." },
    { name: "--url", argument: { name: "url" }, description: "Link opened by the embed title." },
    { name: "--color", aliases: ["-c"], argument: { name: "color" }, description: "Embed side color: #RRGGBB, decimal or a name (blurple, green, yellow, red, info, orange, grey...)." },
    { name: "--field", argument: { name: "name=value" }, repeatable: true, description: "Embed field, stacked. Repeat for more (up to 25)." },
    { name: "--inline-field", argument: { name: "name=value" }, repeatable: true, description: "Embed field shown side by side with other inline fields. Repeatable." },
    { name: "--embed", argument: { name: "json" }, repeatable: true, description: "Extra embed as a JSON object or @file.json, appended after the one built from the flags. Repeat for more (up to 10 per message)." },
    { name: "--author", argument: { name: "name" }, description: "Embed author line." },
    { name: "--author-url", argument: { name: "url" }, description: "Link of the author line." },
    { name: "--author-icon", argument: { name: "url" }, description: "Small image beside the author." },
    { name: "--footer", argument: { name: "text" }, description: "Embed footer text." },
    { name: "--footer-icon", argument: { name: "url" }, description: "Small image beside the footer." },
    { name: "--image", argument: { name: "url" }, description: "Large image at the bottom of the embed." },
    { name: "--thumbnail", argument: { name: "url" }, description: "Small image at the top right of the embed." },
    { name: "--timestamp", argument: { name: "when", optional: true }, description: "Embed timestamp: `now` (default when the value is omitted) or an ISO 8601 date." },
    { name: "--username", aliases: ["-u"], argument: { name: "name" }, description: "Overrides the webhook display name for this message. Default: send.username." },
    { name: "--avatar-url", argument: { name: "url" }, description: "Overrides the webhook avatar for this message. Default: send.avatarUrl." },
    { name: "--tts", description: "Ask Discord to read the message aloud." },
    { name: "--thread-id", argument: { name: "id" }, description: "Post inside an existing thread of the channel." },
    { name: "--thread-name", argument: { name: "name" }, description: "Create a forum post with this title (forum channels only)." },
    { name: "--payload", argument: { name: "file" }, description: "JSON body in the Discord webhook format (content, username, avatar_url, tts, embeds or the legacy single embed); `-` reads stdin. Options given on the command line override its top-level fields." },
    { name: "--silent", description: "Deliver without push notifications; the channel only shows the unread badge." },
    { name: "--suppress-embeds", description: "Hide the automatic link previews of URLs in the text." },
    { name: "--allow-mentions", description: "Let @everyone, @here, roles and users in the text notify people." },
    { name: "--dry-run", description: "Print the JSON body that would be sent and exit without calling Discord." },
  ],
  exitCodes: [ExitCode.CREDENTIALS, ExitCode.NOT_FOUND, ExitCode.NETWORK_OR_API],
  examples: [
    `${manifest.bin} send deploys "Deploy finished"`,
    `${manifest.bin} send deploys --title "Deploy v1.4.0" --description "All checks passed" --color green --field "Branch=main" --inline-field "Time=42s" --timestamp`,
    `git log -1 --format=%s | ${manifest.bin} send commits --stdin`,
    `${manifest.bin} send alerts --payload message.json`,
    `${manifest.bin} send deploys "Hello" --dry-run --json`,
  ],
  run: async (ctx) => {
    const channel = validateChannel(ctx.args[0] as string);
    const o = ctx.options;
    let content = ctx.args.slice(1).join(" ").trim();
    if (o.stdin === true) content = (await readStdin()).replace(/\s+$/, "");
    const fields: EmbedField[] = [...list(o, "field").map((f) => parseField(f)), ...list(o, "inline-field").map((f) => parseField(f, true))];
    const defaults = sendDefaults();
    const input: MessageInput = {
      content: content || undefined,
      username: str(o, "username"),
      avatarUrl: str(o, "avatar-url"),
      tts: o.tts === true,
      title: str(o, "title"),
      description: str(o, "description"),
      url: str(o, "url"),
      color: str(o, "color"),
      timestamp: o.timestamp === true ? "now" : str(o, "timestamp"),
      author: str(o, "author"),
      authorUrl: str(o, "author-url"),
      authorIcon: str(o, "author-icon"),
      footer: str(o, "footer"),
      footerIcon: str(o, "footer-icon"),
      image: str(o, "image"),
      thumbnail: str(o, "thumbnail"),
      fields,
      embeds: list(o, "embed").map((e) => parseEmbedArgument(e, readEmbedFile)),
      threadName: str(o, "thread-name"),
      allowMentions: o["allow-mentions"] === true,
      silent: o.silent === true,
      suppressEmbeds: o["suppress-embeds"] === true,
    };

    const source = str(o, "payload");
    const payload: WebhookPayload = composePayload(source ? await loadPayload(source) : undefined, input, defaults);

    const threadId = str(o, "thread-id");
    if (o["dry-run"] === true) {
      return {
        data: { channel, dryRun: true, payload, ...(threadId ? { threadId } : {}) },
        text: () => JSON.stringify(payload, null, 2),
      };
    }
    const url = getWebhookUrl(channel);
    const message = await sendMessage(url, payload, { threadId });
    return {
      data: { channel, sent: true, message },
      text: () => `${color.ok("✓")} sent to #${channel}${message.id ? color.dim(` · message ${message.id}`) : ""}`,
    };
  },
};

function readEmbedFile(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    throw error.notFound(`Could not read the embed file "${path}".`, { file: path });
  }
}
