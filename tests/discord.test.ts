/**
 * Discordfy end to end: webhooks address book, send with embeds and the
 * Discord API client, against a local Bun.serve that stands in for Discord
 * (DISCORDFY_API_BASE). Each run uses an isolated DISCORDFY_HOME.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOME_VARIABLE } from "../src/config/paths.ts";
import { API_BASE_VARIABLE } from "../src/discord/api.ts";
import { buildPayload, parseColor, parseField } from "../src/discord/message.ts";
import { maskWebhookUrl, parseWebhookUrl, validateChannel } from "../src/discord/webhooks.ts";

const ID = "123456789012345678";
const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-tokenTOKEN";
const URL_OK = `https://discord.com/api/webhooks/${ID}/${TOKEN}`;
const URL_GONE = `https://discordapp.com/api/v10/webhooks/987654321098765432/${TOKEN}`;

let dir: string;
let server: ReturnType<typeof Bun.serve>;
const received: Array<{ method: string; path: string; query: string; body: unknown }> = [];

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "discordfy-"));
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const body = req.method === "POST" || req.method === "PATCH" ? await req.json() : undefined;
      received.push({ method: req.method, path: url.pathname, query: url.search, body });
      if (url.pathname.includes("987654321098765432")) return Response.json({ message: "Unknown Webhook", code: 10015 }, { status: 404 });
      if (req.method === "PATCH") return Response.json({ id: ID, name: (body as { name?: string }).name ?? "Deploy bot", channel_id: "42" });
      if (req.method === "GET") return Response.json({ id: ID, name: "Deploy bot", channel_id: "42", guild_id: "7" });
      return Response.json({ id: "555", channel_id: "42", timestamp: "2026-11-24T10:00:00+00:00" });
    },
  });
});
afterAll(() => {
  server.stop(true);
  rmSync(dir, { recursive: true, force: true });
});

async function run(args: string[], stdin?: string) {
  const proc = Bun.spawn(["bun", "run", "src/main.ts", ...args], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, [HOME_VARIABLE]: dir, [API_BASE_VARIABLE]: `http://localhost:${server.port}`, NO_COLOR: "1" },
    stdin: stdin === undefined ? "ignore" : new Response(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return { code: await proc.exited, stdout, stderr };
}

describe("domain", () => {
  test("parses and canonicalizes webhook URLs", () => {
    expect(parseWebhookUrl(URL_GONE).url).toBe(`https://discord.com/api/webhooks/987654321098765432/${TOKEN}`);
    expect(() => parseWebhookUrl("https://example.com/api/webhooks/1/2")).toThrow();
    expect(() => parseWebhookUrl(`http://discord.com/api/webhooks/${ID}/${TOKEN}`)).toThrow();
  });
  test("masks the token", () => {
    const masked = maskWebhookUrl(URL_OK);
    expect(masked).toContain(ID);
    expect(masked).not.toContain(TOKEN);
  });
  test("validates channel names", () => {
    expect(validateChannel("#Deploys")).toBe("deploys");
    expect(() => validateChannel("bad name")).toThrow();
  });
  test("colors and fields", () => {
    expect(parseColor("#5865F2")).toBe(0x5865f2);
    expect(parseColor("green")).toBe(0x57f287);
    expect(parseColor("16711680")).toBe(16711680);
    expect(() => parseColor("nope")).toThrow();
    expect(parseField("Branch=main", true)).toEqual({ name: "Branch", value: "main", inline: true });
  });
  test("builds a payload with mentions disabled and flags", () => {
    const p = buildPayload({ content: "hi", title: "T", color: "red", silent: true, suppressEmbeds: true });
    expect(p.allowed_mentions).toEqual({ parse: [] });
    expect(p.flags).toBe(4100);
    expect(p.embeds?.[0]?.color).toBe(0xed4245);
  });
  test("enforces Discord limits", () => {
    expect(() => buildPayload({ content: "x".repeat(2001) })).toThrow();
    expect(() => buildPayload({})).toThrow();
    expect(() => buildPayload({ content: "a", username: "My Discord bot" })).toThrow();
  });
});

describe("cli", () => {
  test("add verifies and saves; list masks", async () => {
    const add = await run(["webhooks", "add", "deploys", "--stdin", "--json"], `${URL_OK}\n`);
    expect(add.code).toBe(0);
    const data = JSON.parse(add.stdout).data;
    expect(data.verified).toBe(true);
    expect(data.webhook.name).toBe("Deploy bot");
    expect(add.stdout).not.toContain(TOKEN);

    const list = await run(["webhooks", "list", "--json"]);
    expect(list.code).toBe(0);
    expect(list.stdout).not.toContain(TOKEN);
    expect(JSON.parse(list.stdout).data.webhooks[0].channel).toBe("deploys");

    const reveal = await run(["webhooks", "list", "--reveal", "--json"]);
    expect(JSON.parse(reveal.stdout).data.webhooks[0].url).toBe(URL_OK);
  });

  test("add refuses duplicates without --force and rejects dead webhooks", async () => {
    expect((await run(["webhooks", "add", "deploys", "--stdin"], URL_OK)).code).toBe(2);
    expect((await run(["webhooks", "add", "gone", "--stdin"], URL_GONE)).code).toBe(5);
  });

  test("send posts content, embed fields and query", async () => {
    received.length = 0;
    const r = await run([
      "send", "deploys", "Deploy", "done", "--title", "v1.4.0", "--color", "green",
      "--field", "Branch=main", "--inline-field", "Time=42s", "--inline-field", "Tests=ok", "--timestamp", "--thread-id", "99", "--json",
    ]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).data.message.id).toBe("555");
    const post = received.find((x) => x.method === "POST")!;
    expect(post.query).toContain("wait=true");
    expect(post.query).toContain("thread_id=99");
    const body = post.body as { content: string; embeds: Array<{ fields: unknown[]; timestamp: string }> };
    expect(body.content).toBe("Deploy done");
    expect(body.embeds[0]!.fields).toHaveLength(3);
    expect(body.embeds[0]!.timestamp).toBeTruthy();
  });

  test("send requires a known channel", async () => {
    expect((await run(["send"])).code).toBe(2);
    const r = await run(["send", "unknown", "hi", "--json"]);
    expect(r.code).toBe(6);
    expect(JSON.parse(r.stdout).error.details.known).toEqual(["deploys"]);
  });

  test("dry run and payload file", async () => {
    const file = join(dir, "payload.json");
    writeFileSync(file, JSON.stringify({ embeds: [{ title: "From file" }] }));
    received.length = 0;
    const r = await run(["send", "deploys", "--payload", file, "--username", "Bot", "--dry-run", "--json"]);
    expect(r.code).toBe(0);
    const payload = JSON.parse(r.stdout).data.payload;
    expect(payload.embeds[0].title).toBe("From file");
    expect(payload.username).toBe("Bot");
    expect(received).toHaveLength(0);
  });

  test("sends the full Embed Visualizer payload (legacy single embed)", async () => {
    received.length = 0;
    const r = await run(["send", "deploys", "--payload", join(import.meta.dir, "..", "examples", "embed-visualizer.json"), "--json"]);
    expect(r.code).toBe(0);
    const body = received.find((x) => x.method === "POST")!.body as { content: string; embed?: unknown; embeds: Array<Record<string, any>> };
    expect(body.embed).toBeUndefined();
    expect(body.embeds).toHaveLength(1);
    const e = body.embeds[0]!;
    expect(e.color).toBe(5460938);
    expect(e.author.icon_url).toContain("avatars/0.png");
    expect(e.footer.text).toBe("footer text");
    expect(e.fields).toHaveLength(5);
    expect(e.fields[4].inline).toBe(true);
    expect(body.content).toContain("console.log");
  });

  test("--embed adds extra embeds", async () => {
    const r = await run(["send", "deploys", "--title", "One", "--embed", '{"title":"Two","color":"red"}', "--embed", '{"description":"Three"}', "--dry-run", "--json"]);
    expect(r.code).toBe(0);
    const embeds = JSON.parse(r.stdout).data.payload.embeds;
    expect(embeds.map((e: { title?: string }) => e.title)).toEqual(["One", "Two", undefined]);
    expect(embeds[1].color).toBe(0xed4245);
  });

  test("webhooks edit patches name and avatar", async () => {
    const avatar = join(dir, "bot.png");
    writeFileSync(avatar, new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
    received.length = 0;
    const r = await run(["webhooks", "edit", "deploys", "--name", "Deploy bot 2", "--avatar", avatar, "--json"]);
    expect(r.code).toBe(0);
    const patch = received.find((x) => x.method === "PATCH")!.body as { name: string; avatar: string };
    expect(patch.name).toBe("Deploy bot 2");
    expect(patch.avatar.startsWith("data:image/png;base64,")).toBe(true);
    expect((await run(["webhooks", "edit", "deploys", "--name", "discord helper"])).code).toBe(2);
  });

  test("test, rename and remove", async () => {
    expect((await run(["webhooks", "test", "deploys"])).code).toBe(0);
    expect((await run(["webhooks", "rename", "deploys", "prod"])).code).toBe(0);
    expect((await run(["webhooks", "remove", "prod", "--yes", "--json"])).stdout).toContain('"removed": true');
  });
});

describe("parser", () => {
  test("--payload - reads stdin", async () => {
    const r = await run(["send", "anything", "--payload", "-", "--dry-run", "--json"], '{"content":"from stdin"}');
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).data.payload.content).toBe("from stdin");
  });
});
