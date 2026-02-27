#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "corre-strava-local", version: "0.1.0" };
const JSONRPC = "2.0";

const ENV = loadEnv();

const TOOLS = [
  {
    name: "strava_build_authorize_url",
    description:
      "Build a Strava OAuth authorize URL with optional generated state.",
    inputSchema: {
      type: "object",
      properties: {
        redirect_uri: { type: "string" },
        scope: { type: "string", default: "read,activity:read_all" },
        approval_prompt: { type: "string", default: "auto" },
        state: { type: "string" },
        generate_state: { type: "boolean", default: true },
        client_id: { type: "string" },
      },
      required: ["redirect_uri"],
    },
  },
  {
    name: "strava_exchange_code",
    description:
      "Exchange an OAuth code for Strava access/refresh tokens (tokens are redacted by default).",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string" },
        redirect_uri: { type: "string" },
        client_id: { type: "string" },
        client_secret: { type: "string" },
        reveal_tokens: { type: "boolean", default: false },
      },
      required: ["code", "redirect_uri"],
    },
  },
  {
    name: "strava_refresh_token",
    description:
      "Refresh a Strava access token using a refresh token (tokens are redacted by default).",
    inputSchema: {
      type: "object",
      properties: {
        refresh_token: { type: "string" },
        client_id: { type: "string" },
        client_secret: { type: "string" },
        reveal_tokens: { type: "boolean", default: false },
      },
      required: ["refresh_token"],
    },
  },
  {
    name: "strava_get_athlete",
    description: "Fetch the current athlete profile using an access token.",
    inputSchema: {
      type: "object",
      properties: {
        access_token: { type: "string" },
      },
      required: ["access_token"],
    },
  },
  {
    name: "strava_list_activities",
    description: "List activities for the authenticated athlete.",
    inputSchema: {
      type: "object",
      properties: {
        access_token: { type: "string" },
        page: { type: "number", default: 1 },
        per_page: { type: "number", default: 20 },
        before: {
          oneOf: [{ type: "number" }, { type: "string" }],
          description: "Unix timestamp",
        },
        after: {
          oneOf: [{ type: "number" }, { type: "string" }],
          description: "Unix timestamp",
        },
      },
      required: ["access_token"],
    },
  },
  {
    name: "strava_get_activity",
    description: "Fetch a specific Strava activity by ID.",
    inputSchema: {
      type: "object",
      properties: {
        access_token: { type: "string" },
        activity_id: { type: "number" },
      },
      required: ["access_token", "activity_id"],
    },
  },
  {
    name: "strava_get_rate_limits",
    description:
      "Fetch current API usage/rate-limit headers by calling the athlete endpoint.",
    inputSchema: {
      type: "object",
      properties: {
        access_token: { type: "string" },
      },
      required: ["access_token"],
    },
  },
  {
    name: "strava_verify_webhook_challenge",
    description:
      "Verify webhook challenge parameters the same way your backend should validate them.",
    inputSchema: {
      type: "object",
      properties: {
        hub_mode: { type: "string" },
        hub_verify_token: { type: "string" },
        hub_challenge: { type: "string" },
        expected_verify_token: { type: "string" },
      },
      required: ["hub_mode", "hub_verify_token", "hub_challenge"],
    },
  },
  {
    name: "strava_validate_corre_integration",
    description:
      "Validate key Strava integration consistency in this repo (scheme, callback URLs, webhook token env).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

main();

function main() {
  process.stdin.on("error", () => {});
  process.stdout.on("error", () => {});
  process.stdin.resume();

  let buffer = Buffer.alloc(0);
  process.stdin.on("data", async (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const header = buffer.slice(0, headerEnd).toString("utf8");
      const lenMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!lenMatch) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = Number(lenMatch[1]);
      const frameLength = headerEnd + 4 + contentLength;
      if (buffer.length < frameLength) return;

      const body = buffer
        .slice(headerEnd + 4, headerEnd + 4 + contentLength)
        .toString("utf8");
      buffer = buffer.slice(frameLength);

      let message;
      try {
        message = JSON.parse(body);
      } catch (error) {
        writeMessage({
          jsonrpc: JSONRPC,
          id: null,
          error: { code: -32700, message: "Parse error", data: String(error) },
        });
        continue;
      }

      await handleMessage(message);
    }
  });
}

async function handleMessage(msg) {
  // Notifications do not require responses.
  if (!("id" in msg) && msg.method) return;

  if (!msg.method) {
    writeMessage({
      jsonrpc: JSONRPC,
      id: msg.id ?? null,
      error: { code: -32600, message: "Invalid Request" },
    });
    return;
  }

  try {
    switch (msg.method) {
      case "initialize": {
        writeMessage({
          jsonrpc: JSONRPC,
          id: msg.id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
          },
        });
        return;
      }
      case "tools/list": {
        writeMessage({
          jsonrpc: JSONRPC,
          id: msg.id,
          result: { tools: TOOLS },
        });
        return;
      }
      case "tools/call": {
        const { name, arguments: args } = msg.params || {};
        const result = await callTool(name, args || {});
        writeMessage({
          jsonrpc: JSONRPC,
          id: msg.id,
          result,
        });
        return;
      }
      case "ping": {
        writeMessage({
          jsonrpc: JSONRPC,
          id: msg.id,
          result: {},
        });
        return;
      }
      default:
        writeMessage({
          jsonrpc: JSONRPC,
          id: msg.id,
          error: { code: -32601, message: `Method not found: ${msg.method}` },
        });
    }
  } catch (error) {
    writeMessage({
      jsonrpc: JSONRPC,
      id: msg.id,
      error: {
        code: -32000,
        message: error?.message || "Server error",
        data: errorStack(error),
      },
    });
  }
}

async function callTool(name, args) {
  switch (name) {
    case "strava_build_authorize_url":
      return ok(await buildAuthorizeUrl(args));
    case "strava_exchange_code":
      return ok(await exchangeCode(args));
    case "strava_refresh_token":
      return ok(await refreshToken(args));
    case "strava_get_athlete":
      return ok(await getAthlete(args));
    case "strava_list_activities":
      return ok(await listActivities(args));
    case "strava_get_activity":
      return ok(await getActivity(args));
    case "strava_get_rate_limits":
      return ok(await getRateLimits(args));
    case "strava_verify_webhook_challenge":
      return ok(verifyWebhookChallenge(args));
    case "strava_validate_corre_integration":
      return ok(validateCorreIntegration());
    default:
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
  }
}

function ok(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function writeMessage(obj) {
  const json = JSON.stringify(obj);
  const header = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n`;
  process.stdout.write(header + json);
}

function getEnv(key, fallback = "") {
  return process.env[key] || ENV[key] || fallback;
}

function requireValue(name, value) {
  if (!value) {
    throw new Error(`Missing required value: ${name}`);
  }
  return value;
}

function redact(token) {
  if (!token) return "";
  if (token.length <= 8) return "********";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function defaultRedirectUri() {
  const explicit = getEnv("STRAVA_REDIRECT_URI");
  if (explicit) return explicit;
  const supabaseUrl = getEnv("SUPABASE_URL");
  if (supabaseUrl) return `${supabaseUrl}/functions/v1/strava-auth`;
  return "";
}

async function stravaTokenRequest(fields) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Strava token request failed (${response.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
}

function formatRateHeaders(headers) {
  return {
    limit: headers.get("x-ratelimit-limit"),
    usage: headers.get("x-ratelimit-usage"),
    read_rate_limit_limit: headers.get("x-readratelimit-limit"),
    read_rate_limit_usage: headers.get("x-readratelimit-usage"),
    accepted_scopes: headers.get("x-accepted-oauth-scopes"),
    token_scopes: headers.get("x-oauth-scopes"),
  };
}

async function buildAuthorizeUrl(args) {
  const clientId = args.client_id || getEnv("STRAVA_CLIENT_ID");
  const redirectUri = args.redirect_uri || defaultRedirectUri();
  requireValue("client_id", clientId);
  requireValue("redirect_uri", redirectUri);

  let state = args.state || "";
  const shouldGenerateState =
    args.generate_state === undefined ? true : Boolean(args.generate_state);
  if (!state && shouldGenerateState) {
    state = crypto.randomBytes(24).toString("hex");
  }

  const query = new URLSearchParams({
    client_id: String(clientId),
    redirect_uri: String(redirectUri),
    response_type: "code",
    scope: String(args.scope || "read,activity:read_all"),
    approval_prompt: String(args.approval_prompt || "auto"),
  });
  if (state) query.set("state", state);

  return {
    authorize_url: `https://www.strava.com/oauth/authorize?${query.toString()}`,
    state,
    client_id: String(clientId),
    redirect_uri: String(redirectUri),
  };
}

async function exchangeCode(args) {
  const clientId = args.client_id || getEnv("STRAVA_CLIENT_ID");
  const clientSecret = args.client_secret || getEnv("STRAVA_CLIENT_SECRET");
  const redirectUri = args.redirect_uri || defaultRedirectUri();
  const code = requireValue("code", args.code);
  requireValue("client_id", clientId);
  requireValue("client_secret", clientSecret);
  requireValue("redirect_uri", redirectUri);

  const data = await stravaTokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });

  const reveal = Boolean(args.reveal_tokens);
  return {
    token_type: data.token_type,
    expires_at: data.expires_at,
    expires_in: data.expires_in,
    athlete: data.athlete || null,
    access_token: reveal ? data.access_token : redact(data.access_token),
    refresh_token: reveal ? data.refresh_token : redact(data.refresh_token),
  };
}

async function refreshToken(args) {
  const clientId = args.client_id || getEnv("STRAVA_CLIENT_ID");
  const clientSecret = args.client_secret || getEnv("STRAVA_CLIENT_SECRET");
  const refresh = requireValue("refresh_token", args.refresh_token);
  requireValue("client_id", clientId);
  requireValue("client_secret", clientSecret);

  const data = await stravaTokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refresh,
    grant_type: "refresh_token",
  });

  const reveal = Boolean(args.reveal_tokens);
  return {
    token_type: data.token_type,
    expires_at: data.expires_at,
    expires_in: data.expires_in,
    athlete: data.athlete || null,
    access_token: reveal ? data.access_token : redact(data.access_token),
    refresh_token: reveal ? data.refresh_token : redact(data.refresh_token),
  };
}

async function stravaGet(url, accessToken) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${requireValue("access_token", accessToken)}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Strava API GET failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return {
    data,
    headers: formatRateHeaders(response.headers),
  };
}

async function getAthlete(args) {
  return await stravaGet("https://www.strava.com/api/v3/athlete", args.access_token);
}

async function listActivities(args) {
  const page = Number(args.page || 1);
  const perPage = Number(args.per_page || 20);
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (args.before !== undefined) query.set("before", String(args.before));
  if (args.after !== undefined) query.set("after", String(args.after));

  return await stravaGet(
    `https://www.strava.com/api/v3/athlete/activities?${query.toString()}`,
    args.access_token
  );
}

async function getActivity(args) {
  const activityId = requireValue("activity_id", args.activity_id);
  return await stravaGet(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    args.access_token
  );
}

async function getRateLimits(args) {
  const result = await stravaGet(
    "https://www.strava.com/api/v3/athlete",
    args.access_token
  );
  return {
    headers: result.headers,
  };
}

function verifyWebhookChallenge(args) {
  const expected =
    args.expected_verify_token || getEnv("STRAVA_VERIFY_TOKEN", "");
  if (!expected) {
    throw new Error("Missing expected verify token (expected_verify_token or STRAVA_VERIFY_TOKEN)");
  }

  const mode = String(args.hub_mode || "");
  const verifyToken = String(args.hub_verify_token || "");
  const challenge = String(args.hub_challenge || "");
  const okMatch =
    mode === "subscribe" && verifyToken === expected && challenge.length > 0;

  return okMatch
    ? {
        verified: true,
        status: 200,
        body: { "hub.challenge": challenge },
      }
    : {
        verified: false,
        status: 400,
        body: { error: "Invalid verification request" },
      };
}

function validateCorreIntegration() {
  const root = process.cwd();
  const files = {
    appConfig: path.join(root, "apps/mobile/app.config.js"),
    stravaMobile: path.join(root, "apps/mobile/src/services/supabase/strava.ts"),
    stravaAuthFn: path.join(root, "supabase/functions/strava-auth/index.ts"),
    webhookFn: path.join(root, "supabase/functions/strava-webhook/index.ts"),
  };

  const checks = [];

  const scheme = readRegex(files.appConfig, /scheme:\s*['"]([^'"]+)['"]/);
  checks.push({
    name: "mobile_scheme",
    file: rel(files.appConfig),
    expected: "corre",
    actual: scheme || null,
    ok: scheme === "corre",
  });

  const mobileRedirect = readRegex(
    files.stravaMobile,
    /APP_REDIRECT_URL\s*=\s*['"]([^'"]+)['"]/
  );
  checks.push({
    name: "mobile_redirect_url",
    file: rel(files.stravaMobile),
    expectedPrefix: "corre://strava-auth",
    actual: mobileRedirect || null,
    ok: Boolean(mobileRedirect && mobileRedirect.startsWith("corre://strava-auth")),
  });

  const functionRedirects = readAllRegex(
    files.stravaAuthFn,
    /generateHtmlRedirect\("([^"]+)"\)/g
  );
  checks.push({
    name: "auth_function_redirect_scheme",
    file: rel(files.stravaAuthFn),
    expectedPrefix: "corre://strava-auth",
    count: functionRedirects.length,
    ok:
      functionRedirects.length > 0 &&
      functionRedirects.every((v) => v.startsWith("corre://strava-auth")),
    samples: functionRedirects.slice(0, 5),
  });

  const verifyTokenFallback = fileIncludes(
    files.webhookFn,
    "|| 'CORRE_STRAVA_VERIFY'"
  );
  checks.push({
    name: "webhook_verify_token_no_default",
    file: rel(files.webhookFn),
    expected: "no hardcoded fallback",
    ok: !verifyTokenFallback,
  });

  const envRecommendations = {
    STRAVA_CLIENT_ID: Boolean(getEnv("STRAVA_CLIENT_ID")),
    STRAVA_CLIENT_SECRET: Boolean(getEnv("STRAVA_CLIENT_SECRET")),
    STRAVA_VERIFY_TOKEN: Boolean(getEnv("STRAVA_VERIFY_TOKEN")),
    SUPABASE_URL: Boolean(getEnv("SUPABASE_URL")),
    EXPO_PUBLIC_STRAVA_CLIENT_ID: Boolean(getEnv("EXPO_PUBLIC_STRAVA_CLIENT_ID")),
  };

  return {
    summary: {
      passed: checks.filter((c) => c.ok).length,
      total: checks.length,
    },
    checks,
    envRecommendations,
  };
}

function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "apps/mobile/.env"),
  ];
  const parsed = {};

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in parsed)) parsed[key] = value;
    }
  }
  return parsed;
}

function readRegex(file, regex) {
  try {
    const content = fs.readFileSync(file, "utf8");
    const match = content.match(regex);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

function readAllRegex(file, regex) {
  try {
    const content = fs.readFileSync(file, "utf8");
    const matches = [];
    let m;
    while ((m = regex.exec(content)) !== null) {
      if (m[1]) matches.push(m[1]);
    }
    return matches;
  } catch {
    return [];
  }
}

function fileIncludes(file, snippet) {
  try {
    return fs.readFileSync(file, "utf8").includes(snippet);
  } catch {
    return false;
  }
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

function errorStack(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.stack || error.message || JSON.stringify(error);
}
