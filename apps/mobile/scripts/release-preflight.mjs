#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mobileDir, "..", "..");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }
  return env;
}

function firstDefined(env, keys) {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const mergedEnv = {
  ...parseEnvFile(path.join(repoRoot, ".env")),
  ...parseEnvFile(path.join(mobileDir, ".env")),
  ...process.env,
};

const checks = [];

function addCheck(section, name, ok, details, required = true) {
  checks.push({ section, name, ok, details, required });
}

function addEnvCheck(section, label, aliases, validator = null, required = true) {
  const value = firstDefined(mergedEnv, aliases);
  const exists = value.length > 0;
  const valid = validator ? validator(value) : true;
  const ok = exists && valid;
  const source = aliases.find((alias) => mergedEnv[alias]) || "missing";
  addCheck(
    section,
    label,
    ok,
    `source=${source}; keys=${aliases.join(" | ")}`,
    required
  );
}

addEnvCheck("Env: Mobile Runtime", "Supabase URL", ["EXPO_PUBLIC_SUPABASE_URL", "SUPABASE_URL"], isValidUrl);
addEnvCheck("Env: Mobile Runtime", "Supabase Anon Key", ["EXPO_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"]);
addEnvCheck(
  "Env: Mobile Runtime",
  "Stripe Publishable Key",
  ["EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_PUBLISHABLE_KEY"],
  (value) => value.startsWith("pk_")
);
addEnvCheck("Env: Mobile Runtime", "Strava Client ID (public)", ["EXPO_PUBLIC_STRAVA_CLIENT_ID"]);
addEnvCheck("Env: Mobile Runtime", "Google Maps API Key", ["EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"]);

addEnvCheck("Env: Supabase Functions", "Supabase URL", ["SUPABASE_URL"], isValidUrl);
addEnvCheck("Env: Supabase Functions", "Supabase Service Role", ["SUPABASE_SERVICE_ROLE_KEY"]);
addEnvCheck(
  "Env: Supabase Functions",
  "Stripe Secret Key",
  ["STRIPE_SECRET_KEY"],
  (value) => value.startsWith("sk_")
);
addEnvCheck("Env: Supabase Functions", "Stripe Webhook Secret", ["STRIPE_WEBHOOK_SECRET"]);
addEnvCheck("Env: Supabase Functions", "Stripe Connect Webhook Secret", ["STRIPE_CONNECT_WEBHOOK_SECRET"]);
addEnvCheck("Env: Supabase Functions", "Strava Client ID", ["STRAVA_CLIENT_ID"]);
addEnvCheck("Env: Supabase Functions", "Strava Client Secret", ["STRAVA_CLIENT_SECRET"]);
addEnvCheck("Env: Supabase Functions", "Strava Verify Token", ["STRAVA_VERIFY_TOKEN"]);
addEnvCheck("Env: Supabase Functions", "Resend API Key", ["RESEND_API_KEY"], null, false);

const require = createRequire(import.meta.url);
const appConfigPath = path.join(mobileDir, "app.config.js");
const appConfigModule = require(appConfigPath);
const expo = appConfigModule.expo || appConfigModule.default?.expo;

if (expo) {
  addCheck("Config: Expo", "Custom scheme is corre", expo.scheme === "corre", `scheme=${expo.scheme}`);
  addCheck("Config: Expo", "iOS bundle identifier set", !!expo.ios?.bundleIdentifier, `bundleIdentifier=${expo.ios?.bundleIdentifier || "missing"}`);
  addCheck("Config: Expo", "Android package set", !!expo.android?.package, `package=${expo.android?.package || "missing"}`);
  addCheck("Config: Expo", "App version equals runtimeVersion", expo.version === expo.runtimeVersion, `version=${expo.version}; runtimeVersion=${expo.runtimeVersion}`);

  const infoPlist = expo.ios?.infoPlist || {};
  addCheck("Config: iOS", "Camera usage description", !!infoPlist.NSCameraUsageDescription, "NSCameraUsageDescription");
  addCheck("Config: iOS", "Location usage description", !!infoPlist.NSLocationWhenInUseUsageDescription, "NSLocationWhenInUseUsageDescription");
  addCheck("Config: iOS", "Photo library usage description", !!infoPlist.NSPhotoLibraryUsageDescription, "NSPhotoLibraryUsageDescription");

  const blockedPermissions = expo.android?.blockedPermissions || [];
  addCheck(
    "Config: Android",
    "Blocked SYSTEM_ALERT_WINDOW",
    blockedPermissions.includes("android.permission.SYSTEM_ALERT_WINDOW"),
    "android.permission.SYSTEM_ALERT_WINDOW"
  );
  addCheck(
    "Config: Android",
    "Blocked WRITE_EXTERNAL_STORAGE",
    blockedPermissions.includes("android.permission.WRITE_EXTERNAL_STORAGE"),
    "android.permission.WRITE_EXTERNAL_STORAGE"
  );
  addCheck(
    "Config: Android",
    "Blocked RECORD_AUDIO",
    blockedPermissions.includes("android.permission.RECORD_AUDIO"),
    "android.permission.RECORD_AUDIO"
  );
} else {
  addCheck("Config: Expo", "App config load", false, "Could not load app.config.js");
}

const easJsonPath = path.join(mobileDir, "eas.json");
const eas = JSON.parse(fs.readFileSync(easJsonPath, "utf8"));
const prod = eas.build?.production || {};
addCheck("Config: EAS", "Production autoIncrement enabled", prod.autoIncrement === true, `autoIncrement=${String(prod.autoIncrement)}`);
const configuredProductionEnv =
  prod.env?.EXPO_PUBLIC_APP_ENV ||
  prod.env?.APP_ENV ||
  firstDefined(mergedEnv, ["EXPO_PUBLIC_APP_ENV", "APP_ENV"]);
addCheck(
  "Config: EAS",
  "Production app env is set to production",
  configuredProductionEnv === "production",
  `value=${configuredProductionEnv || "missing"}`
);
const configuredPasswordResetUrl =
  prod.env?.EXPO_PUBLIC_PASSWORD_RESET_URL ||
  firstDefined(mergedEnv, ["EXPO_PUBLIC_PASSWORD_RESET_URL"]);
addCheck(
  "Config: EAS",
  "Password reset URL configured",
  configuredPasswordResetUrl.startsWith("https://"),
  `value=${configuredPasswordResetUrl || "missing"}`
);
addCheck(
  "Config: EAS",
  "Android production build type is app-bundle",
  prod.android?.buildType === "app-bundle",
  `buildType=${prod.android?.buildType || "missing"}`
);

const manifestPath = path.join(mobileDir, "android", "app", "src", "main", "AndroidManifest.xml");
const manifest = fs.readFileSync(manifestPath, "utf8");
for (const permission of [
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.RECORD_AUDIO",
]) {
  addCheck(
    "Config: Android Manifest",
    `No ${permission}`,
    !manifest.includes(permission),
    permission
  );
}

const stravaMobilePath = path.join(mobileDir, "src", "services", "supabase", "strava.ts");
const stravaAuthPath = path.join(repoRoot, "supabase", "functions", "strava-auth", "index.ts");
const stravaMobile = fs.readFileSync(stravaMobilePath, "utf8");
const stravaAuth = fs.readFileSync(stravaAuthPath, "utf8");

addCheck(
  "Config: Strava",
  "Mobile redirect scheme uses corre://strava-auth",
  stravaMobile.includes("const APP_REDIRECT_URL = 'corre://strava-auth';"),
  "APP_REDIRECT_URL"
);
addCheck(
  "Config: Strava",
  "Mobile redirect_uri uses edge function",
  stravaMobile.includes("/functions/v1/strava-auth"),
  "STRAVA_REDIRECT_URI"
);
addCheck(
  "Config: Strava",
  "Edge function returns corre://strava-auth redirects",
  stravaAuth.includes("corre://strava-auth"),
  "strava-auth function"
);

const grouped = new Map();
for (const check of checks) {
  if (!grouped.has(check.section)) grouped.set(check.section, []);
  grouped.get(check.section).push(check);
}

let failedRequired = 0;
let failedOptional = 0;
let passed = 0;

console.log("Corre Mobile Release Preflight\n");
for (const [section, sectionChecks] of grouped.entries()) {
  console.log(section);
  for (const check of sectionChecks) {
    const status = check.ok ? "PASS" : check.required ? "FAIL" : "WARN";
    console.log(`- [${status}] ${check.name} (${check.details})`);
    if (check.ok) {
      passed += 1;
    } else if (check.required) {
      failedRequired += 1;
    } else {
      failedOptional += 1;
    }
  }
  console.log("");
}

console.log(`Summary: ${passed} passed, ${failedRequired} failed, ${failedOptional} warnings`);
console.log("");
console.log("Manual store checks still required:");
console.log("- App Store Connect metadata, screenshots, and support URL");
console.log("- Google Play Data Safety form and content rating");
console.log("- Privacy Policy URL and in-app account deletion flow verification");

if (failedRequired > 0) {
  process.exitCode = 1;
}
