/**
 * `webhooks` command: the channel → webhook address book.
 *
 * Subcommands: `add`, `list`, `show`, `test`, `rename` and `remove`. The
 * webhook URL is a secret (it carries the token), so `add` never takes it as
 * an argument: it is typed without echo on a terminal or read from stdin.
 * Listings mask the token unless `--reveal` is given.
 */
import { manifest } from "../../app/manifest.ts";
import { ExitCode } from "../../app/exit-codes.ts";
import { error } from "../../app/errors.ts";
import {
  getWebhookUrl,
  hasWebhook,
  listWebhooks,
  maskWebhookUrl,
  parseWebhookUrl,
  removeWebhook,
  renameWebhook,
  saveWebhook,
  validateChannel,
} from "../../discord/webhooks.ts";
import { avatarDataUri, modifyWebhook, webhookInfo } from "../../discord/api.ts";
import { confirm, readSecret, readStdin } from "../input.ts";
import { color, table } from "../format.ts";
import type { Command } from "../registry.ts";

const codes = [ExitCode.CREDENTIALS, ExitCode.NOT_FOUND, ExitCode.PERMISSION, ExitCode.NETWORK_OR_API, ExitCode.INTERRUPTED] as const;
const channelArgument = { name: "channel", description: "Channel name chosen by you: lower-case letters, digits, hyphen or underscore (e.g. deploys).", required: true } as const;

const add: Command = {
  name: "add",
  description: "Save the webhook URL of a channel. The URL is read without echo or from stdin.",
  longDescription:
    "Copy the URL in Discord: Channel settings > Integrations > Webhooks > Copy webhook URL.\n" +
    "Before saving, the webhook is checked with a GET that posts nothing to the channel; use --no-verify offline.",
  arguments: [channelArgument],
  options: [
    { name: "--stdin", description: "Read the URL from the first stdin line, even on an interactive terminal." },
    { name: "--force", aliases: ["-f"], description: "Replace the webhook when the channel already exists." },
    { name: "--no-verify", description: "Save without checking the webhook with Discord." },
  ],
  exitCodes: codes,
  interactive: true,
  examples: [`${manifest.bin} webhooks add deploys`, `printf '%s' "$DISCORD_WEBHOOK" | ${manifest.bin} webhooks add alerts --stdin`],
  run: async (ctx) => {
    const channel = validateChannel(ctx.args[0] as string);
    if (hasWebhook(channel) && ctx.options.force !== true) {
      throw error.usage(`Channel "${channel}" already has a webhook. Use --force to replace it.`, { channel });
    }
    const raw = ctx.options.stdin === true ? ((await readStdin()).split(/\r?\n/)[0] ?? "").trim() : await readSecret(`Webhook URL for #${channel}`);
    if (!raw) throw error.usage("No URL received.");
    const { url } = parseWebhookUrl(raw);
    const info = ctx.options["no-verify"] === true ? undefined : await webhookInfo(url);
    const saved = saveWebhook(channel, url, true);
    return {
      data: { ...saved, verified: Boolean(info), ...(info ? { webhook: info } : {}) },
      text: () =>
        `${color.ok("✓")} #${channel} ${saved.replaced ? "replaced" : "saved"}${info ? ` · Discord webhook "${info.name}" (channel ${info.channel_id})` : color.dim(" · not verified")}`,
    };
  },
};

const list: Command = {
  name: "list",
  aliases: ["ls"],
  description: "List saved channels with their webhook address (token masked).",
  options: [{ name: "--reveal", description: "Show the full webhook URLs, token included. In --json adds the field `url`." }],
  exitCodes: codes,
  examples: [`${manifest.bin} webhooks list`, `${manifest.bin} webhooks list --json`],
  run: (ctx) => {
    const reveal = ctx.options.reveal === true;
    const items = listWebhooks().map((item) => (reveal ? { ...item, url: getWebhookUrl(item.channel) } : item));
    return {
      data: { count: items.length, webhooks: items },
      text: () =>
        items.length
          ? table([["CHANNEL", "ADDRESS"], ...items.map((item): [string, string] => [`#${item.channel}`, "url" in item ? (item as { url: string }).url : item.masked])])
          : color.dim(`no webhooks saved · add one with: ${manifest.bin} webhooks add <channel>`),
    };
  },
};

const show: Command = {
  name: "show",
  aliases: ["get"],
  description: "Show the webhook of one channel (token masked unless --reveal).",
  arguments: [channelArgument],
  options: [{ name: "--reveal", description: "Print the full URL. In --json the field becomes `url`." }],
  exitCodes: codes,
  examples: [`${manifest.bin} webhooks show deploys`, `${manifest.bin} webhooks show deploys --reveal`],
  run: (ctx) => {
    const channel = validateChannel(ctx.args[0] as string);
    const url = getWebhookUrl(channel);
    const { id } = parseWebhookUrl(url);
    const reveal = ctx.options.reveal === true;
    return {
      data: reveal ? { channel, id, url } : { channel, id, masked: maskWebhookUrl(url) },
      text: () => (reveal ? url : maskWebhookUrl(url)),
    };
  },
};

const test: Command = {
  name: "test",
  aliases: ["check"],
  description: "Check that a channel's webhook still works, without posting a message.",
  arguments: [channelArgument],
  exitCodes: codes,
  examples: [`${manifest.bin} webhooks test deploys`],
  run: async (ctx) => {
    const channel = validateChannel(ctx.args[0] as string);
    const info = await webhookInfo(getWebhookUrl(channel));
    return {
      data: { channel, ok: true, webhook: info },
      text: () => `${color.ok("✓")} #${channel} works · Discord webhook "${info.name}" (channel ${info.channel_id})`,
    };
  },
};

const edit: Command = {
  name: "edit",
  description: "Change the default name and avatar of the webhook in Discord.",
  longDescription:
    "Changes the webhook itself, so every message without --username or --avatar-url uses the new identity.\n" +
    "The avatar comes from a local PNG, JPEG or GIF file or an http(s) URL. Discord rejects names containing \"discord\" or \"clyde\".",
  arguments: [channelArgument],
  options: [
    { name: "--name", argument: { name: "name" }, description: "New default display name (1 to 80 characters)." },
    { name: "--avatar", argument: { name: "file-or-url" }, description: "New default avatar: path to a PNG, JPEG or GIF, or an http(s) URL." },
    { name: "--remove-avatar", description: "Remove the custom avatar and return to the Discord default." },
  ],
  exitCodes: codes,
  examples: [`${manifest.bin} webhooks edit deploys --name "Deploy bot" --avatar ./bot.png`, `${manifest.bin} webhooks edit alerts --remove-avatar`],
  run: async (ctx) => {
    const channel = validateChannel(ctx.args[0] as string);
    const name = typeof ctx.options.name === "string" ? ctx.options.name.trim() : undefined;
    const avatar = typeof ctx.options.avatar === "string" ? ctx.options.avatar : undefined;
    const removeAvatar = ctx.options["remove-avatar"] === true;
    if (name === undefined && avatar === undefined && !removeAvatar) throw error.usage("Give --name, --avatar or --remove-avatar.");
    if (avatar && removeAvatar) throw error.usage("Use --avatar or --remove-avatar, not both.");
    if (name !== undefined && (name.length < 1 || name.length > 80)) throw error.usage("The name must have 1 to 80 characters.");
    if (name && /discord|clyde/i.test(name)) throw error.usage('Discord rejects names containing "discord" or "clyde".');
    const profile = { ...(name ? { name } : {}), ...(avatar ? { avatar: await avatarDataUri(avatar) } : {}), ...(removeAvatar ? { avatar: null } : {}) };
    const info = await modifyWebhook(getWebhookUrl(channel), profile);
    return {
      data: { channel, updated: Object.keys(profile), webhook: info },
      text: () => `${color.ok("✓")} #${channel} · webhook "${info.name}" updated (${Object.keys(profile).join(", ")})`,
    };
  },
};

const rename: Command = {
  name: "rename",
  aliases: ["mv"],
  description: "Rename a channel, keeping its webhook.",
  arguments: [
    { name: "from", description: "Current channel name.", required: true },
    { name: "to", description: "New channel name.", required: true },
  ],
  exitCodes: codes,
  examples: [`${manifest.bin} webhooks rename alerts alerts-prod`],
  run: (ctx) => {
    const data = renameWebhook(ctx.args[0] as string, ctx.args[1] as string);
    return { data, text: () => `${color.ok("✓")} #${data.from} → #${data.to}` };
  },
};

const remove: Command = {
  name: "remove",
  aliases: ["rm"],
  description: "Delete a channel's webhook from the vault. Asks for confirmation on a terminal.",
  longDescription: "Only the local copy is deleted; the webhook keeps existing in Discord until you delete it there.",
  arguments: [channelArgument],
  options: [{ name: "--yes", aliases: ["-y"], description: "Skip the confirmation." }],
  exitCodes: codes,
  examples: [`${manifest.bin} webhooks remove deploys --yes`],
  run: async (ctx) => {
    const channel = validateChannel(ctx.args[0] as string);
    if (ctx.options.yes !== true && ctx.interactive && hasWebhook(channel)) {
      if (!(await confirm(`Remove the webhook of #${channel}?`, false))) throw error.interrupted("Operation cancelled.");
    }
    const removed = removeWebhook(channel);
    return {
      data: { channel, removed },
      text: () => (removed ? `${color.ok("✓")} #${channel} removed` : `${color.warn("•")} #${channel} did not exist`),
    };
  },
};

export const webhooksCommand: Command = {
  name: "webhooks",
  aliases: ["webhook", "wh"],
  description: `Manage the Discord channel webhooks saved, encrypted, in ~/.${manifest.bin}/credentials.json.`,
  longDescription:
    "Each channel name points to one Discord webhook URL. The URL is stored in the encrypted vault\n" +
    "as the credential webhook.<channel>, so it never sits in plain text. Use the channel name in\n" +
    `\`${manifest.bin} send <channel>\` and in the MCP tool discord_send.`,
  subcommands: [add, list, show, test, edit, rename, remove],
  exitCodes: codes,
};
