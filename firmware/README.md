# ESP32 Firmware

Arduino sketch for the blinds controller. Runs on Seeed XIAO ESP32-C3.

## Features

- **Deep Sleep:** Wakes every 2 minutes to check for cloud commands, then sleeps to save battery
- **WiFi Fast Reconnect:** Caches BSSID/channel in RTC memory for sub-second reconnects
- **OTA Updates:** Supports over-the-air firmware updates via Arduino IoT Cloud
- **Physical Stop Button:** Hardware interrupt on D3 to stop blinds movement
- **Cloud Logging:** Optional HTTP logging to LevolorWand-SmartBridge server

## Pin Mapping

| Pin | Function |
|-----|----------|
| D0 | UP signal (also used for STOP pulse) |
| D1 | DOWN signal |
| D2 | SET signal |
| D3 | Stop button input (GPIO5, active LOW) |

## Cloud Properties

| Property | Type | Direction | Description |
|----------|------|-----------|-------------|
| `cloudUp` | Switch | Read/Write | Trigger UP movement |
| `cloudDown` | Switch | Read/Write | Trigger DOWN movement |

## Setup

1. **Create Arduino IoT Cloud Thing**
   - Add two CloudSwitch properties: `cloudUp` and `cloudDown`
   - Note your Device ID and Secret Key

2. **Configure Secrets**
   Edit `arduino_secrets.h`:
   ```cpp
   #define SECRET_DEVICE_KEY "your-device-key"
   #define SECRET_OPTIONAL_PASS "your-wifi-password"  
   #define SECRET_SSID "your-wifi-ssid"
   ```

3. **Upload**
   - Open in Arduino IDE
   - Select board: `XIAO ESP32C3`
   - Upload!

## Power Management

The firmware is optimized for battery life:

- **CPU:** 80MHz (reduced from 160MHz)
- **WiFi:** MAX_MODEM power save mode
- **Sleep:** Deep sleep for 120s between cloud syncs
- **Wake sources:** Timer (120s) or GPIO (stop button)

Typical current consumption:
- Active (WiFi): ~80-120mA
- Deep sleep: ~10-20µA

## Debug Logging

Uncomment these defines in the main `.ino` to enable:
```cpp
#define ENABLE_LOGGING    // HTTP logging to LevolorWand-SmartBridge
#define ENABLE_SERIAL     // Serial monitor output
```

## Files

| File | Description |
|------|-------------|
| `Blinds_Controller_v1.ino` | Main sketch |
| `thingProperties.h` | Arduino IoT Cloud configuration (auto-generated) |
| `arduino_secrets.h` | WiFi/device credentials (edit this!) |
| `logger.h` | HTTP logging utility |
| `sketch.json` | Arduino IDE project config |
