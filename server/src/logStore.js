import fs from "fs";
import os from "os";
import path from "path";
import { idToName } from "./config.js";

const LOG_DIR = process.env.LOG_DIR || path.resolve(process.cwd(), "logs");
const MAX_BYTES = Number(process.env.LOG_MAX_BYTES || 5 * 1024 * 1024);
const TRIM_TAIL_LINES = Number(process.env.LOG_TRIM_TAIL_LINES || 5000);

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

export function safeName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9._-]/g, "_").slice(0, 64);
}
function logPathByName(name) { return path.join(LOG_DIR, `${safeName(name)}.log`); }

function iso() { return new Date().toISOString(); }
function hhmmss() { return new Date().toISOString().substring(11, 19); }

function ensureTrimmed(p) {
  try {
    const s = fs.statSync(p);
    if (s.size <= MAX_BYTES) return;
    const content = fs.readFileSync(p, "utf8");
    const lines = content.split(/\r?\n/);
    const tail = lines.slice(-TRIM_TAIL_LINES).join(os.EOL);
    fs.writeFileSync(p, tail + os.EOL, "utf8");
  } catch {}
}

function formatForStore(deviceName, line) {
  const msg = String(line).trim();
  if (!msg) return null;
  return `${iso()} [${hhmmss()}] ${safeName(deviceName)} ${msg}`;
}

export function listLogs() {
  return fs
    .readdirSync(LOG_DIR)
    .filter(f => f.endsWith(".log"))
    .map(f => {
      const p = path.join(LOG_DIR, f);
      const s = fs.statSync(p);
      return { device: f.replace(/\.log$/, ""), bytes: s.size, mtime: s.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

export function appendByName(name, lines) {
  const p = logPathByName(name);
  const out = lines.map(l => formatForStore(name, l)).filter(Boolean).join(os.EOL);
  if (!out) return;
  fs.appendFileSync(p, out + os.EOL, "utf8");
  ensureTrimmed(p);
}

export function appendByDeviceId(deviceId, lines) {
  const name = idToName[String(deviceId || "").trim()];
  if (!name) throw new Error("Unknown device_id");
  appendByName(name, lines);
}

export function tailByName(name, n = 200) {
  const p = logPathByName(name);
  if (!fs.existsSync(p)) return "(empty)\n";
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  return lines.slice(-Math.max(1, Math.min(10000, n))).join("\n") + "\n";
}

export function clearByName(name) {
  const p = logPathByName(name);
  fs.writeFileSync(p, "", "utf8");
}
