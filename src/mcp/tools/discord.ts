/**
 * Discord tools: list the saved channels, check a webhook and send messages.
 *
 * `discord_send` always needs the channel name saved by the CLI, so the agent
 * picks the destination explicitly. No tool returns a webhook URL or token:
 * `webhooks_list` gives channel, webhook id and the masked address. Adding,
 * replacing or removing webhooks stays in the CLI and the TUI, where a person
 * pastes the secret.
 */
import { z } from "zod";
import { AppError } from "../../app/errors.ts";
import { getWebhookUrl, listWebhooks } from "../../discord/webhooks.ts";
import { avatarDataUri, modifyWebhook, sendMessage, webhookInfo } from "../../discord/api.ts";
import { buildPayload, normalizePayload, validatePayload, type Embed, type MessageInput, type WebhookPayload } from "../../discord/message.ts";
import { sendDefaults } from "../../cli/commands/send.ts";
import type { Registrar } from "../server.ts";

type ToolResult = { content: Array<{ type: "text"; text: string }>; structuredContent?: Record<string, unknown>; isError?: boolean };

function ok(data: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
}

function fail(e: unknown): ToolResult {
  const data = e instanceof AppError ? { error: e.toJSON() } : { error: { code: 1, name: "GENERIC_ERROR", message: e instanceof Error ? e.message : String(e) } };
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data, isError: true };
}

const field = z.object({ name: z.string().min(1).max(256), value: z.string().min(1).max(1024), inline: z.boolean().optional() });

export function registerDiscordTools({ server, catalog }: Registrar): void {
  catalog.tools.push({ name: "webhooks_list", description: "Saved channel names with webhook id and masked address." });
  server.registerTool(
    "webhooks_list",
    {
      title: "List Discord channels",
      description: "Lists the channel names saved with `discordfy webhooks add`. Use one of them as `channel` in discord_send. Never returns the webhook token.",
      inputSchema: {},
    },
    async () => {
      try {
        const webhooks = listWebhooks();
        return ok({ count: webhooks.length, webhooks });
      } catch (e) {
        return fail(e);
      }
    },
  );

  catalog.tools.push({ name: "webhook_test", description: "Check a channel's webhook without posting." });
  server.registerTool(
    "webhook_test",
    {
      title: "Check a webhook",
      description: "Reads the webhook of a saved channel from Discord (name, channel id, guild id) without posting anything. Use it to diagnose a failing send.",
      inputSchema: { channel: z.string().min(1).describe("Saved channel name, e.g. deploys.") },
    },
    async ({ channel }) => {
      try {
        const info = await webhookInfo(getWebhookUrl(channel));
        return ok({ channel, ok: true, webhook: info });
      } catch (e) {
        return fail(e);
      }
    },
  );

  catalog.tools.push({ name: "webhook_edit", description: "Change the webhook default name and avatar in Discord." });
  server.registerTool(
    "webhook_edit",
    {
      title: "Edit a webhook profile",
      description: "Changes the default display name and/or avatar of a saved channel webhook in Discord. Messages without username/avatar_url then use them.",
      inputSchema: {
        channel: z.string().min(1).describe("Saved channel name."),
        name: z.string().min(1).max(80).optional().describe("New default name. Discord rejects names containing discord or clyde."),
        avatar_url: z.string().url().optional().describe("http(s) URL of a PNG, JPEG or GIF used as the new avatar."),
        remove_avatar: z.boolean().optional().describe("Return to the Discord default avatar."),
      },
    },
    async ({ channel, name, avatar_url, remove_avatar }) => {
      try {
        if (!name && !avatar_url && !remove_avatar) throw new AppError(2, "Give name, avatar_url or remove_avatar.");
        if (name && /discord|clyde/i.test(name)) throw new AppError(2, "Discord rejects names containing discord or clyde.");
        const profile = { ...(name ? { name } : {}), ...(avatar_url ? { avatar: await avatarDataUri(avatar_url) } : {}), ...(remove_avatar ? { avatar: null } : {}) };
        const webhook = await modifyWebhook(getWebhookUrl(channel), profile);
        return ok({ channel, updated: Object.keys(profile), webhook });
      } catch (e) {
        return fail(e);
      }
    },
  );

  catalog.tools.push({ name: "discord_send", description: "Send a rich message (text and embeds) to a saved channel." });
  server.registerTool(
    "discord_send",
    {
      title: "Send a Discord message",
      description:
        "Posts a message to a saved channel through its webhook. `channel` is required; call webhooks_list when unsure. " +
        "Give `content` and/or the embed fields (title, description, color, fields...). `embeds` adds raw Discord embed objects (up to 10 in total). " +
        "Mentions are disabled unless allow_mentions is true. Use dry_run to see the JSON body without sending.",
      inputSchema: {
        channel: z.string().min(1).describe("Saved channel name (see webhooks_list)."),
        content: z.string().max(2000).optional().describe("Message text, Markdown accepted, up to 2000 characters."),
        title: z.string().max(256).optional().describe("Embed title."),
        description: z.string().max(4096).optional().describe("Embed description, Markdown accepted."),
        url: z.string().url().optional().describe("Link opened by the embed title."),
        color: z.union([z.string(), z.number().int()]).optional().describe("Embed color: #RRGGBB, decimal or a name (blurple, green, yellow, red, info, orange, grey)."),
        fields: z.array(field).max(25).optional().describe("Embed fields; inline true puts them side by side."),
        author: z.object({ name: z.string().min(1).max(256), url: z.string().url().optional(), icon_url: z.string().url().optional() }).optional(),
        footer: z.object({ text: z.string().min(1).max(2048), icon_url: z.string().url().optional() }).optional(),
        image: z.string().url().optional().describe("Large image URL."),
        thumbnail: z.string().url().optional().describe("Thumbnail image URL."),
        timestamp: z.string().optional().describe("`now` or an ISO 8601 date shown in the embed footer."),
        embeds: z.array(z.record(z.string(), z.unknown())).max(10).optional().describe("Extra raw Discord embed objects."),
        username: z.string().max(80).optional().describe("Display name for this message."),
        avatar_url: z.string().url().optional().describe("Avatar image URL for this message."),
        tts: z.boolean().optional(),
        thread_id: z.string().optional().describe("Post inside this existing thread."),
        thread_name: z.string().optional().describe("Create a forum post with this title (forum channels)."),
        silent: z.boolean().optional().describe("Deliver without push notifications."),
        suppress_embeds: z.boolean().optional().describe("Hide link previews of URLs in the text."),
        allow_mentions: z.boolean().optional().describe("Let @everyone, roles and users notify people. Default false."),
        payload: z.record(z.string(), z.unknown()).optional().describe("Full Discord webhook body (content, username, avatar_url, tts, embeds or the legacy single embed), e.g. an Embed Visualizer export. The other arguments override its top-level fields and append embeds."),
        dry_run: z.boolean().optional().describe("Return the JSON body without calling Discord."),
      },
    },
    async (args) => {
      try {
        const defaults = sendDefaults();
        const payload: WebhookPayload = merge(args.payload, {
          content: args.content,
          title: args.title,
          description: args.description,
          url: args.url,
          color: args.color,
          fields: args.fields,
          author: args.author?.name,
          authorUrl: args.author?.url,
          authorIcon: args.author?.icon_url,
          footer: args.footer?.text,
          footerIcon: args.footer?.icon_url,
          image: args.image,
          thumbnail: args.thumbnail,
          timestamp: args.timestamp,
          embeds: args.embeds as Embed[] | undefined,
          username: args.username ?? defaults.username,
          avatarUrl: args.avatar_url ?? defaults.avatarUrl,
          tts: args.tts,
          threadName: args.thread_name,
          silent: args.silent,
          suppressEmbeds: args.suppress_embeds,
          allowMentions: args.allow_mentions,
        });
        if (args.dry_run) return ok({ channel: args.channel, dryRun: true, payload });
        const message = await sendMessage(getWebhookUrl(args.channel), payload, { threadId: args.thread_id });
        return ok({ channel: args.channel, sent: true, message });
      } catch (e) {
        return fail(e);
      }
    },
  );
}

/** Merges a raw body with the flat arguments, then validates the result. */
function merge(raw: Record<string, unknown> | undefined, input: MessageInput): WebhookPayload {
  if (!raw) return buildPayload(input);
  const base = normalizePayload(raw);
  const flat = input.content || input.title || input.description || input.fields?.length || input.image || input.author || input.embeds?.length;
  const built: WebhookPayload = flat ? buildPayload(input) : buildPayload({ ...input, content: "\u200b" });
  if (!flat) delete built.content;
  const payload: WebhookPayload = { ...base, ...built, embeds: [...(base.embeds ?? []), ...(built.embeds ?? [])] };
  if (!payload.embeds?.length) delete payload.embeds;
  if (!input.allowMentions && base.allowed_mentions) payload.allowed_mentions = base.allowed_mentions;
  validatePayload(payload);
  return payload;
}
