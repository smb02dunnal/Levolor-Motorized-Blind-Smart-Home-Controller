import fs from "fs";
import path from "path";

export const AUTH_TOKEN =
  process.env.AUTH_TOKEN || process.env.LOG_AUTH_TOKEN || "";
export const ARDUINO_ORG = (process.env.ARDUINO_ORG || "").trim();
export const DEVICES_CONFIG =
  process.env.DEVICES_CONFIG ||
  path.resolve(process.cwd(), "devices.config.json");

export let rooms = {};         // { office: {thingId, deviceId, upPropertyId, downPropertyId, ...} }
export let idToName = {};      // { deviceId: "office" }
export let nameToId = {};      // { "office": deviceId }

export function loadMapping() {
  rooms = {};
  idToName = {};
  nameToId = {};
  if (!fs.existsSync(DEVICES_CONFIG)) {
    console.warn("[bridge] devices.config.json not found:", DEVICES_CONFIG);
    return;
  }
  const cfg = JSON.parse(fs.readFileSync(DEVICES_CONFIG, "utf8"));
  rooms = cfg.devices || {};
  for (const [name, obj] of Object.entries(rooms)) {
    const devId = String(obj.deviceId || "").trim();
    if (devId) {
      idToName[devId] = name;
      nameToId[name] = devId;
    }
  }
  console.log(
    `[bridge] loaded ${Object.keys(rooms).length} rooms; ` +
    `${Object.keys(idToName).length} deviceId mappings`
  );
}

export function requireAuth(req, res) {
  if (!AUTH_TOKEN) return true; // auth disabled
  const header = req.get("X-Auth-Token") || "";
  const query = req.query?.token || "";
  if (header === AUTH_TOKEN || query === AUTH_TOKEN) return true;
  res.status(401).send("Unauthorized");
  return false;
}
