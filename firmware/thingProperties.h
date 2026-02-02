#include <ArduinoIoTCloud.h>
#include <Arduino_ConnectionHandler.h>

const char DEVICE_LOGIN_NAME[]  = "your-device-id";
const char SSID[]               = SECRET_SSID;
const char PASS[]               = SECRET_OPTIONAL_PASS;
const char DEVICE_KEY[]  = SECRET_DEVICE_KEY;

void onUpChange();
void onDownChange();

bool up;
bool down;
String debug_log;

void initProperties(){
  ArduinoCloud.setBoardId(DEVICE_LOGIN_NAME);
  ArduinoCloud.setSecretDeviceKey(DEVICE_KEY);
  ArduinoCloud.addProperty(up, READWRITE, ON_CHANGE, onUpChange);
  ArduinoCloud.addProperty(down, READWRITE, ON_CHANGE, onDownChange);
  ArduinoCloud.addProperty(debug_log, READ, ON_CHANGE, NULL);
}

WiFiConnectionHandler ArduinoIoTPreferredConnection(SSID, PASS);
