#pragma once
#include <WiFi.h>
#include <HTTPClient.h>

// Configure:
static const char* LOG_SERVER_BASE = "http://your_bridge_ip_here:8080";
static const char* LOG_AUTH_TOKEN  = "your_secret_token_here";

// Buffer caps (adjust for your device’s RAM)
static const size_t LOG_BUFFER_SOFT_LIMIT = 8 * 1024;   // start trimming above this
static const size_t LOG_BUFFER_HARD_LIMIT = 16 * 1024;  // absolute max kept
static const size_t LOG_TRIM_KEEP_BYTES   = 6 * 1024;   // after trim, keep last N bytes

// Internal buffer
static String g_logBuffer;

// Helpers
static inline bool wifiReady() { return WiFi.status() == WL_CONNECTED; }

// Trim from the front to keep buffer in bounds (keeps the most recent lines)
static void trimBufferIfNeeded() {
  if (g_logBuffer.length() <= LOG_BUFFER_SOFT_LIMIT) return;
  if (g_logBuffer.length() > LOG_BUFFER_HARD_LIMIT) {
    // Hard cut if someone spammed; keep last chunk
    g_logBuffer = g_logBuffer.substring(g_logBuffer.length() - LOG_TRIM_KEEP_BYTES);
    return;
  }
  // Soft trim at nearest newline boundary
  int start = (int)g_logBuffer.length() - (int)LOG_TRIM_KEEP_BYTES;
  if (start < 0) start = 0;
  int nl = g_logBuffer.indexOf('\n', start);
  g_logBuffer = (nl >= 0) ? g_logBuffer.substring(nl + 1) : g_logBuffer.substring(start);
}

// Try to flush the buffer via POST /logid/:deviceId (text/plain)
static bool flushLogBuffer(const char* deviceId) {
  if (!wifiReady() || !deviceId || !*deviceId) return false;
  if (g_logBuffer.isEmpty()) return true;

  HTTPClient http;
  String url = String(LOG_SERVER_BASE) + "/logid/" + deviceId;
  http.begin(url);
  http.addHeader("Content-Type", "text/plain");
  http.addHeader("X-Auth-Token", LOG_AUTH_TOKEN);

  // Make a copy to avoid modifying buffer mid-send
  String payload = g_logBuffer;
  int code = http.POST(payload);
  http.end();

  if (code >= 200 && code < 300) {
    g_logBuffer = "";  // clear on success
    return true;
  }
  // On failure, keep buffer; trim if needed
  trimBufferIfNeeded();
  return false;
}

// Enqueue a line and attempt to flush immediately if Wi-Fi is up
static void logLine(const String& line) {
  // Always append to buffer
  g_logBuffer += line;
  if (!line.endsWith("\n")) g_logBuffer += "\n";
  trimBufferIfNeeded();

  // If Wi-Fi is ready, try to send everything we’ve got
  if (wifiReady()) {
    flushLogBuffer(DEVICE_LOGIN_NAME);
  }
}
