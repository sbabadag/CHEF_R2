#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>

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
      cfg.x_min = 0;
      cfg.x_max = 306;
      cfg.y_min = 48;
      cfg.y_max = 191;
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
};

LGFX_CYD tft;

// WiFi credentials
const char* ssid = "AVM GRUP2";
const char* password = "AVMGRUP2023";

// Supabase configuration - CORRECT URL AND KEY
const char* supabase_url = "https://cfapmolnnvemqjneaher.supabase.co";
const char* supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTQ3MDcsImV4cCI6MjA3NDI5MDcwN30._TJlyjzcf4oyfa6JHEXZUkeZCThMFR-aX8pfzE3fm5c";

// Order structure for kitchen management
struct Order {
  String id;
  String orderer_name;
  String drink_type;
  String status;  // "new", "alindi", "hazirlandi"
  String created_at;
  int position_y;
};

const int MAX_ORDERS = 8;
Order orders[MAX_ORDERS];
int orderCount = 0;
unsigned long lastFetch = 0;
const unsigned long FETCH_INTERVAL = 15000; // Increased to 15 seconds
int consecutiveErrors = 0;
const int MAX_CONSECUTIVE_ERRORS = 5;

// Forward declarations
void fetchOrders();
void drawScreen();
void handleTouch(uint16_t x, uint16_t y);
void updateOrderStatus(int orderIndex, const String& newStatus);
int findTouchedOrder(uint16_t x, uint16_t y);
String utf8ToLatin1(String input);

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
  
  tft.init();
  tft.setRotation(1);  // Landscape mode 320x240
  tft.fillScreen(TFT_BLACK);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(2);
  tft.setCursor(10, 50);
  tft.print("WiFi Baglaniyor...");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  // Configure DNS servers - Try multiple approaches
  WiFi.config(WiFi.localIP(), WiFi.gatewayIP(), WiFi.subnetMask(), IPAddress(8, 8, 8, 8), IPAddress(1, 1, 1, 1));
  delay(1000);
  
  Serial.println("\nWiFi Baglandi!");
  Serial.print("IP Adresi: ");
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
void fetchOrders() {
  if (WiFi.status() != WL_CONNECTED) {
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
  // Query for orders that are not "hazirlandi" (completed)
  String url = String(supabase_url) + "/rest/v1/drink_orders?status=neq.hazirlandi&order=created_at.asc";
  
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
        
        orders[orderCount].id = obj["id"].as<String>();
        orders[orderCount].orderer_name = utf8ToLatin1(obj["orderer_name"].as<String>());
        orders[orderCount].drink_type = utf8ToLatin1(obj["drink_type"].as<String>());
        orders[orderCount].status = obj["status"].as<String>();
        orders[orderCount].created_at = obj["created_at"].as<String>();
        
        orderCount++;
      }
      
      Serial.println("Siparisler guncellendi: " + String(orderCount) + " adet");
      drawScreen();
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

void drawScreen() {
  tft.fillScreen(TFT_BLACK);
  
  // Header
  tft.setTextColor(TFT_CYAN);
  tft.setTextSize(3);
  tft.setCursor(50, 5);
  tft.print("MUTFAK SISTEMI");
  
  // Order count
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(1);
  tft.setCursor(10, 30);
  tft.print("Aktif Siparisler: ");
  tft.print(orderCount);
  
  if (orderCount == 0) {
    tft.setTextColor(TFT_YELLOW);
    tft.setTextSize(2);
    tft.setCursor(80, 120);
    tft.print("SIPARIS YOK");
    return;
  }
  
  // Draw orders
  int y = 45;
  const int orderHeight = 22;
  
  for (int i = 0; i < orderCount; i++) {
    orders[i].position_y = y;
    
    // Status color
    uint16_t bgColor, textColor;
    if (orders[i].status == "new") {
      bgColor = TFT_RED;
      textColor = TFT_WHITE;
    } else if (orders[i].status == "alindi") {
      bgColor = TFT_ORANGE;
      textColor = TFT_BLACK;
    } else {
      bgColor = TFT_LIGHTGREY;
      textColor = TFT_BLACK;
    }
    
    // Order card
    tft.fillRoundRect(5, y, 310, orderHeight, 3, bgColor);
    tft.drawRoundRect(5, y, 310, orderHeight, 3, TFT_WHITE);
    
    // Order info
    tft.setTextColor(textColor);
    tft.setTextSize(1);
    tft.setCursor(10, y + 3);
    tft.print(orders[i].orderer_name);
    tft.setCursor(10, y + 12);
    tft.print(orders[i].drink_type);
    
    // Status button
    String buttonText = "";
    if (orders[i].status == "new") {
      buttonText = "ALINDI";
    } else if (orders[i].status == "alindi") {
      buttonText = "HAZIRLANDI";
    }
    
    if (buttonText != "") {
      tft.fillRoundRect(220, y + 2, 90, 18, 2, TFT_GREEN);
      tft.drawRoundRect(220, y + 2, 90, 18, 2, TFT_WHITE);
      tft.setTextColor(TFT_WHITE);
      tft.setCursor(235, y + 7);
      tft.print(buttonText);
    }
    
    y += orderHeight + 3;
  }
}

int findTouchedOrder(uint16_t x, uint16_t y) {
  for (int i = 0; i < orderCount; i++) {
    int orderY = orders[i].position_y;
    
    // Check if touch is on the button area
    if (x >= 220 && x <= 310 && y >= orderY + 2 && y <= orderY + 20) {
      return i;
    }
  }
  return -1;
}

void updateOrderStatus(int orderIndex, const String& newStatus) {
  if (orderIndex < 0 || orderIndex >= orderCount) return;
  
  HTTPClient http;
  String url = String(supabase_url) + "/rest/v1/drink_orders?id=eq." + orders[orderIndex].id;
  
  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate verification
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", "Bearer " + String(supabase_key));
  http.setTimeout(10000);
  
  JsonDocument doc;
  doc["status"] = newStatus;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpCode = http.sendRequest("PATCH", jsonString);
  
  if (httpCode == 200 || httpCode == 204) {
    Serial.println("Siparis durumu guncellendi: " + orders[orderIndex].id + " -> " + newStatus);
    
    // If status is "hazirlandi", delete the order
    if (newStatus == "hazirlandi") {
      // Delete from database
      HTTPClient deleteHttp;
      WiFiClientSecure deleteClient;
      deleteClient.setInsecure();
      deleteHttp.begin(deleteClient, url);
      deleteHttp.addHeader("apikey", supabase_key);
      deleteHttp.addHeader("Authorization", "Bearer " + String(supabase_key));
      deleteHttp.setTimeout(10000);
      
      int deleteCode = deleteHttp.sendRequest("DELETE");
      if (deleteCode == 200 || deleteCode == 204) {
        Serial.println("Siparis silindi: " + orders[orderIndex].id);
      } else {
        Serial.println("Silme hatasi: " + String(deleteCode));
      }
      deleteHttp.end();
    }
    
    // Update local status
    orders[orderIndex].status = newStatus;
    
    // Refresh orders after a short delay
    delay(500);
    fetchOrders();
    
  } else {
    Serial.println("Durum guncelleme hatasi: " + String(httpCode));
    
    // Show error on screen briefly
    tft.fillRect(0, 220, 320, 20, TFT_RED);
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(1);
    tft.setCursor(10, 225);
    tft.print("Guncelleme hatasi: " + String(httpCode));
    delay(2000);
    drawScreen();
  }
  
  http.end();
}

void handleTouch(uint16_t x, uint16_t y) {
  Serial.print("Dokunma: ");
  Serial.print(x);
  Serial.print(", ");
  Serial.println(y);
  
  int touchedOrder = findTouchedOrder(x, y);
  
  if (touchedOrder >= 0) {
    String currentStatus = orders[touchedOrder].status;
    String nextStatus = "";
    
    if (currentStatus == "new") {
      nextStatus = "alindi";
    } else if (currentStatus == "alindi") {
      nextStatus = "hazirlandi";
    }
    
    if (nextStatus != "") {
      Serial.println("Durum degistiriliyor: " + orders[touchedOrder].orderer_name + " -> " + nextStatus);
      updateOrderStatus(touchedOrder, nextStatus);
    }
  }
}

void loop() {
  uint16_t x, y;
  
  if (tft.getTouch(&x, &y)) {
    handleTouch(x, y);
    delay(300); // Debounce
  }
  
  // Fetch orders periodically
  if (millis() - lastFetch > FETCH_INTERVAL) {
    fetchOrders();
    lastFetch = millis();
  }
  
  delay(50);
}