import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

/* -------------------- ENV -------------------- */
const {
  ARDUINO_CLIENT_ID,
  ARDUINO_CLIENT_SECRET,
  ARDUINO_ORG = "",
  AUTH_TOKEN,
  PORT = 8080,
} = process.env;

if (!ARDUINO_CLIENT_ID || !ARDUINO_CLIENT_SECRET) {
  console.error("[bridge] Missing ARDUINO_CLIENT_ID/ARDUINO_CLIENT_SECRET");
  process.exit(1);
}

/* -------------------- CONFIG -------------------- */
const cfgPath = path.resolve(process.cwd(), "devices.config.json");
if (!fs.existsSync(cfgPath)) {
  console.error("[bridge] Missing devices.config.json in", process.cwd());
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

/* -------------------- UTILS -------------------- */
const log = (...a) => console.log("[bridge]", ...a);
const nowIso = () => new Date().toISOString();

let tokenCache = { token: null, exp: 0 };

async function getToken() {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.exp - 10_000) return tokenCache.token;

  const res = await fetch("https://api2.arduino.cc/iot/v1/clients/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: ARDUINO_CLIENT_ID,
      client_secret: ARDUINO_CLIENT_SECRET,
      audience: "https://api2.arduino.cc/iot",
    }),
  });
  if (!res.ok) throw new Error("Auth failed: " + (await res.text()));

  const { access_token, expires_in } = await res.json();
  tokenCache = { token: access_token, exp: now + expires_in * 1000 };
  return access_token;
}

function makeHeaders(token) {
  const h = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (ARDUINO_ORG) h["X-Organization"] = ARDUINO_ORG.trim();
  return h;
}

/* ---------- Arduino Cloud helpers ---------- */

async function publishValue(thingId, propertyId, deviceId, value) {
  const token = await getToken();
  const url = `https://api2.arduino.cc/iot/v2/things/${encodeURIComponent(
    thingId
  )}/properties/${encodeURIComponent(propertyId)}/publish`;

  const res = await fetch(url, {
    method: "PUT",
    headers: makeHeaders(token),
    body: JSON.stringify({ value, device_id: deviceId }),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(`Publish failed: ${res.status} ${txt}`);
  return txt || "OK";
}

async function publishTrue(thingId, propertyId, deviceId) {
  return publishValue(thingId, propertyId, deviceId, true);
}

/** Read a property snapshot (String log). */
async function readProperty(thingId, propertyId) {
  const token = await getToken();
  const url = `https://api2.arduino.cc/iot/v2/things/${encodeURIComponent(
    thingId
  )}/properties/${encodeURIComponent(propertyId)}`;

  const res = await fetch(url, { headers: makeHeaders(token) });
  const bodyText = await res.text();
  if (!res.ok) throw new Error(`Read failed: ${res.status} ${bodyText}`);

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    return { value: bodyText, updatedAt: null };
  }

  const value =
    data?.last_value ?? data?.value ?? data?.lastValue ?? data?.current_value ?? "";
  const updatedAt =
    data?.value_updated_at ?? data?.updated_at ?? data?.last_update ?? null;

  return { value, updatedAt };
}

/* ---------- Formatting for device debug log ---------- */

function formatDeviceLog(raw) {
  if (!raw) return "";
  // Normalize endings and split into timestamped entries
  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const entries = text
    .split(/\n+/)
    .flatMap((line) =>
      line
        .split(/(?=\[\d{2}:\d{2}:\d{2}\])/)
        .map((s) => s.trim())
        .filter(Boolean)
    );

  const formatted = entries
    .map((e) => {
      const m = e.match(/^\[(\d{2}:\d{2}:\d{2})\](.*)$/);
      if (m) {
        const [, t, msg] = m;
        return `${t.padEnd(9)}  ${msg.trim()}`;
      }
      return e;
    })
    .join("\n");

  return formatted.trim();
}

/* -------------------- EXPRESS -------------------- */
const app = express();

app.get("/health", (_, res) => res.send("ok"));
app.get("/devices", (_, res) => res.json({ devices: Object.keys(config.devices) }));

/** Trigger up/down for a device */
app.get("/set/:device/:direction", async (req, res) => {
  try {
    if (AUTH_TOKEN && req.query.token !== AUTH_TOKEN)
      return res.status(401).send("Unauthorized");

    const device = String(req.params.device || "").toLowerCase();
    const dir = String(req.params.direction || "").toLowerCase();

    if (!["up", "down"].includes(dir))
      return res.status(400).send("Direction must be 'up' or 'down'");

    const deviceCfg = config.devices[device];
    if (!deviceCfg) return res.status(404).send("Unknown device");

    const propertyId =
      dir === "up" ? deviceCfg.upPropertyId : deviceCfg.downPropertyId;
    if (!propertyId)
      return res.status(400).send(`Missing property id for ${device}/${dir}`);

    await publishTrue(deviceCfg.thingId, propertyId, deviceCfg.deviceId);
    log(`→ ${device}/${dir} triggered`);
    res.status(200).send(`Triggered ${device} ${dir}`);
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || String(e));
  }
});

/** Always-formatted last debug log for a device */
app.get("/log/:device", async (req, res) => {
  try {
    if (AUTH_TOKEN && req.query.token !== AUTH_TOKEN)
      return res.status(401).send("Unauthorized");

    const device = String(req.params.device || "").toLowerCase();
    const deviceCfg = config.devices[device];
    if (!deviceCfg) return res.status(404).send("Unknown device");

    const logPid = deviceCfg.debugLogPropertyId || deviceCfg.logPropertyId;
    if (!logPid)
      return res
        .status(400)
        .send("Device has no debugLogPropertyId/logPropertyId configured");

    const { value, updatedAt } = await readProperty(deviceCfg.thingId, logPid);
    const pretty = formatDeviceLog(value);

    res
      .type("text/plain")
      .send(`${pretty}${updatedAt ? `\n\n(updated ${updatedAt})` : ""}`);
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || String(e));
  }
});

/** Clear the device log (write empty string to debugLog) */
app.get("/clearlog/:device", async (req, res) => {
  try {
    if (AUTH_TOKEN && req.query.token !== AUTH_TOKEN)
      return res.status(401).send("Unauthorized");

    const device = String(req.params.device || "").toLowerCase();
    const deviceCfg = config.devices[device];
    if (!deviceCfg) return res.status(404).send("Unknown device");

    const logPid = deviceCfg.debugLogPropertyId || deviceCfg.logPropertyId;
    if (!logPid)
      return res
        .status(400)
        .send("Device has no debugLogPropertyId/logPropertyId configured");

    await publishValue(deviceCfg.thingId, logPid, deviceCfg.deviceId, "");
    log(`→ Cleared debug log for ${device}`);
    res.status(200).send(`Cleared debug log for ${device}`);
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || String(e));
  }
});

/* -------------------- START -------------------- */
app.listen(PORT, () => log(`Listening on :${PORT}`));

