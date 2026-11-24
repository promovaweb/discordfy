/**
 * Webhooks tab: the saved channels with their webhook address.
 *
 * The table shows the channel name and the address with the token masked;
 * v reveals the full URLs until pressed again. a adds a channel (name, then
 * the URL in a secret prompt, checked with Discord before saving), s sends a
 * text message to the selected channel, t checks the webhook without posting,
 * d/Delete removes after confirmation, r reloads and Up/k or Down/j changes
 * the selection. Watches credentials.json, so changes made by the CLI in
 * another terminal refresh the list.
 */
import { BoxRenderable } from "@opentui/core";
import { paths } from "../../config/paths.ts";
import { getWebhookUrl, listWebhooks, parseWebhookUrl, removeWebhook, saveWebhook, validateChannel } from "../../discord/webhooks.ts";
import { sendMessage, webhookInfo } from "../../discord/api.ts";
import { buildPayload } from "../../discord/message.ts";
import { sendDefaults } from "../../cli/commands/send.ts";
import { table, panel, scrollPanel, dim, keyValueTable, stateView } from "../components.ts";
import type { Screen, ScreenContext } from "../screen.ts";

/** Message of an error, without ever echoing a webhook URL. */
function reason(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Creates the webhook list screen. */
export function createWebhooksScreen(): Screen {
  let grid: ReturnType<typeof table> | undefined;
  let rows: Array<{ channel: string; address: string; id: string }> = [];
  let current = "";
  let reveal = false;

  function validChannel(value: string): string | undefined {
    try {
      validateChannel(value);
    } catch (error) {
      return reason(error, "Invalid channel name");
    }
  }

  function validUrl(value: string): string | undefined {
    try {
      parseWebhookUrl(value);
    } catch (error) {
      return reason(error, "Invalid webhook URL");
    }
  }

  async function add(ctx: ScreenContext): Promise<void> {
    try {
      const name = await ctx.prompt({ title: "Add webhook", label: "Channel name (e.g. deploys)", validate: validChannel });
      if (name === undefined) return;
      const channel = validateChannel(name);
      const url = await ctx.prompt({ title: `Webhook for #${channel}`, label: "Webhook URL", secret: true, validate: validUrl });
      if (url === undefined) return;
      const info = await webhookInfo(parseWebhookUrl(url).url);
      saveWebhook(channel, url, true);
      current = channel;
      ctx.refresh();
      ctx.notify(`#${channel} saved · Discord webhook "${info.name}"`, "ok");
    } catch (error) {
      ctx.notify(reason(error, "Could not save the webhook."), "error");
    }
  }

  async function send(ctx: ScreenContext): Promise<void> {
    const channel = current;
    if (!channel) return;
    try {
      const text = await ctx.prompt({
        title: `Send to #${channel}`,
        label: "Message",
        validate: (value) => (value.trim().length === 0 ? "Type a message" : value.length > 2000 ? "Up to 2000 characters" : undefined),
      });
      if (text === undefined) return;
      const message = await sendMessage(getWebhookUrl(channel), buildPayload({ content: text, ...sendDefaults() }));
      ctx.notify(`Sent to #${channel}${message.id ? ` · message ${message.id}` : ""}`, "ok");
    } catch (error) {
      ctx.notify(reason(error, "Could not send the message."), "error");
    }
  }

  async function test(ctx: ScreenContext): Promise<void> {
    const channel = current;
    if (!channel) return;
    try {
      ctx.status(`Checking #${channel}…`);
      const info = await webhookInfo(getWebhookUrl(channel));
      ctx.notify(`#${channel} works · "${info.name}" (channel ${info.channel_id})`, "ok");
    } catch (error) {
      ctx.notify(reason(error, "The webhook did not answer."), "error");
    } finally {
      ctx.status(`${rows.length} webhook${rows.length === 1 ? "" : "s"}`);
    }
  }

  async function remove(ctx: ScreenContext): Promise<void> {
    const channel = current;
    if (!channel) return;
    try {
      const ok = await ctx.confirm({ title: "Remove webhook", message: `Remove the webhook of #${channel}? It keeps existing in Discord.`, danger: true });
      if (!ok) return;
      removeWebhook(channel);
      ctx.refresh();
      ctx.notify(`#${channel} removed`, "ok");
    } catch (error) {
      ctx.notify(reason(error, "Could not remove the webhook."), "error");
    }
  }

  return {
    id: "webhooks",
    title: "Webhooks",
    icon: "link",
    description: "Saved Discord channels and their webhook address",
    watch: () => [paths.credentials(), paths.masterKey()],
    actions: [
      { keys: ["a"], description: "add", icon: "link", run: add },
      { keys: ["s", "return", "enter"], label: "s/Enter", description: "send message", icon: "agent", run: send },
      { keys: ["t"], description: "test", icon: "ok", run: test },
      {
        keys: ["v"],
        description: "reveal URLs",
        icon: "vault",
        run: (ctx) => {
          reveal = !reveal;
          ctx.refresh();
        },
      },
      { keys: ["d", "delete"], description: "remove", icon: "error", run: remove },
      { keys: ["r"], description: "reload", icon: "refresh", run: (ctx) => ctx.refresh() },
      { keys: ["up", "k"], description: "previous webhook", icon: "select", hidden: true, run: () => grid?.move(-1) },
      { keys: ["down", "j"], description: "next webhook", icon: "select", hidden: true, run: () => grid?.move(1) },
    ],
    mount(ctx) {
      const { renderer, theme, icons } = ctx;
      try {
        rows = listWebhooks().map((item) => ({
          channel: `#${item.channel}`,
          address: reveal ? getWebhookUrl(item.channel) : item.masked,
          id: item.id,
        }));
        const names = rows.map((row) => row.channel.slice(1));
        current = names.includes(current) ? current : (names[0] ?? "");
        ctx.status(`${rows.length} webhook${rows.length === 1 ? "" : "s"}${reveal ? " · URLs revealed" : ""}`);

        const compact = ctx.layout() === "compact";
        const root = new BoxRenderable(renderer, {
          flexDirection: compact ? "column" : "row",
          gap: compact ? ctx.space.gapY : ctx.space.gapX,
          height: Math.min(renderer.height - (compact ? 4 : 8), Math.max(8 + ctx.space.cardPadY * 2, rows.length + 4 + ctx.space.cardPadY * 2)),
          flexGrow: 0,
          minHeight: 0,
        });

        if (!rows.length) {
          grid = undefined;
          root.add(
            stateView(renderer, theme, icons, {
              kind: "empty",
              title: "No webhooks",
              message: "Add a channel name and paste its Discord webhook URL",
              action: { key: "a", label: "add", onPress: () => void add(ctx) },
            }),
          );
          return root;
        }

        grid = table(renderer, theme, {
          columns: [
            { key: "channel", title: "Channel", width: Math.min(24, Math.max(10, ...rows.map((row) => row.channel.length + 2))) },
            { key: "address", title: "Address" },
          ],
          rows: rows.map(({ channel, address }) => ({ channel, address })),
          onSelect: (index) => {
            current = rows[index]?.channel.slice(1) ?? "";
          },
          onActivate: () => void send(ctx),
        });
        grid.select(rows.findIndex((row) => row.channel === `#${current}`));
        const collection = panel(renderer, theme, { title: "Webhooks", flexGrow: 1, active: true });
        collection.add(grid.box);
        root.add(collection);

        if (!compact) {
          const detail = scrollPanel(renderer, theme, { title: "Vault", flexGrow: 0, width: "30%" });
          detail.add(
            keyValueTable(renderer, theme, [
              ["Webhooks", String(rows.length)],
              ["Tokens", reveal ? "revealed" : "masked"],
            ]),
          );
          detail.add(dim(renderer, theme, "v reveals or masks the URLs."));
          detail.add(dim(renderer, theme, "Stored encrypted in credentials.json."));
          root.add(detail);
        }
        return root;
      } catch (error) {
        grid = undefined;
        ctx.status("Vault unavailable");
        ctx.notify(reason(error, "Could not open the vault"), "error");
        return stateView(renderer, theme, icons, {
          kind: "error",
          title: "Unable to read the webhooks",
          message: "Check credentials.json and the master key.",
          action: { key: "r", label: "reload", onPress: ctx.refresh },
        });
      }
    },
  };
}

/** Default webhooks tab registered by the shell. */
export const webhooksScreen = createWebhooksScreen();
