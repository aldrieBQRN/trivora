#!/usr/bin/env node
/**
 * Dev-only: keeps the Laravel API reachable from physical phones through a FIXED ngrok hostname,
 * so the Passenger/Driver apps' EXPO_PUBLIC_API_URL never changes when you switch Wi-Fi.
 *
 * - Runs `ngrok http <port> --url=<domain>` with ngrok.dev.yml merged over your personal config.
 * - Restarts ngrok if it exits, with backoff; gives up (loudly) after too many quick failures
 *   instead of looping forever. Exits 0 when giving up so `concurrently --kill-others-on-fail`
 *   does NOT take Laravel/Vite down with it.
 * - Health-checks the PUBLIC url (Laravel's /up) and prints a clear banner whenever it goes
 *   down or comes back.
 *
 * Env overrides: DEV_API_TUNNEL_DOMAIN, DEV_API_TUNNEL_PORT.
 */
import { spawn, execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOMAIN = process.env.DEV_API_TUNNEL_DOMAIN || 'ambidextrously-pallid-kylee.ngrok-free.dev';
const PORT = process.env.DEV_API_TUNNEL_PORT || '8000';
const PUBLIC_URL = `https://${DOMAIN}`;
const OVERLAY = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'ngrok.dev.yml');

const HEALTH_INTERVAL_MS = 20_000;
const MAX_QUICK_FAILURES = 5; // consecutive exits within QUICK_EXIT_MS
const QUICK_EXIT_MS = 30_000;

// No own prefix: `composer run dev-tunnel` (concurrently) already labels every line [api-tunnel].
const log = (msg) => console.log(msg);
const banner = (msg) => console.log(`\n${'!'.repeat(70)}\n${msg}\n${'!'.repeat(70)}\n`);

function personalConfigPath() {
  try {
    const out = execFileSync('ngrok', ['config', 'check'], { encoding: 'utf8' });
    const m = out.match(/configuration file at (.+)$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

const personal = personalConfigPath();
if (!personal) {
  banner('ngrok is not installed or has no valid config (run `ngrok config add-authtoken <token>`). API tunnel NOT started.');
  process.exit(0);
}

let child = null;
let quickFailures = 0;
let stopping = false;
let healthy = null;

function start() {
  const startedAt = Date.now();
  log(`starting: ${PUBLIC_URL} -> http://localhost:${PORT}`);
  child = spawn(
    'ngrok',
    ['http', PORT, `--url=${DOMAIN}`, '--config', personal, '--config', OVERLAY, '--log=stdout', '--log-level=warn'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const relay = (buf) => buf.toString().split(/\r?\n/).filter(Boolean).forEach((l) => log(l));
  child.stdout.on('data', relay);
  child.stderr.on('data', relay);
  child.on('exit', (code) => {
    child = null;
    if (stopping) return;
    healthy = false;
    const quick = Date.now() - startedAt < QUICK_EXIT_MS;
    quickFailures = quick ? quickFailures + 1 : 1;
    if (quickFailures >= MAX_QUICK_FAILURES) {
      banner(`API TUNNEL DOWN — ngrok exited ${quickFailures}x in a row (last code ${code}). Giving up; phones cannot reach ${PUBLIC_URL}. Fix the error above, then restart this command.`);
      clearInterval(healthTimer);
      process.exit(0);
    }
    const delay = Math.min(30_000, 2_000 * 2 ** (quickFailures - 1));
    banner(`API TUNNEL DOWN — ngrok exited (code ${code}). Restarting in ${delay / 1000}s (attempt ${quickFailures}/${MAX_QUICK_FAILURES - 1}).`);
    setTimeout(start, delay);
  });
}

async function checkHealth() {
  let ok = false;
  try {
    const res = await fetch(`${PUBLIC_URL}/up`, {
      headers: { 'ngrok-skip-browser-warning': '1' },
      signal: AbortSignal.timeout(10_000),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }
  if (ok && healthy !== true) log(`API reachable at ${PUBLIC_URL}/api/v1 (phones on ANY network can use this URL)`);
  if (!ok && healthy !== false) banner(`API NOT REACHABLE at ${PUBLIC_URL} — mobile apps will fail to connect until this recovers.`);
  healthy = ok;
}

const healthTimer = setInterval(checkHealth, HEALTH_INTERVAL_MS);
setTimeout(checkHealth, 8_000);

const shutdown = () => {
  stopping = true;
  clearInterval(healthTimer);
  if (child) child.kill();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
