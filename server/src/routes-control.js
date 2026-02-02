import { Router } from "express";
import { rooms, requireAuth } from "./config.js";
import { publishTrue } from "./arduino.js";

const r = Router();

r.get("/rooms", (_, res) => res.json({ rooms: Object.keys(rooms) }));

r.get("/set/:room/:direction", async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const room = String(req.params.room || "").toLowerCase();
    const dir = String(req.params.direction || "").toLowerCase();

    if (!["up", "down"].includes(dir))
      return res.status(400).send("Direction must be 'up' or 'down'");

    const cfg = rooms[room];
    if (!cfg) return res.status(404).send("Unknown room");

    const pid = dir === "up" ? cfg.upPropertyId : cfg.downPropertyId;
    if (!pid) return res.status(400).send(`Missing ${dir} property for ${room}`);

    await publishTrue(cfg.thingId, pid, cfg.deviceId);
    console.log(`[bridge] → ${room}/${dir} triggered`);
    res.status(200).send(`Triggered ${room} ${dir}`);
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || String(e));
  }
});

export default r;
