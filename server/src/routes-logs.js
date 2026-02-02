import { Router } from "express";
import { rooms, idToName, requireAuth } from "./config.js";
import {
  listLogs, appendByName, appendByDeviceId, tailByName, clearByName, safeName
} from "./logStore.js";

const r = Router();

// helper: normalize incoming lines (text/plain, ?line=, JSON {line|lines})
function incomingLines(req) {
  const bucket = [];
  const add = (v) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(x => add(x));
    else bucket.push(String(v));
  };
  add(req.body);
  add(req.query?.line);
  // split plain text into lines
  return bucket
    .join("\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(Boolean);
}

// list all logs
r.get("/logs", (req, res) => {
  if (!requireAuth(req, res)) return;
  res.json({ items: listLogs() });
});

// append by logical name
r.post("/log/:name", (req, res) => {
  if (!requireAuth(req, res)) return;
  const name = safeName(req.params.name);
  if (!rooms[name]) return res.status(404).send("Unknown device name");
  const lines = incomingLines(req);
  if (!lines.length) return res.status(400).send("No lines provided");
  appendByName(name, lines);
  res.status(204).end();
});

// append by Arduino device_id (maps to name)
r.post("/logid/:deviceId", (req, res) => {
  if (!requireAuth(req, res)) return;
  const deviceId = String(req.params.deviceId || "").trim();
  if (!idToName[deviceId]) return res.status(404).send("Unknown device_id");
  const lines = incomingLines(req);
  if (!lines.length) return res.status(400).send("No lines provided");
  appendByDeviceId(deviceId, lines);
  res.status(204).end();
});

// view last N lines by name
r.get("/log/:name", (req, res) => {
  if (!requireAuth(req, res)) return;
  const name = safeName(req.params.name);
  const n = Number(req.query.n || 200);
  if (!rooms[name]) return res.status(404).send("Unknown device name");
  res.type("text/plain").send(tailByName(name, n));
});

// clear by name
r.delete("/log/:name", (req, res) => {
  if (!requireAuth(req, res)) return;
  const name = safeName(req.params.name);
  if (!rooms[name]) return res.status(404).send("Unknown device name");
  clearByName(name);
  res.status(204).end();
});

export default r;
