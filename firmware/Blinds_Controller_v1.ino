#include "arduino_secrets.h"
#include "thingProperties.h"

#include <esp_err.h>
#include <esp_pm.h>
#include <esp_wifi.h>
#include <esp_wifi_types.h>
#include <esp_sleep.h>

RTC_DATA_ATTR unsigned long g_msSinceStart = 0;

// Enables cloud based logging to our nodejs server
//#define ENABLE_LOGGING

// Enables logging to the serial port for USB connections
//#define ENABLE_SERIAL

#if defined(ENABLE_LOGGING) || defined(ENABLE_SERIAL)
  #include "logger.h"
  #define LOG(data) logMessage(data)
  
  void logMessage(const String &message) {
    unsigned long ms = g_msSinceStart + millis();
    unsigned long seconds = ms / 1000;
    unsigned long minutes = seconds / 60;
    unsigned long hours   = minutes / 60;
  
    seconds %= 60;
    minutes %= 60;
  
    char timeBuf[18];
    snprintf(timeBuf, sizeof(timeBuf), "[%02lu:%02lu:%02lu]", hours, minutes, seconds);
  
  #ifdef SERIAL_LOGGING
    Serial.print(timeBuf);
    Serial.print(message + "\n");
  #endif
  
    logLine(String(timeBuf) + message + "\n");
  }
#else
  #define LOG(data)
#endif
  
#define DELAY(ms) delay(ms);

// Amount of time (s) to sleep for after inactivity
constexpr uint32_t DEEP_SLEEP_LENGTH = 120;

// Wifi connection timeout in seconds
constexpr uint32_t WIFI_CONNECTION_TIMEOUT = 10;

// Define output pins for the blinds control.
constexpr int UP_PIN   = D0;  // Used for "up" and for the "stop" pulse.
constexpr int DOWN_PIN = D1;
constexpr int SET_PIN  = D2;

// Define the input pin (pushbutton) for stop behaviour.
constexpr uint32_t STOP_BUTTON_PIN = D3;
constexpr uint32_t STOP_BUTTON_GPIO = GPIO_NUM_5;

constexpr uint32_t BUTTON_PULSE_MS = 2 * 1000; // 2s

struct WifiConnectionCache{
  uint32_t crc32;   // 4 bytes
  uint8_t channel;  // 1 byte,   5 in total
  uint8_t bssid[6]; // 6 bytes, 11 in total
  uint8_t padding;  // 1 byte,  12 in total
};
RTC_DATA_ATTR volatile WifiConnectionCache g_wifiCache;


bool g_readyToSleep = false;

volatile bool g_stopRequested = false;

bool g_blockForOta = false;
bool g_otaStarted = false;

bool onOTARequestCallback() {
  g_blockForOta = true;
  g_otaStarted = true;
  return true;
}

void deepSleepForSeconds(const uint64_t seconds) {
  LOG("Entering deep sleep for " + String(seconds) + "s\n");
  Serial.flush();

  ArduinoCloud.update();
  DELAY(100);
  
  WiFi.disconnect(true, true);   // drop, erase config from RAM
  esp_wifi_stop();

  // dont leak during sleep
  digitalWrite(UP_PIN, LOW);
  digitalWrite(DOWN_PIN, LOW);
  digitalWrite(SET_PIN, LOW);
  const uint64_t sleepTimeUs = seconds * 1000000ULL;

  g_msSinceStart += millis() + sleepTimeUs / 1000;

  // Wake if the stop button is pressed (interupt)
  esp_deep_sleep_enable_gpio_wakeup(1ULL << STOP_BUTTON_GPIO, ESP_GPIO_WAKEUP_GPIO_LOW);
  
  // Configure timer wakeup
  esp_sleep_enable_timer_wakeup(sleepTimeUs);
  
  // Enter deep sleep
  esp_deep_sleep_start();
}


void IRAM_ATTR handleStopButton() {
  g_stopRequested = true;
}

void connect() {
  initProperties();
  
  // Begin connection to Arduino IoT Cloud.
  ArduinoCloud.begin(ArduinoIoTPreferredConnection);

#ifdef SERIAL_LOGGING
  ArduinoCloud.printDebugInfo();
#endif
  
  ArduinoCloud.addCallback(ArduinoIoTCloudEvent::SYNC, onCloudSync);
  ArduinoCloud.onOTARequestCb(onOTARequestCallback);
}

void onCloudSync(){
  delay(100);
  g_readyToSleep = true;
}

uint32_t calculateCRC32( volatile uint8_t *data, size_t length ) {
  uint32_t crc = 0xffffffff;
  while( length-- ) {
    uint8_t c = *data++;
    for( uint32_t i = 0x80; i > 0; i >>= 1 ) {
      bool bit = crc & 0x80000000;
      if( c & i ) {
        bit = !bit;
      }

      crc <<= 1;
      if( bit ) {
        crc ^= 0x04c11db7;
      }
    }
  }

  return crc;
}

void setup() {  
  // Set the pin modes.
  pinMode(UP_PIN, OUTPUT);
  pinMode(DOWN_PIN, OUTPUT);
  pinMode(SET_PIN, OUTPUT);
  pinMode(STOP_BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(UP_PIN, LOW);
  digitalWrite(DOWN_PIN, LOW);
  digitalWrite(SET_PIN, LOW);
  
  // Dont use Bluetooth
  btStop(); 

  // Enable modem-sleep
  esp_wifi_set_ps(WIFI_PS_MAX_MODEM);

#ifdef SERIAL_LOGGING
  Serial.begin(115200);
#endif

  LOG("Hello World.");
  esp_pm_config_esp32c3_t pm_cfg = {
    .max_freq_mhz = 80,   // you set CPU 80 MHz
    .min_freq_mhz = 80,   // keep fixed or lower if you can
    .light_sleep_enable = true
  };
  esp_pm_configure(&pm_cfg);

  WiFi.persistent(false);
  
  // Try to read WiFi settings from RTC memory
  {
    WifiConnectionCache wifiCache = {};
    memcpy(&wifiCache, (void*)&g_wifiCache, sizeof(wifiCache));
    bool rtcValid = false;
    // Calculate the CRC of what we just read from RTC memory, but skip the first 4 bytes as that's the checksum itself.
    uint32_t crc = calculateCRC32( ((uint8_t*)&wifiCache) + 4, sizeof( wifiCache ) - 4 );
    if( crc == wifiCache.crc32 ) {
      rtcValid = true;
    }
  
    if( rtcValid ) {
      // The RTC data was good, make a quick connection
      WiFi.begin( SSID, PASS, wifiCache.channel, wifiCache.bssid, true );
      LOG("Wifi quick reconnect begin\n");
    }
    else {
      // The RTC data was not valid, so make a regular connection
      WiFi.begin( SSID, PASS );
      LOG("Invalid RTC data for wifi quick connect, just doing a normal connect\n");
    }
  
    int retries = 0;
    while( WiFi.status() != WL_CONNECTED ) {
      retries++;
      if( retries == 10 ) {
        LOG("Wifi quick connect reset\n");
        // Quick connect is not working, reset WiFi and try regular connection
        WiFi.disconnect();
        DELAY(10);
        WiFi.begin( SSID, PASS );
      }
      if( retries == 20 ) {
        LOG("Wifi failure\n");
        return;
      }
      DELAY(WIFI_CONNECTION_TIMEOUT * 1000 / 20);
    }
    
    // Write current connection info back to RTC
    wifiCache.channel = WiFi.channel();
    memcpy( wifiCache.bssid, WiFi.BSSID(), 6 ); // Copy 6 bytes of BSSID (AP's MAC address)
    wifiCache.crc32 = calculateCRC32( ((uint8_t*)&wifiCache) + 4, sizeof( wifiCache ) - 4 );
    memcpy((void*)&g_wifiCache, &wifiCache, sizeof(wifiCache));
  }

  if (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_GPIO) {
    g_stopRequested = true;
  }
  
  // Attach the ISR to the pin, triggering on the falling edge (high→low)
  attachInterrupt(
    digitalPinToInterrupt(STOP_BUTTON_PIN),  // maps D3 → its interrupt number
    handleStopButton,                        // your ISR
    FALLING                                  // when line goes from HIGH to LOW
  );
  
  connect();
}

void loop() { 
  LOG("Start Update");

  // When OTA is available, stay there until it completes.
  // The rest of the loop() does not run and the sketch
  // restarts automatically at the end of the OTA process.
  while (g_blockForOta) {
    ArduinoCloud.update();
    if (g_otaStarted) {
      LOG("Waiting for OTA to finish...");
      g_otaStarted = false;
    }
  }
  
  // Handle cloud connectivity and property updates.
  ArduinoCloud.update();

  // Handle stop case
  if (g_stopRequested) {
    LOG("Stop Requested");
    
    stopMovement();
    g_stopRequested = false;
  }

  if (g_readyToSleep) {
    // Sleep and restart
    deepSleepForSeconds(DEEP_SLEEP_LENGTH);
  }

  vTaskDelay(pdMS_TO_TICKS(10));
}


// --- Command Functions ---

void moveUp() {
  LOG("Moving up...\n");
  digitalWrite(UP_PIN, HIGH);
  DELAY(BUTTON_PULSE_MS);
  digitalWrite(UP_PIN, LOW);
}

void moveDown() {
  LOG("Moving down...\n");
  digitalWrite(DOWN_PIN, HIGH);
  DELAY(BUTTON_PULSE_MS);
  digitalWrite(DOWN_PIN, LOW);
}

// Issues a brief pulse on the UP+DOWN output pin to stop movement.
void stopMovement() {
  LOG("Stopping movement...\n");
  digitalWrite(UP_PIN, HIGH);
  digitalWrite(DOWN_PIN, HIGH);
  DELAY(100);
  digitalWrite(UP_PIN, LOW);
  digitalWrite(DOWN_PIN, LOW);
}


/* Cloud Callbacks */
void onCloudUpChange()   { if (cloudUp)   { cloudUp = false; moveUp();   } }
void onCloudDownChange() { if (cloudDown) { cloudDown = false; moveDown(); } }