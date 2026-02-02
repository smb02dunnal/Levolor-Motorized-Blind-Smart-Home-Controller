import fetch from "node-fetch";
import { ARDUINO_ORG } from "./config.js";

let tokenCache = { token: null, exp: 0 };

async function getToken() {
  const { ARDUINO_CLIENT_ID, ARDUINO_CLIENT_SECRET } = process.env;
  if (!ARDUINO_CLIENT_ID || !ARDUINO_CLIENT_SECRET) {
    throw new Error("Arduino credentials missing (set ARDUINO_CLIENT_ID / ARDUINO_CLIENT_SECRET)");
  }

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
  tokenCache = { token: access_token, exp: Date.now() + expires_in * 1000 };
  return access_token;
}

function makeHeaders(token) {
  const h = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (ARDUINO_ORG) h["X-Organization"] = ARDUINO_ORG;
  return h;
}

export async function publishTrue(thingId, propertyId, deviceId) {
  const token = await getToken();
  const url = `https://api2.arduino.cc/iot/v2/things/${encodeURIComponent(
    thingId
  )}/properties/${encodeURIComponent(propertyId)}/publish`;

  const res = await fetch(url, {
    method: "PUT",
    headers: makeHeaders(token),
    body: JSON.stringify({ value: true, device_id: deviceId }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Publish failed: ${res.status} ${txt}`);
  return txt || "OK";
}
