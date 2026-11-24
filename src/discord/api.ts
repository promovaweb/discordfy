/**
 * HTTP client for Discord webhooks.
 *
 * `sendMessage` posts a payload with `?wait=true`, so Discord answers with the
 * created message (id, channel and timestamp) instead of an empty 204.
 * `webhookInfo` reads the webhook itself (name, channel id, guild id) with a
 * GET that sends nothing to the channel; it is how `webhooks test` and
 * `webhooks add` confirm that a URL works.
 *
 * A 429 is retried once after `retry_after` when the wait is up to 10 seconds.
 * Errors never include the webhook URL or token. The variable
 * `DISCORDFY_API_BASE` replaces `https://discord.com`; it exists for tests.
 */
import { error } from "../app/errors.ts";
import { manifest } from "../app/manifest.ts";
import type { WebhookPayload } from "./message.ts";

/** Variable that redirects the API base URL (tests only). */
export const API_BASE_VARIABLE = `${manifest.envPrefix}_API_BASE`;

const TIMEOUT_MS = 15_000;

/** Message created by Discord. */
export interface SentMessage {
  id: string;
  channel_id: string;
  timestamp: string;
}

/** Public data of a webhook. */
export interface WebhookInfo {
  id: string;
  name: string;
  channel_id: string;
  guild_id?: string;
}

function endpoint(url: string, query?: Record<string, string | undefined>): string {
  const base = process.env[API_BASE_VARIABLE];
  const target = new URL(base ? url.replace("https://discord.com", base.replace(/\/$/, "")) : url);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== "") target.searchParams.set(k, v);
  return target.toString();
}

async function request(url: string, init: RequestInit, retried = false): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", "User-Agent": `DiscordBot (${manifest.repository ?? "https://github.com/promovaweb/discordfy"}, ${manifest.version})`, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const reason = e instanceof Error && e.name === "TimeoutError" ? `no answer in ${TIMEOUT_MS / 1000}s` : "network failure";
    throw error.network(`Could not reach Discord (${reason}).`);
  }
  if (response.status === 429 && !retried) {
    const body = (await response.json().catch(() => ({}))) as { retry_after?: number };
    const wait = Number(body.retry_after ?? response.headers.get("retry-after") ?? 0);
    if (wait > 0 && wait <= 10) {
      await Bun.sleep(Math.ceil(wait * 1000));
      return request(url, init, true);
    }
    throw error.network(`Discord rate limit: try again in ${Math.ceil(wait)}s.`, { status: 429, retryAfter: wait });
  }
  return response;
}

async function fail(response: Response): Promise<never> {
  const body = (await response.json().catch(() => ({}))) as { message?: string; code?: number; errors?: unknown };
  const detail = body.message ? `${body.message}${body.code ? ` (code ${body.code})` : ""}` : response.statusText;
  if (response.status === 401 || response.status === 404) {
    throw error.network(`Discord rejected the webhook (HTTP ${response.status}: ${detail}). It may have been deleted; save a new URL with webhooks add --force.`, {
      status: response.status,
    });
  }
  throw error.network(`Discord answered HTTP ${response.status}: ${detail}.`, {
    status: response.status,
    ...(body.errors ? { errors: body.errors } : {}),
  });
}

/** Sends a message and returns what Discord created. */
export async function sendMessage(
  webhookUrl: string,
  payload: WebhookPayload,
  options: { threadId?: string } = {},
): Promise<SentMessage> {
  const response = await request(endpoint(webhookUrl, { wait: "true", thread_id: options.threadId }), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) return fail(response);
  const body = (await response.json().catch(() => ({}))) as Partial<SentMessage>;
  return { id: String(body.id ?? ""), channel_id: String(body.channel_id ?? ""), timestamp: String(body.timestamp ?? "") };
}

/** Reads the webhook data without posting anything. */
export async function webhookInfo(webhookUrl: string): Promise<WebhookInfo> {
  const response = await request(endpoint(webhookUrl), { method: "GET" });
  if (!response.ok) return fail(response);
  const body = (await response.json().catch(() => ({}))) as Partial<WebhookInfo>;
  return {
    id: String(body.id ?? ""),
    name: String(body.name ?? ""),
    channel_id: String(body.channel_id ?? ""),
    ...(body.guild_id ? { guild_id: String(body.guild_id) } : {}),
  };
}

/** Changes for the webhook profile. `avatar: null` removes the avatar. */
export interface WebhookProfile {
  name?: string;
  /** Data URI (image/png, image/jpeg or image/gif) or null to clear. */
  avatar?: string | null;
}

/** Changes the default name and avatar of the webhook in Discord (PATCH with token). */
export async function modifyWebhook(webhookUrl: string, profile: WebhookProfile): Promise<WebhookInfo> {
  const response = await request(endpoint(webhookUrl), { method: "PATCH", body: JSON.stringify(profile) });
  if (!response.ok) return fail(response);
  const body = (await response.json().catch(() => ({}))) as Partial<WebhookInfo>;
  return { id: String(body.id ?? ""), name: String(body.name ?? ""), channel_id: String(body.channel_id ?? ""), ...(body.guild_id ? { guild_id: String(body.guild_id) } : {}) };
}

const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif" };

/**
 * Loads an avatar from a local file or an http(s) URL and returns it as a
 * data URI, the format Discord expects. PNG, JPEG and GIF up to 8 MB.
 */
export async function avatarDataUri(source: string): Promise<string> {
  let bytes: Uint8Array;
  let type: string | undefined;
  if (/^https?:\/\//i.test(source)) {
    let response: Response;
    try {
      response = await fetch(source, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw error.network(`Could not download the avatar from ${source}.`);
    }
    if (!response.ok) throw error.network(`The avatar URL answered HTTP ${response.status}.`);
    type = response.headers.get("content-type")?.split(";")[0]?.trim();
    bytes = new Uint8Array(await response.arrayBuffer());
  } else {
    const file = Bun.file(source);
    if (!(await file.exists())) throw error.notFound(`Avatar file not found: ${source}`, { file: source });
    bytes = new Uint8Array(await file.arrayBuffer());
    type = IMAGE_TYPES[source.split(".").pop()?.toLowerCase() ?? ""];
  }
  if (!type || !Object.values(IMAGE_TYPES).includes(type)) throw error.usage("The avatar must be a PNG, JPEG or GIF image.");
  if (bytes.byteLength > 8 * 1024 * 1024) throw error.usage("The avatar must be up to 8 MB.");
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}
