/**
 * Discord tools over a real MCP stdio session, against a local Bun.serve
 * standing in for Discord (DISCORDFY_API_BASE) and an isolated DISCORDFY_HOME.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { HOME_VARIABLE } from "../src/config/paths.ts";
import { API_BASE_VARIABLE } from "../src/discord/api.ts";

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-tokenTOKEN";
const URL_OK = `https://discord.com/api/webhooks/123456789012345678/${TOKEN}`;
let dir: string;
let client: Client;
let server: ReturnType<typeof Bun.serve>;
const posts: unknown[] = [];

function data(result: unknown): Record<string, any> {
  return (result as { structuredContent: Record<string, any> }).structuredContent;
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "discordfy-mcp-"));
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      if (req.method === "POST") {
        posts.push(await req.json());
        return Response.json({ id: "777", channel_id: "42", timestamp: "2026-11-24T10:00:00+00:00" });
      }
      if (req.method === "PATCH") return Response.json({ id: "1", name: ((await req.json()) as { name: string }).name, channel_id: "42" });
      return Response.json({ id: "1", name: "Bot", channel_id: "42" });
    },
  });
  const env = { ...(process.env as Record<string, string>), [HOME_VARIABLE]: dir, [API_BASE_VARIABLE]: `http://localhost:${server.port}` };
  const add = Bun.spawn(["bun", "run", "src/main.ts", "webhooks", "add", "time-dev", "--stdin"], { cwd: join(import.meta.dir, ".."), env, stdin: new Response(URL_OK), stdout: "ignore", stderr: "ignore" });
  expect(await add.exited).toBe(0);
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StdioClientTransport({ command: "bun", args: ["run", "src/main.ts", "mcp"], cwd: join(import.meta.dir, ".."), env, stderr: "pipe" }));
});

afterAll(async () => {
  await client.close();
  server.stop(true);
  rmSync(dir, { recursive: true, force: true });
});

describe("mcp discord tools", () => {
  test("webhooks_list never returns the token", async () => {
    const r = await client.callTool({ name: "webhooks_list", arguments: {} });
    expect(JSON.stringify(r)).not.toContain(TOKEN);
    expect(data(r).webhooks[0].channel).toBe("time-dev");
  });

  test("discord_send builds the embed and sends", async () => {
    const r = await client.callTool({
      name: "discord_send",
      arguments: { channel: "time-dev", title: "Tarefa concluída", color: "green", fields: [{ name: "Testes", value: "191", inline: true }], timestamp: "now" },
    });
    expect(r.isError).toBeFalsy();
    expect(data(r).message.id).toBe("777");
    const body = posts.at(-1) as { embeds: Array<{ title: string; color: number; fields: unknown[] }>; allowed_mentions: unknown };
    expect(body.embeds[0]!.title).toBe("Tarefa concluída");
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });

  test("discord_send accepts the full Embed Visualizer payload", async () => {
    const payload = JSON.parse(readFileSync(join(import.meta.dir, "..", "examples", "embed-visualizer.json"), "utf8"));
    const r = await client.callTool({ name: "discord_send", arguments: { channel: "time-dev", payload, dry_run: true } });
    expect(r.isError).toBeFalsy();
    expect(data(r).payload.embeds[0].fields).toHaveLength(5);
    expect(data(r).payload.embed).toBeUndefined();
  });

  test("unknown channel is an error with the known list", async () => {
    const r = await client.callTool({ name: "discord_send", arguments: { channel: "nope", content: "hi" } });
    expect(r.isError).toBe(true);
    expect(data(r).error.details.known).toEqual(["time-dev"]);
  });

  test("webhook_test and webhook_edit", async () => {
    expect(data(await client.callTool({ name: "webhook_test", arguments: { channel: "time-dev" } })).ok).toBe(true);
    const r = await client.callTool({ name: "webhook_edit", arguments: { channel: "time-dev", name: "Agente" } });
    expect(data(r).webhook.name).toBe("Agente");
  });
});
