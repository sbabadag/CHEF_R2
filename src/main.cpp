#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <DNSServer.h>
#include <math.h>
#include "config.h"

class LGFX_CYD : public lgfx::LGFX_Device {
  lgfx::Panel_ILI9341 _panel_instance;
  lgfx::Bus_SPI _bus_instance;
  lgfx::Light_PWM _light_instance;
  lgfx::Touch_XPT2046 _touch_instance;

public:
  LGFX_CYD(void) {
    {
      auto cfg = _bus_instance.config();
      cfg.spi_host = HSPI_HOST;
      cfg.spi_mode = 0;
      cfg.freq_write = 40000000;
      cfg.freq_read = 16000000;
      cfg.spi_3wire = true;
      cfg.use_lock = true;
      cfg.dma_channel = SPI_DMA_CH_AUTO;
      cfg.pin_sclk = 14;
      cfg.pin_mosi = 13;
      cfg.pin_miso = 12;
      cfg.pin_dc = 2;
      _bus_instance.config(cfg);
      _panel_instance.setBus(&_bus_instance);
    }

    {
      auto cfg = _panel_instance.config();
      cfg.pin_cs = 15;
      cfg.pin_rst = -1;
      cfg.pin_busy = -1;
      cfg.panel_width = 240;
      cfg.panel_height = 320;
      cfg.offset_x = 0;
      cfg.offset_y = 0;
      cfg.offset_rotation = 0;
      cfg.dummy_read_pixel = 8;
      cfg.dummy_read_bits = 1;
      cfg.readable = false;
      cfg.invert = false;
      cfg.rgb_order = false;
      cfg.dlen_16bit = false;
      cfg.bus_shared = true;
      _panel_instance.config(cfg);
    }

    { // Backlight on GPIO21
      auto cfg = _light_instance.config();
      cfg.pin_bl = 21;
      cfg.invert = false;
      cfg.freq = 44100;
      cfg.pwm_channel = 7;
      _light_instance.config(cfg);
      _panel_instance.setLight(&_light_instance);
    }

    {
      auto cfg = _touch_instance.config();
      cfg.x_min = 300;
      cfg.x_max = 3800;
      cfg.y_min = 300;
      cfg.y_max = 3800;
      cfg.pin_cs = 33;
      cfg.pin_int = 36;
      cfg.bus_shared = true;
      cfg.offset_rotation = 0;
      cfg.spi_host = VSPI_HOST;
      cfg.freq = 2500000;
      cfg.pin_sclk = 25;
      cfg.pin_mosi = 32;
      cfg.pin_miso = 39;
      _touch_instance.config(cfg);
      _panel_instance.setTouch(&_touch_instance);
    }

    setPanel(&_panel_instance);
  }

  void touch_calibrate() {
    this->fillScreen(TFT_BLACK);
    this->setCursor(20, 0);
    this->setTextFont(2);
    this->setTextSize(1);
    this->setTextColor(TFT_WHITE, TFT_BLACK);
    this->println("Touch screen calibration");
    this->println("Please tap the crosshairs");
    this->setTextFont(1);
    delay(1000);
    uint16_t calData[5];
    this->calibrateTouch(calData, TFT_MAGENTA, TFT_BLACK, 15);
    Serial.println("Calibration complete!");
    Serial.printf("x_min=%d, x_max=%d, y_min=%d, y_max=%d\n", calData[0], calData[1], calData[2], calData[3]);
    
    // Apply the new calibration
    auto cfg = _touch_instance.config();
    cfg.x_min = calData[0];
    cfg.x_max = calData[1];
    cfg.y_min = calData[2];
    cfg.y_max = calData[3];
    _touch_instance.config(cfg);
  }
};

LGFX_CYD tft;

// Buzzer configuration
const int BUZZER_PIN = 22;

// WiFi AP Configuration
const char* AP_SSID = "CYD-WiFi-Setup";
const char* AP_PASSWORD = "12345678";
const IPAddress AP_IP(192, 168, 4, 1);
const IPAddress AP_GATEWAY(192, 168, 4, 1);
const IPAddress AP_SUBNET(255, 255, 255, 0);

// WiFi Management
WebServer server(80);
DNSServer dnsServer;
Preferences preferences;
bool apMode = false;
bool configMode = false;

// WiFi credentials storage
struct StoredNetwork {
  char ssid[32];
  char password[64];
  bool enabled;
  int priority;
};

StoredNetwork storedNetworks[MAX_WIFI_NETWORKS];
int storedNetworkCount = 0;

// WiFi connection status variables
bool wifiConnected = false;
int currentNetworkIndex = 0;
unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 30000; // Check every 30 seconds
const unsigned long WIFI_CONNECT_TIMEOUT = 10000; // 10 seconds timeout per network

// Function declarations
void loadStoredNetworks();
void saveStoredNetworks();
bool addNetwork(const char* ssid, const char* password);
bool connectToWiFiNetwork(const char* networkSSID, const char* networkPassword, int timeoutMs);
bool autoConnectWiFi();
void startAPMode();
void displayAPModeInfo();
void checkWiFiConnection();
void handleRoot();
void handleScan();
void handleConnect();

// WiFi Credentials Storage Functions
void loadStoredNetworks() {
  preferences.begin("wifi-creds", false);
  storedNetworkCount = preferences.getInt("count", 0);
  
  Serial.printf("Loading %d stored networks\n", storedNetworkCount);
  
  for (int i = 0; i < storedNetworkCount && i < MAX_WIFI_NETWORKS; i++) {
    String ssidKey = "ssid" + String(i);
    String passKey = "pass" + String(i);
    String enabledKey = "en" + String(i);
    String priorityKey = "pr" + String(i);
    
    preferences.getString(ssidKey.c_str(), storedNetworks[i].ssid, sizeof(storedNetworks[i].ssid));
    preferences.getString(passKey.c_str(), storedNetworks[i].password, sizeof(storedNetworks[i].password));
    storedNetworks[i].enabled = preferences.getBool(enabledKey.c_str(), true);
    storedNetworks[i].priority = preferences.getInt(priorityKey.c_str(), i);
    
    Serial.printf("Loaded network %d: %s (enabled: %s)\n", i, storedNetworks[i].ssid, storedNetworks[i].enabled ? "yes" : "no");
  }
  
  preferences.end();
  
  // If no stored networks, load defaults from config.h
  if (storedNetworkCount == 0) {
    Serial.println("No stored networks found, loading defaults");
    for (int i = 0; i < MAX_WIFI_NETWORKS; i++) {
      if (strlen(wifi_networks[i].ssid) > 0) {
        strncpy(storedNetworks[i].ssid, wifi_networks[i].ssid, sizeof(storedNetworks[i].ssid));
        strncpy(storedNetworks[i].password, wifi_networks[i].password, sizeof(storedNetworks[i].password));
        storedNetworks[i].enabled = true;
        storedNetworks[i].priority = i;
        storedNetworkCount++;
      }
    }
    saveStoredNetworks(); // Save defaults to preferences
  }
}

void saveStoredNetworks() {
  preferences.begin("wifi-creds", false);
  preferences.putInt("count", storedNetworkCount);
  
  for (int i = 0; i < storedNetworkCount; i++) {
    String ssidKey = "ssid" + String(i);
    String passKey = "pass" + String(i);
    String enabledKey = "en" + String(i);
    String priorityKey = "pr" + String(i);
    
    preferences.putString(ssidKey.c_str(), storedNetworks[i].ssid);
    preferences.putString(passKey.c_str(), storedNetworks[i].password);
    preferences.putBool(enabledKey.c_str(), storedNetworks[i].enabled);
    preferences.putInt(priorityKey.c_str(), storedNetworks[i].priority);
  }
  
  preferences.end();
  Serial.printf("Saved %d networks to storage\n", storedNetworkCount);
}

bool addNetwork(const char* ssid, const char* password) {
  if (storedNetworkCount >= MAX_WIFI_NETWORKS) {
    Serial.println("Maximum networks reached");
    return false;
  }
  
  // Check if network already exists
  for (int i = 0; i < storedNetworkCount; i++) {
    if (strcmp(storedNetworks[i].ssid, ssid) == 0) {
      // Update existing network
      strncpy(storedNetworks[i].password, password, sizeof(storedNetworks[i].password));
      storedNetworks[i].enabled = true;
      saveStoredNetworks();
      Serial.printf("Updated existing network: %s\n", ssid);
      return true;
    }
  }
  
  // Add new network
  strncpy(storedNetworks[storedNetworkCount].ssid, ssid, sizeof(storedNetworks[storedNetworkCount].ssid));
  strncpy(storedNetworks[storedNetworkCount].password, password, sizeof(storedNetworks[storedNetworkCount].password));
  storedNetworks[storedNetworkCount].enabled = true;
  storedNetworks[storedNetworkCount].priority = storedNetworkCount;
  storedNetworkCount++;
  
  saveStoredNetworks();
  Serial.printf("Added new network: %s\n", ssid);
  return true;
}

// Web Server Handlers
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<title>CYD WiFi Setup</title><style>";
  html += "body{font-family:Arial,sans-serif;margin:0;padding:20px;background-color:#f0f0f0;}";
  html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}";
  html += "h1{color:#333;text-align:center;}";
  html += ".network-item{padding:10px;margin:5px 0;background:#f9f9f9;border-radius:5px;cursor:pointer;border:2px solid transparent;}";
  html += ".network-item:hover{background:#e9e9e9;}";
  html += ".network-item.selected{border-color:#007bff;background:#e7f3ff;}";
  html += ".signal-strength{float:right;font-weight:bold;}";
  html += ".form-group{margin:15px 0;}";
  html += "label{display:block;margin-bottom:5px;font-weight:bold;}";
  html += "input[type='text'],input[type='password']{width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;font-size:16px;box-sizing:border-box;}";
  html += "button{background:#007bff;color:white;padding:12px 30px;border:none;border-radius:5px;cursor:pointer;font-size:16px;width:100%;margin-top:10px;}";
  html += "button:hover{background:#0056b3;}";
  html += ".status{margin-top:15px;padding:10px;border-radius:5px;display:none;}";
  html += ".success{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}";
  html += ".error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}";
  html += "</style></head><body>";
  html += "<div class='container'><h1>CYD WiFi Setup</h1>";
  html += "<p>Select a WiFi network and enter the password to connect your device.</p>";
  html += "<div id='networks'><button onclick='scanNetworks()'>Scan for Networks</button></div>";
  html += "<div class='form-group'><label for='ssid'>Network Name (SSID):</label>";
  html += "<input type='text' id='ssid' placeholder='Enter WiFi network name'></div>";
  html += "<div class='form-group'><label for='password'>Password:</label>";
  html += "<input type='password' id='password' placeholder='Enter WiFi password'></div>";
  html += "<button onclick='connectWiFi()'>Connect to WiFi</button>";
  html += "<div id='status' class='status'></div></div>";
  
  // JavaScript
  html += "<script>";
  html += "let selectedNetwork='';";
  html += "function scanNetworks(){";
  html += "document.getElementById('networks').innerHTML='<p>Scanning for networks...</p>';";
  html += "fetch('/scan').then(response=>response.json()).then(data=>{";
  html += "let html='<h3>Available Networks:</h3>';";
  html += "data.networks.forEach(network=>{";
  html += "const strength=network.rssi>-50?'Strong':network.rssi>-70?'Good':'Weak';";
  html += "html+='<div class=\"network-item\" onclick=\"selectNetwork(\\''+network.ssid+'\\')\">';";
  html += "html+=network.ssid+'<span class=\"signal-strength\">'+strength+' '+network.rssi+'dBm</span></div>';";
  html += "});";
  html += "document.getElementById('networks').innerHTML=html;";
  html += "}).catch(error=>{";
  html += "console.error('Error:',error);";
  html += "document.getElementById('networks').innerHTML='<p>Error scanning networks</p>';";
  html += "});}";
  html += "function selectNetwork(ssid){";
  html += "selectedNetwork=ssid;";
  html += "document.getElementById('ssid').value=ssid;";
  html += "document.querySelectorAll('.network-item').forEach(item=>{";
  html += "item.classList.remove('selected');});";
  html += "event.target.classList.add('selected');}";
  html += "function connectWiFi(){";
  html += "const ssid=document.getElementById('ssid').value;";
  html += "const password=document.getElementById('password').value;";
  html += "if(!ssid){showStatus('Please enter a network name','error');return;}";
  html += "showStatus('Connecting to '+ssid+'...','success');";
  html += "fetch('/connect',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},";
  html += "body:'ssid='+encodeURIComponent(ssid)+'&password='+encodeURIComponent(password)})";
  html += ".then(response=>response.json()).then(data=>{";
  html += "if(data.success){showStatus('Successfully connected! Device will restart in 5 seconds.','success');";
  html += "setTimeout(()=>{window.location.reload();},5000);}";
  html += "else{showStatus('Failed to connect: '+data.message,'error');}";
  html += "}).catch(error=>{console.error('Error:',error);showStatus('Connection error occurred','error');});}";
  html += "function showStatus(message,type){";
  html += "const statusDiv=document.getElementById('status');";
  html += "statusDiv.textContent=message;statusDiv.className='status '+type;statusDiv.style.display='block';}";
  html += "window.onload=function(){scanNetworks();};";
  html += "</script></body></html>";
  
  server.send(200, "text/html", html);
}

void handleScan() {
  WiFi.scanDelete();
  int networkCount = WiFi.scanNetworks();
  
  String json = "{\"networks\":[";
  for (int i = 0; i < networkCount; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"ssid\":\"" + WiFi.SSID(i) + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
    json += "\"encryption\":" + String(WiFi.encryptionType(i));
    json += "}";
  }
  json += "]}";
  
  server.send(200, "application/json", json);
}

void handleConnect() {
  String ssid = server.arg("ssid");
  String password = server.arg("password");
  
  if (ssid.length() == 0) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID required\"}");
    return;
  }
  
  // Add network to stored networks
  addNetwork(ssid.c_str(), password.c_str());
  
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Network saved, attempting connection...\"}");
  
  // Set flag to restart and try connection
  configMode = false;
  
  // Try connecting to the new network
  if (connectToWiFiNetwork(ssid.c_str(), password.c_str(), 15000)) {
    wifiConnected = true;
    apMode = false;
    Serial.println("Successfully connected to new network");
  } else {
    Serial.println("Failed to connect to new network, staying in AP mode");
  }
}

// Function to try connecting to a specific WiFi network
bool connectToWiFiNetwork(const char* networkSSID, const char* networkPassword, int timeoutMs = 10000) {
  Serial.printf("Trying to connect to: %s\n", networkSSID);
  
  // Display connection attempt on screen
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(1);
  tft.setCursor(10, 50);
  tft.printf("Connecting to:\n%s", networkSSID);
  
  WiFi.begin(networkSSID, networkPassword);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < timeoutMs) {
    delay(500);
    Serial.print(".");
    
    // Update display with dots
    tft.setCursor(10, 80);
    for (int i = 0; i < ((millis() - startTime) / 500) % 4; i++) {
      tft.print(".");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nConnected to %s\n", networkSSID);
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Display success
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_GREEN);
    tft.setCursor(10, 50);
    tft.printf("Connected to:\n%s\nIP: %s", networkSSID, WiFi.localIP().toString().c_str());
    delay(2000);
    
    return true;
  } else {
    Serial.printf("\nFailed to connect to %s\n", networkSSID);
    return false;
  }
}

// Function to auto-connect to available WiFi networks
bool autoConnectWiFi() {
  Serial.println("Starting WiFi auto-connection...");
  
  // Display scanning message
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_YELLOW);
  tft.setTextSize(2);
  tft.setCursor(10, 50);
  tft.print("Scanning WiFi...");
  
  // Scan for available networks
  int networkCount = WiFi.scanNetworks();
  Serial.printf("Found %d networks\n", networkCount);
  
  // Try each stored network in priority order
  for (int priority = 0; priority < storedNetworkCount; priority++) {
    for (int i = 0; i < storedNetworkCount; i++) {
      if (!storedNetworks[i].enabled || storedNetworks[i].priority != priority) continue;
      
      const char* networkSSID = storedNetworks[i].ssid;
      const char* networkPassword = storedNetworks[i].password;
      
      if (strlen(networkSSID) == 0) continue; // Skip empty entries
      
      // Check if this network is available
      bool networkAvailable = false;
      for (int j = 0; j < networkCount; j++) {
        if (WiFi.SSID(j) == String(networkSSID)) {
          networkAvailable = true;
          break;
        }
      }
      
      if (networkAvailable) {
        Serial.printf("Network %s is available, attempting connection...\n", networkSSID);
        
        if (connectToWiFiNetwork(networkSSID, networkPassword, WIFI_CONNECT_TIMEOUT)) {
          currentNetworkIndex = i;
          wifiConnected = true;
          apMode = false;
          
          // Configure DNS servers
          WiFi.config(WiFi.localIP(), WiFi.gatewayIP(), WiFi.subnetMask(), IPAddress(8, 8, 8, 8), IPAddress(1, 1, 1, 1));
          delay(1000);
          
          return true;
        }
      } else {
        Serial.printf("Network %s not available\n", networkSSID);
      }
    }
  }
  
  // If no networks worked, start AP mode
  Serial.println("Failed to connect to any WiFi network, starting AP mode");
  startAPMode();
  return false;
}

void startAPMode() {
  Serial.println("Starting WiFi Access Point mode...");
  
  // Stop any existing WiFi connection
  WiFi.disconnect();
  delay(1000);
  
  // Configure and start AP
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_GATEWAY, AP_SUBNET);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  
  // Start DNS server for captive portal
  dnsServer.start(53, "*", AP_IP);
  
  // Setup web server routes
  server.on("/", handleRoot);
  server.on("/scan", handleScan);
  server.on("/connect", HTTP_POST, handleConnect);
  
  server.begin();
  
  apMode = true;
  configMode = true;
  
  // Display AP mode info on screen
  displayAPModeInfo();
  
  Serial.printf("AP Mode started. SSID: %s, Password: %s\n", AP_SSID, AP_PASSWORD);
  Serial.printf("IP Address: %s\n", WiFi.softAPIP().toString().c_str());
}

void displayAPModeInfo() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_CYAN);
  tft.setTextSize(1);
  
  tft.setCursor(10, 20);
  tft.print("WiFi Setup Mode");
  
  tft.setTextColor(TFT_WHITE);
  tft.setCursor(10, 50);
  tft.printf("1. Connect to WiFi:\n   %s", AP_SSID);
  
  tft.setCursor(10, 80);
  tft.printf("2. Password: %s", AP_PASSWORD);
  
  tft.setCursor(10, 110);
  tft.print("3. Open web browser");
  
  tft.setCursor(10, 140);
  tft.printf("4. Go to: %s", AP_IP.toString().c_str());
  
  tft.setTextColor(TFT_YELLOW);
  tft.setCursor(10, 180);
  tft.print("Configure your WiFi");
  tft.setCursor(10, 200);
  tft.print("networks there!");
}

// Function to check and maintain WiFi connection
void checkWiFiConnection() {
  unsigned long currentTime = millis();
  
  // Handle AP mode web server
  if (apMode) {
    dnsServer.processNextRequest();
    server.handleClient();
    return;
  }
  
  // Check WiFi status periodically
  if (currentTime - lastWifiCheck > WIFI_CHECK_INTERVAL) {
    lastWifiCheck = currentTime;
    
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi connection lost, attempting to reconnect...");
      wifiConnected = false;
      
      // Try to reconnect to current network first
      if (currentNetworkIndex < storedNetworkCount) {
        const char* currentSSID = storedNetworks[currentNetworkIndex].ssid;
        const char* currentPassword = storedNetworks[currentNetworkIndex].password;
        
        if (connectToWiFiNetwork(currentSSID, currentPassword, 5000)) {
          wifiConnected = true;
          return;
        }
      }
      
      // If current network fails, try auto-connect again
      autoConnectWiFi();
    } else {
      wifiConnected = true;
    }
  }
}

// Supabase configuration - CORRECT URL AND KEY
const char* supabase_url = SUPABASE_URL;
const char* supabase_key = SUPABASE_ANON_KEY;

// Order structure for multiple drink orders
struct Order {
  String id;
  String customer_name;  // Updated field name to match new schema
  String department;     // New field for department
  String drink_type;
  int quantity;          // New field for quantity
  String status;         // "new", "alindi", "hazirlandi"
  String special_instructions; // New field for special instructions
  int priority;          // New field for priority (0=normal, 1=urgent)
  String created_at;
  float waiting_minutes; // Calculated waiting time
  String order_group_id;
};

const int MAX_ORDERS = 8;
Order orders[MAX_ORDERS];
int orderCount = 0;
unsigned long lastFetch = 0;
const unsigned long FETCH_INTERVAL = 15000; // Increased to 15 seconds
int consecutiveErrors = 0;
const int MAX_CONSECUTIVE_ERRORS = 5;

// Buzzer control variables
bool hasNewOrder = false;
bool buzzerActive = false;
unsigned long lastBuzzerTime = 0;
const unsigned long BUZZER_INTERVAL = 60000; // 1 minute = 60000ms
String lastOrderId = "";

const int MAX_GROUPS = MAX_ORDERS;

struct GroupOrder {
  String group_id;
  String customer_name;
  String department;
  String status;
  bool urgent;
  String created_at;
  float waiting_minutes;
  int total_quantity;
};

GroupOrder groupedOrders[MAX_GROUPS];
int groupedOrderCount = 0;

// Forward declarations
void fetchOrders();
void drawScreen();
void handleTouch(uint16_t x, uint16_t y);
void updateGroupOrderStatus(int groupIndex, const String& newStatus);
int findTouchedGroup(uint16_t x, uint16_t y);
void buildGroupedOrders();
void showGroupTapFeedback(const String& message, uint16_t backgroundColor, uint16_t textColor);
String utf8ToLatin1(String input);
void buzzerBeep(int count = 1, int duration = 200, int pause = 300);
void checkNewOrderBuzzer();
void handlePeriodicBuzzer();

// Handle Turkish characters conversion
String utf8ToLatin1(String input) {
  // Replace Turkish characters with ASCII equivalents for display
  input.replace("ç", "c");
  input.replace("ğ", "g"); 
  input.replace("ı", "i");
  input.replace("ö", "o");
  input.replace("ş", "s");
  input.replace("ü", "u");
  input.replace("Ç", "C");
  input.replace("Ğ", "G");
  input.replace("İ", "I");
  input.replace("Ö", "O");
  input.replace("Ş", "S");
  input.replace("Ü", "U");
  return input;
}

void setup() {
  Serial.begin(115200);
  Serial.println("=== MUTFAK SIPARIS SISTEMI ===");
  
  // Initialize buzzer pin
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  
  tft.init();
  tft.setRotation(1);  // Landscape mode 320x240
  
  // Run calibration
  tft.touch_calibrate();

  tft.fillScreen(TFT_BLACK);
  
  // Load stored WiFi networks
  loadStoredNetworks();
  
  // Connect to WiFi using auto-connection system
  if (!autoConnectWiFi()) {
    Serial.println("No WiFi networks available, started AP mode");
    // In AP mode, continue with limited functionality
    // Don't exit - let the user configure WiFi
  } else {
    // WiFi connected successfully, continue with normal setup
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("DNS: ");
    Serial.println(WiFi.dnsIP());
    
    // Test basic internet connectivity first
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_YELLOW);
    tft.setTextSize(1);
    tft.setCursor(10, 50);
    tft.print("Internet baglantisi test ediliyor...");
    
    // Test with a simple HTTP request to Google (HTTP, not HTTPS)
    HTTPClient testHttp;
    WiFiClient testClient;
    testHttp.begin(testClient, "http://httpbin.org/get");
    testHttp.setTimeout(5000);
    int testCode = testHttp.GET();
    testHttp.end();
    
    Serial.print("HTTP test sonucu: ");
    Serial.println(testCode);
    
    if (testCode > 0) {
      Serial.println("Internet baglantisi OK");
      tft.setCursor(10, 70);
      tft.setTextColor(TFT_GREEN);
      tft.print("Internet baglantisi OK");
    } else {
      Serial.println("Internet baglantisi PROBLEM");
      tft.setCursor(10, 70);
      tft.setTextColor(TFT_RED);
      tft.print("Internet baglantisi PROBLEM");
    }
    
    delay(2000);
    
    // Initial screen
    drawScreen();
    
    // Fetch initial orders
    fetchOrders();
  }
}
void fetchOrders() {
  if (!wifiConnected || WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi baglantisi yok!");
    return;
  }
  
  // Skip fetching if too many consecutive errors
  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    Serial.println("Cok fazla hata, 30 saniye bekleniyor...");
    if (millis() - lastFetch < 30000) {
      return;
    }
    consecutiveErrors = 0; // Reset error count after waiting
  }
  
  Serial.println("Siparisler getiriliyor...");
  
  HTTPClient http;
  // Fetch only "new" orders so acknowledged batches disappear from screen
  String url = String(supabase_url) + "/rest/v1/drink_orders?status=eq.new&order=priority.desc,created_at.asc";
  
  Serial.println("URL: " + url);
  
  // Use WiFiClientSecure for HTTPS connections
  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate verification for now
  http.begin(client, url);
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", "Bearer " + String(supabase_key));
  http.setTimeout(15000); // Increased timeout to 15 seconds
  
  int httpCode = http.GET();
  
  Serial.print("HTTP Yanit Kodu: ");
  Serial.println(httpCode);
  
  if (httpCode == 200) {
    consecutiveErrors = 0; // Reset error count on success
    String payload = http.getString();
    Serial.println("Veri alindi: " + payload.substring(0, min(200, (int)payload.length())) + "...");
    
    JsonDocument doc;
    
    if (deserializeJson(doc, payload) == DeserializationError::Ok) {
      orderCount = 0;
      JsonArray array = doc.as<JsonArray>();
      
      for (JsonObject obj : array) {
        if (orderCount >= MAX_ORDERS) break;
        
        // Parse new schema fields
        orders[orderCount].id = obj["id"].as<String>();
        orders[orderCount].customer_name = utf8ToLatin1(obj["customer_name"].as<String>());
        orders[orderCount].department = utf8ToLatin1(obj["department"].as<String>());
        orders[orderCount].drink_type = utf8ToLatin1(obj["drink_type"].as<String>());
        orders[orderCount].quantity = obj["quantity"].as<int>();
        orders[orderCount].status = obj["status"].as<String>();
        orders[orderCount].special_instructions = utf8ToLatin1(obj["special_instructions"].as<String>());
        orders[orderCount].priority = obj["priority"].as<int>();
        orders[orderCount].created_at = obj["created_at"].as<String>();
        if (obj.containsKey("order_group_id") && !obj["order_group_id"].isNull()) {
          orders[orderCount].order_group_id = obj["order_group_id"].as<String>();
        } else {
          orders[orderCount].order_group_id = orders[orderCount].id;
        }
        
        // Calculate waiting minutes if available
        if (obj.containsKey("waiting_minutes") && !obj["waiting_minutes"].isNull()) {
          orders[orderCount].waiting_minutes = obj["waiting_minutes"].as<float>();
        } else {
          orders[orderCount].waiting_minutes = 0;
        }
        
        orderCount++;
      }
      
      Serial.println("Siparisler guncellendi: " + String(orderCount) + " adet");
  buildGroupedOrders();
      drawScreen();
      
      // Check for new orders and trigger buzzer if needed
      checkNewOrderBuzzer();
    } else {
      Serial.println("JSON parse hatasi!");
      consecutiveErrors++;
    }
  } else if (httpCode == -1) {
    consecutiveErrors++;
    Serial.println("DNS cozumleme hatasi veya baglanti problemi! Hata sayisi: " + String(consecutiveErrors));
    
    // Display error on screen only if first few errors
    if (consecutiveErrors <= 3) {
      tft.fillScreen(TFT_BLACK);
      tft.setTextColor(TFT_RED);
      tft.setTextSize(2);
      tft.setCursor(10, 50);
      tft.print("BAGLANTI HATASI");
      tft.setTextColor(TFT_WHITE);
      tft.setTextSize(1);
      tft.setCursor(10, 80);
      tft.print("DNS cozumleme sorunu");
      tft.setCursor(10, 100);
      tft.print("Hata sayisi: " + String(consecutiveErrors));
      tft.setCursor(10, 120);
      tft.print("Otomatik yeniden deneniyor...");
    }
    
  } else {
    consecutiveErrors++;
    String errorResponse = http.getString();
    Serial.println("HTTP Hatasi: " + String(httpCode) + ", Hata sayisi: " + String(consecutiveErrors));
    Serial.println("Hata mesaji: " + errorResponse);
    
    // Display HTTP error only if first few errors
    if (consecutiveErrors <= 3) {
      tft.fillScreen(TFT_BLACK);
      tft.setTextColor(TFT_RED);
      tft.setTextSize(2);
      tft.setCursor(10, 50);
      tft.print("HTTP HATASI");
      tft.setTextColor(TFT_WHITE);
      tft.setTextSize(1);
      tft.setCursor(10, 80);
      tft.print("Hata kodu: " + String(httpCode));
      tft.setCursor(10, 100);
      tft.print("Hata sayisi: " + String(consecutiveErrors));
    }
  }
  
  http.end();
}

int statusRank(const String& status) {
  if (status == "new") return 0;
  if (status == "alindi") return 1;
  if (status == "hazirlandi") return 2;
  if (status == "teslim_edildi") return 3;
  if (status == "iptal") return 4;
  return 5;
}

void buildGroupedOrders() {
  groupedOrderCount = 0;

  for (int i = 0; i < orderCount; i++) {
    Order* order = &orders[i];

    // Strict check: Only process items that have a group ID.
    if (order->order_group_id.length() == 0) {
      continue;
    }
    String groupId = order->order_group_id;
    int safeQuantity = order->quantity > 0 ? order->quantity : 1;

    int groupIndex = -1;
    for (int g = 0; g < groupedOrderCount; g++) {
      if (groupedOrders[g].group_id == groupId) {
        groupIndex = g;
        break;
      }
    }

    if (groupIndex == -1) {
      if (groupedOrderCount >= MAX_GROUPS) {
        continue;
      }

      groupIndex = groupedOrderCount++;
      GroupOrder* group = &groupedOrders[groupIndex];
      group->group_id = groupId;
      group->customer_name = order->customer_name;
      group->department = order->department;
      group->status = order->status;
      group->urgent = order->priority > 0;
      group->created_at = order->created_at;
  group->waiting_minutes = order->waiting_minutes;
  group->total_quantity = safeQuantity;
    } else {
      GroupOrder* group = &groupedOrders[groupIndex];
      if (statusRank(order->status) < statusRank(group->status)) {
        group->status = order->status;
      }
      if (order->priority > 0) {
        group->urgent = true;
      }
      if (order->waiting_minutes > group->waiting_minutes) {
        group->waiting_minutes = order->waiting_minutes;
      }
  group->total_quantity += safeQuantity;
    }
  }

  Serial.println("Grouped orders built: " + String(groupedOrderCount));
}

void showGroupTapFeedback(const String& message, uint16_t backgroundColor, uint16_t textColor) {
  const int cardX = 10;
  const int cardY = 25;
  const int cardW = 300;
  const int cardH = 190;

  // Highlight border
  tft.drawRoundRect(cardX-2, cardY-2, cardW+4, cardH+4, 14, TFT_WHITE);
  tft.drawRoundRect(cardX-1, cardY-1, cardW+2, cardH+2, 13, TFT_WHITE);

  // Feedback ribbon near bottom of card
  const int ribbonMargin = 18;
  const int ribbonHeight = 32;
  int ribbonY = cardY + cardH - ribbonHeight - ribbonMargin;

  tft.fillRoundRect(cardX + ribbonMargin, ribbonY, cardW - (ribbonMargin * 2), ribbonHeight, 10, backgroundColor);
  tft.drawRoundRect(cardX + ribbonMargin, ribbonY, cardW - (ribbonMargin * 2), ribbonHeight, 10, TFT_WHITE);

  tft.setTextColor(textColor);
  tft.setTextSize(2);
  int approxWidth = message.length() * 12; // rough width estimate for 2x font
  int textX = cardX + (cardW / 2) - (approxWidth / 2);
  if (textX < cardX + ribbonMargin + 6) {
    textX = cardX + ribbonMargin + 6;
  }
  tft.setCursor(textX, ribbonY + 10);
  tft.print(message);
}

void drawScreen() {
  tft.fillScreen(TFT_BLACK);
  
  // Header - smaller and more compact
  tft.setTextColor(TFT_CYAN);
  tft.setTextSize(1);
  tft.setCursor(10, 5);
  tft.print("AVM MUTFAK");
  
  // Show WiFi status and order count
  tft.setCursor(200, 5);
  if (wifiConnected && WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(TFT_GREEN);
    tft.print("WiFi:OK");
  } else {
    tft.setTextColor(TFT_RED);
    tft.print("WiFi:ERR");
  }
  
  // Show order count in corner
  tft.setTextColor(TFT_WHITE);
  tft.setCursor(260, 5);
  tft.print("(" + String(orderCount) + ")");
  
  if (orderCount == 0) {
    // No orders - full screen message
    tft.setTextColor(TFT_YELLOW);
    tft.setTextSize(3);
    tft.setCursor(70, 80);
    tft.print("SIPARIS");
    tft.setCursor(100, 110);
    tft.print("YOK");
    
    tft.setTextColor(TFT_GREEN);
    tft.setTextSize(2);
    tft.setCursor(60, 160);
    tft.print("Yeni siparisler");
    tft.setCursor(80, 180);
    tft.print("bekleniyor...");
    return;
  }
  
  if (groupedOrderCount == 0) {
    tft.setTextColor(TFT_YELLOW);
    tft.setTextSize(2);
    tft.setCursor(40, 120);
    tft.print("Aktif siparis yok");
    return;
  }

  GroupOrder* group = &groupedOrders[0];

  const int cardX = 10;
  const int cardY = 25;
  const int cardW = 300;
  const int cardH = 190;

  uint16_t bgColor = TFT_LIGHTGREY;
  uint16_t textColor = TFT_BLACK;
  uint16_t accentColor = TFT_BLACK;

  if (group->urgent) {
    if (group->status == "new") {
      bgColor = TFT_PURPLE;
      textColor = TFT_WHITE;
      accentColor = TFT_YELLOW;
    } else if (group->status == "alindi") {
      bgColor = TFT_MAGENTA;
      textColor = TFT_WHITE;
      accentColor = TFT_YELLOW;
    }
  } else {
    if (group->status == "new") {
      bgColor = TFT_RED;
      textColor = TFT_WHITE;
      accentColor = TFT_WHITE;
    } else if (group->status == "alindi") {
      bgColor = TFT_ORANGE;
      textColor = TFT_BLACK;
      accentColor = TFT_BLACK;
    } else if (group->status == "hazirlandi") {
      bgColor = TFT_GREEN;
      textColor = TFT_BLACK;
      accentColor = TFT_WHITE;
    }
  }

  tft.fillRoundRect(cardX, cardY, cardW, cardH, 12, bgColor);
  tft.drawRoundRect(cardX, cardY, cardW, cardH, 12, accentColor);

  if (group->urgent) {
    tft.fillRoundRect(cardX + cardW - 64, cardY + 10, 54, 24, 6, TFT_YELLOW);
    tft.setTextColor(TFT_BLACK);
    tft.setTextSize(2);
    tft.setCursor(cardX + cardW - 58, cardY + 16);
    tft.print("ACIL");
  }

  // Customer name
  tft.setTextColor(textColor);
  tft.setTextSize(3);
  String customerName = group->customer_name;
  if (customerName.length() > 12) {
    customerName = customerName.substring(0, 10) + "..";
  }
  tft.setCursor(cardX + 16, cardY + 36);
  tft.print(customerName);

  // Department and waiting time
  tft.setTextSize(1);
  tft.setCursor(cardX + 16, cardY + 60);
  String deptLine = group->department;
  if (group->waiting_minutes > 0) {
    deptLine += "  |  " + String((int)round(group->waiting_minutes)) + " dk";
  }
  tft.print(deptLine);

  // Drinks summary
  const int maxItemsDisplay = 8;
  String drinkNames[maxItemsDisplay];
  int drinkCounts[maxItemsDisplay];
  int itemUniqueCount = 0;
  bool truncated = false;

  for (int i = 0; i < orderCount; i++) {
    if (orders[i].order_group_id != group->group_id) continue;

    String drinkName = orders[i].drink_type;
    int quantityValue = orders[i].quantity > 0 ? orders[i].quantity : 1;
    bool found = false;
    for (int j = 0; j < itemUniqueCount; j++) {
      if (drinkNames[j] == drinkName) {
        drinkCounts[j] += quantityValue;
        found = true;
        break;
      }
    }
    if (!found) {
      if (itemUniqueCount < maxItemsDisplay) {
        drinkNames[itemUniqueCount] = drinkName;
        drinkCounts[itemUniqueCount] = quantityValue;
        itemUniqueCount++;
      } else {
        truncated = true;
      }
    }
  }

  int lineY = cardY + 80;
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(2);
  for (int j = 0; j < itemUniqueCount; j++) {
    String line = drinkNames[j];
    if (line.length() > 18) {
      line = line.substring(0, 16) + "..";
    }
    line += "  x" + String(drinkCounts[j]);
    tft.setCursor(cardX + 16, lineY);
    tft.print(line);
    lineY += 22;
  }
  if (truncated) {
    tft.setTextSize(1);
    tft.setCursor(cardX + 16, lineY);
    tft.print("+ daha fazla icecek...");
    lineY += 16;
  }

  // Total quantity and instructions (if any)
  tft.setTextSize(1);
  int summaryY = cardY + cardH - 72;
  tft.setCursor(cardX + 16, summaryY);
  tft.print("Toplam: " + String(group->total_quantity) + " adet");
  summaryY += 14;

  bool instructionsPrinted = false;
  for (int i = 0; i < orderCount; i++) {
    if (orders[i].order_group_id == group->group_id && orders[i].special_instructions.length() > 0) {
      if (!instructionsPrinted) {
        tft.setCursor(cardX + 16, summaryY);
        tft.print("Notlar:");
        summaryY += 12;
        instructionsPrinted = true;
      }
      String note = orders[i].drink_type + ": " + orders[i].special_instructions;
      if (note.length() > 34) {
        note = note.substring(0, 32) + "..";
      }
      if (summaryY > cardY + cardH - 28) {
        tft.setCursor(cardX + 24, summaryY);
        tft.print("...");
        break;
      }
      tft.setCursor(cardX + 24, summaryY);
      tft.print(note);
      summaryY += 12;
    }
  }

  // Action button
  String buttonText = "";
  uint16_t buttonColor = TFT_GREEN;
  if (group->status == "new") {
    buttonText = "ALINDI";
    buttonColor = TFT_GREEN;
  } else if (group->status == "alindi") {
    buttonText = "HAZIR";
    buttonColor = TFT_BLUE;
  }

  if (buttonText.length() > 0) {
    const int btnW = 120;
    const int btnH = 36;
    const int btnX = cardX + cardW - btnW - 16;
    const int btnY = cardY + cardH - btnH - 20;

    tft.fillRoundRect(btnX, btnY, btnW, btnH, 8, buttonColor);
    tft.drawRoundRect(btnX, btnY, btnW, btnH, 8, TFT_WHITE);
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    int textW = buttonText.length() * 12;
    tft.setCursor(btnX + (btnW - textW) / 2, btnY + 10);
    tft.print(buttonText);
  }

  if (groupedOrderCount > 1) {
    tft.setTextColor(TFT_CYAN);
    tft.setTextSize(1);
    tft.setCursor(12, cardY + cardH + 6);
    tft.print("+ " + String(groupedOrderCount - 1) + " siparis daha bekliyor");
  }

  // Footer with refresh info
  tft.setTextColor(TFT_DARKGREY);
  tft.setTextSize(1);
  tft.setCursor(10, 225);
  tft.print("Son guncelleme: " + String((millis() - lastFetch) / 1000) + "s once");
}

int findTouchedGroup(uint16_t x, uint16_t y) {
  if (groupedOrderCount == 0) return -1;

  const int cardX = 10;
  const int cardY = 25;
  const int cardW = 300;
  const int cardH = 190;
  const int btnW = 120;
  const int btnH = 36;
  const int btnX = cardX + cardW - btnW - 16;
  const int btnY = cardY + cardH - btnH - 20;

  if (x < cardX || x > cardX + cardW || y < cardY || y > cardY + cardH) {
    return -1;
  }

  const GroupOrder* group = &groupedOrders[0];
  if (!(group->status == "new" || group->status == "alindi")) {
    return -1;
  }

  const int expandedBtnTop = cardY + cardH - 70;
  if (y >= expandedBtnTop) {
    return 0;
  }

  if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
    return 0;
  }

  return -1;
}

void updateGroupOrderStatus(int groupIndex, const String& newStatus) {
  if (groupIndex < 0 || groupIndex >= groupedOrderCount) return;

  GroupOrder* group = &groupedOrders[groupIndex];
  String currentStatus = group->status;

  Serial.println("=== UPDATING GROUP STATUS ===");
  Serial.println("Group ID: " + group->group_id);
  Serial.println("Current Status: " + currentStatus);
  Serial.println("New Status: " + newStatus);

  HTTPClient http;
  String url = String(supabase_url) + "/rest/v1/drink_orders?order_group_id=eq." + group->group_id;
  url += "&status=eq." + currentStatus;

  Serial.println("Update URL: " + url);

  WiFiClientSecure client;
  client.setInsecure();
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", "Bearer " + String(supabase_key));
  http.addHeader("Prefer", "return=minimal");
  http.setTimeout(10000);

  JsonDocument doc;
  doc["status"] = newStatus;

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("Request Body: " + jsonString);

  int httpCode = http.sendRequest("PATCH", jsonString);

  Serial.println("HTTP Response Code: " + String(httpCode));

  if (httpCode == 200 || httpCode == 204) {
    Serial.println("✅ Grup durumu guncellendi: " + group->group_id + " -> " + newStatus);

    for (int i = 0; i < orderCount; i++) {
      if (orders[i].order_group_id == group->group_id) {
        orders[i].status = newStatus;
      }
    }

    group->status = newStatus;
    orderCount = 0;
    groupedOrderCount = 0;

    if (buzzerActive) {
      Serial.println("Yeni siparis kalmadi, buzzer kapatiliyor");
    }
    buzzerActive = false;
    hasNewOrder = false;
    lastOrderId = "";

    tft.fillRect(0, 20, 320, 210, TFT_BLACK);
    tft.setTextColor(TFT_GREEN);
    tft.setTextSize(2);
    tft.setCursor(36, 110);
    tft.print("Siparis alindi");
    tft.setTextSize(1);
    tft.setCursor(64, 140);
    tft.print("Yeni siparisler aranıyor...");

    fetchOrders();
    lastFetch = millis();
  } else {
    Serial.println("❌ Grup durum guncelleme hatasi: " + String(httpCode));
    String response = http.getString();
    Serial.println("Response: " + response);

    tft.fillRect(0, 200, 320, 40, TFT_RED);
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(1);
    tft.setCursor(10, 210);
    tft.print("Grup guncelleme hatasi: " + String(httpCode));
    tft.setCursor(10, 220);
    tft.print("Tekrar deneniyor...");
    delay(2000);
    drawScreen();
  }

  http.end();
}

void handleTouch(uint16_t x, uint16_t y) {
  Serial.print("=== TOUCH EVENT ===");
  Serial.print("Dokunma algılandi: ");
  Serial.print(x);
  Serial.print(", ");
  Serial.println(y);
  
  int touchedGroup = findTouchedGroup(x, y);
  Serial.println("findTouchedGroup returned: " + String(touchedGroup));
  
  if (touchedGroup >= 0 && touchedGroup < groupedOrderCount) {
    GroupOrder* group = &groupedOrders[touchedGroup];
    String currentStatus = group->status;
    String nextStatus = "";

    if (currentStatus == "new") {
      nextStatus = "alindi";
    } else if (currentStatus == "alindi") {
      nextStatus = "hazirlandi";
    }

    if (nextStatus.length() > 0) {
      const uint16_t feedbackBg = (nextStatus == "alindi") ? TFT_WHITE : TFT_GREEN;
      const uint16_t feedbackText = (nextStatus == "alindi") ? TFT_BLACK : TFT_BLACK;
      const String feedbackMessage = (nextStatus == "alindi") ? "Hazirlaniyor" : "Hazir";

      showGroupTapFeedback(feedbackMessage, feedbackBg, feedbackText);
      
      // Change card color to blue immediately for feedback
      if (nextStatus == "alindi") {
        const int cardX = 10;
        const int cardY = 25;
        const int cardW = 300;
        const int cardH = 190;
        tft.fillRoundRect(cardX, cardY, cardW, cardH, 10, TFT_BLUE);
        drawScreen(); // Redraw contents over new blue background
        delay(1000); // Keep it blue for a second
      }

      updateGroupOrderStatus(touchedGroup, nextStatus);
    } else {
      Serial.println("No status change for this order");
    }
  } else {
    // Touch outside orders - refresh manually
    Serial.println("Touch outside button area - Manuel yenileme");
    fetchOrders();
  }
  Serial.println("=== END TOUCH EVENT ===");
}

// Buzzer control functions
void buzzerBeep(int count, int duration, int pause) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(duration);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < count - 1) { // Don't delay after last beep
      delay(pause);
    }
  }
}

void checkNewOrderBuzzer() {
  int newGroupIndex = -1;

  for (int i = 0; i < groupedOrderCount; i++) {
    if (groupedOrders[i].status == "new") {
      newGroupIndex = i;
      break;
    }
  }

  if (newGroupIndex >= 0) {
    GroupOrder* group = &groupedOrders[newGroupIndex];
    String currentGroupId = group->group_id;

    if (currentGroupId != lastOrderId || !buzzerActive) {
      Serial.println("Yeni grup siparisi algilandi: " + group->customer_name + " (" + String(group->total_quantity) + " adet)");
      buzzerBeep(3, 200, 300);
      lastBuzzerTime = millis();
    }

    lastOrderId = currentGroupId;
    hasNewOrder = true;
    buzzerActive = true;
  } else {
    if (buzzerActive) {
      Serial.println("Yeni grup siparisi kalmadi, buzzer durduruldu");
    }
    hasNewOrder = false;
    buzzerActive = false;
    lastOrderId = "";
  }
}

void handlePeriodicBuzzer() {
  if (!buzzerActive) {
    return;
  }

  bool anyNew = false;
  bool trackedStillNew = false;
  String firstNewGroupId = "";

  for (int i = 0; i < groupedOrderCount; i++) {
    if (groupedOrders[i].status == "new") {
      if (!anyNew) {
        firstNewGroupId = groupedOrders[i].group_id;
      }
      anyNew = true;
      if (groupedOrders[i].group_id == lastOrderId) {
        trackedStillNew = true;
      }
    }
  }

  if (!anyNew) {
    buzzerActive = false;
    hasNewOrder = false;
    lastOrderId = "";
    return;
  }

  hasNewOrder = true;

  if (!trackedStillNew) {
    lastOrderId = firstNewGroupId;
  }

  if (millis() - lastBuzzerTime >= BUZZER_INTERVAL) {
    Serial.println("Periyodik bip - yeni grup siparisleri hala bekliyor");
    buzzerBeep(1, 500, 0);
    lastBuzzerTime = millis();
  }
}

void loop() {
  uint16_t x, y;
  
  if (tft.getTouch(&x, &y)) {
    if (!apMode) {
      // Show touch coordinates on screen for debugging
      tft.fillRect(250, 210, 70, 25, TFT_BLACK); // Clear previous coordinates
      tft.setTextColor(TFT_YELLOW);
      tft.setTextSize(1);
      tft.setCursor(250, 210);
      tft.print("T:" + String(x) + "," + String(y));
      
      handleTouch(x, y);
    } else {
      // In AP mode, touching screen shows connection info again
      displayAPModeInfo();
    }
    delay(300); // Debounce touch
  }
  
  // Handle periodic buzzer for new orders (only if not in AP mode)
  if (!apMode) {
    handlePeriodicBuzzer();
  }
  
  // Check and maintain WiFi connection
  checkWiFiConnection();
  
  // Automatic refresh every FETCH_INTERVAL (only if WiFi is connected)
  if (wifiConnected && !apMode && millis() - lastFetch > FETCH_INTERVAL) {
    fetchOrders();
    lastFetch = millis();
  }
  
  delay(50);
}